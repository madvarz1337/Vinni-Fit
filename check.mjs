import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const h=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
new vm.Script(js,{filename:'app.js'});
assert.match(h,/<html lang="ru">/);
const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'Duplicate HTML IDs');
for(const match of h.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(match[1]),'Missing fragment '+match[1]);
for(const match of h.matchAll(/(?:src|href)="([^"#][^"]*)"/g)){
 if(match[1].startsWith('data:'))continue;
 assert.ok(existsSync(new URL(match[1],import.meta.url)),'Missing asset '+match[1]);
}
assert.doesNotMatch(js,/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|getUserMedia|geolocation|eval|localStorage|sessionStorage)\b|document\.cookie/);
assert.doesNotMatch(h,/<(?:script|link)[^>]+(?:src|href)="https?:/);
assert.ok(css.includes('prefers-reduced-motion'));
assert.ok(js.includes('bounds')||js.includes('r.bottom<=0||r.top>=innerHeight'));
console.log('PASS: script syntax, unique IDs, working anchors, local assets, no network/sensor APIs, reduced motion, visible-eye tracking.');
