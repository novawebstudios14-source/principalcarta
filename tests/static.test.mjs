import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('..',import.meta.url);
const html=await readFile(new URL('index.html',root),'utf8');
const css=await readFile(new URL('styles.css',root),'utf8');

test('ids da interface são únicos',()=>{
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length);
});

test('todos os labels com for apontam para campos existentes',()=>{
  const ids=new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]));
  const targets=[...html.matchAll(/<label[^>]+for="([^"]+)"/g)].map(match=>match[1]);
  assert.ok(targets.length>0);
  for(const target of targets)assert.ok(ids.has(target),`Campo ausente para label: ${target}`);
});

test('mantém os links jurídicos solicitados',()=>{
  assert.match(html,/https:\/\/aprincipalbb\.com\.br\/termos-de-uso\.php/);
  assert.match(html,/https:\/\/aprincipalbb\.com\.br\/politica-de-privacidade\.php/);
  assert.match(html,/mailto:aprincipal\.documentos@gmail\.com/);
});

test('inclui adaptação mobile e redução de movimento',()=>{
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/@media print/);
});

test('gera imagem JPG no formato vertical de Stories',async()=>{
  const script=await readFile(new URL('app.js',root),'utf8');
  assert.match(html,/id="download-story"/);
  assert.match(html,/width="1080" height="1920"/);
  assert.match(script,/canvas\.width=1080;canvas\.height=1920/);
  assert.match(script,/image\/jpeg/);
});

test('não usa traços decorativos nem travessões no conteúdo',async()=>{
  const script=await readFile(new URL('app.js',root),'utf8');
  const api=await readFile(new URL('api/generate-letter.mjs',root),'utf8');
  assert.doesNotMatch(html,/class="eyebrow"><span/);
  assert.doesNotMatch(html,/[—–]/);
  assert.doesNotMatch(script,/moveTo\(170,1580\)/);
  assert.match(api,/replace\(\/\[—–\]\/g/);
});

test('oferece CTA inicial e compartilhamento para Stories',async()=>{
  const script=await readFile(new URL('app.js',root),'utf8');
  assert.match(html,/class="hero-cta" href="#quiz"/);
  assert.match(html,/id="quiz"/);
  assert.match(html,/Compartilhar imagem/);
  assert.match(script,/navigator\.share/);
});

test('mantém os botões principais visíveis no mobile',async()=>{
  const script=await readFile(new URL('app.js',root),'utf8');
  assert.match(html,/viewport-fit=cover/);
  assert.match(css,/form-step\.is-active>\.primary-button\{position:fixed/);
  assert.match(css,/result-actions\.is-visible\{position:sticky/);
  assert.match(script,/IntersectionObserver/);
});
