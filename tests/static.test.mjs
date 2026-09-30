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
