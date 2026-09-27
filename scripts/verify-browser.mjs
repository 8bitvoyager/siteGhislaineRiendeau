// Vérification manuelle assistée : lancer Chrome avec --remote-debugging-port=9223.
import { writeFile, mkdir } from 'node:fs/promises';
const base = 'http://127.0.0.1:8787';
const targets = await (await fetch('http://127.0.0.1:9223/json')).json();
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0;
const pending = new Map();
const errors = [];
ws.onmessage = event => {
  const m = JSON.parse(event.data);
  if (pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown' || (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') || (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')) errors.push(m);
};
const call = (method, params = {}) => new Promise(r => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => (await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
await call('Runtime.enable'); await call('Log.enable'); await call('Page.enable');
await call('Page.navigate', { url: base });
await new Promise(r => setTimeout(r, 500));
await evaluate('Promise.all([...document.images].map(i => { i.loading="eager"; return i.decode(); }))');
await evaluate('document.fonts.ready');
const fontChecks = await evaluate(`({serif:document.fonts.check('400 20px "Cormorant Garamond"'), italic:document.fonts.check('italic 400 20px "Cormorant Garamond"'), nav:document.fonts.check('400 14px Jost'), handwriting:document.fonts.check('400 24px "La Belle Aurore"')})`);
const report = [];
await mkdir('reference', { recursive: true });
for (const width of [1920, 1440, 1280, 820, 390, 320]) {
  await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 700 });
  await new Promise(r => setTimeout(r, 150));
  report.push(await evaluate(`({width:innerWidth,content:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),wrongLinks:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h.startsWith('/')&&h!=='/'),remoteImages:[...document.images].filter(i=>!i.src.startsWith(location.origin)).map(i=>i.src)})`));
  if ([1440, 1280, 820, 390].includes(width)) {
    const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(`reference/typographie-${width}.png`, Buffer.from(screenshot.data, 'base64'));
  }
}
const menu = await evaluate(`document.querySelector('.menu-toggle').click(); document.querySelector('.menu-toggle').getAttribute('aria-expanded')`);
await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
const motion = await evaluate(`getComputedStyle(document.querySelector('.button')).transitionDuration`);
const assetResponses = [];
for (const url of await evaluate(`[...new Set([...document.images].map(i=>i.src).concat([...document.querySelectorAll('link[rel=stylesheet],script[src]')].map(i=>i.href||i.src)))]`)) {
  const response = await fetch(url); assetResponses.push({ url, status: response.status });
}
const root = await fetch(base);
const result = { fontChecks, viewports: report, consoleErrors: errors, assetResponses, menuOpened: menu === 'true', reducedMotion: motion, robotsHeader: root.headers.get('x-robots-tag') };
await writeFile('reference/verification-typographie.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await call('Browser.close'); ws.close();
if (errors.length || report.some(r=>r.content>r.width||r.broken.length||r.wrongLinks.length||r.remoteImages.length) || assetResponses.some(r=>r.status!==200) || menu!=='true') process.exitCode=1;


