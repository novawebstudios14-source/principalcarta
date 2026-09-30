import test,{after,before} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

const port=3217;
let child;

before(async()=>{
  child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),GROQ_API_KEY:''},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Servidor não iniciou')),5000);
    child.stdout.on('data',chunk=>{if(String(chunk).includes('Carta A Principal')){clearTimeout(timer);resolve();}});
    child.once('error',reject);
  });
});

after(()=>child?.kill());

test('serve a experiência principal',async()=>{
  const response=await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/Uma carta para o seu bebê/);
  assert.match(html,/política de privacidade/);
});

test('não expõe arquivos internos do servidor',async()=>{
  const response=await fetch(`http://127.0.0.1:${port}/server.mjs`);
  assert.equal(response.status,404);
});

test('gera carta automática para gestante',async()=>{
  const response=await fetch(`http://127.0.0.1:${port}/api/generate-letter`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    parentName:'Marina',phone:'94999999999',isPregnant:true,recipientName:'Helena',weeks:24,hasChildren:false,privacyConsent:true,marketingConsent:true
  })});
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.source,'automatic');
  assert.match(data.letter,/24 semanas/);
  assert.ok(data.letter.length>300);
});

test('gera carta automática para criança',async()=>{
  const response=await fetch(`http://127.0.0.1:${port}/api/generate-letter`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    parentName:'Ana',phone:'94988888888',isPregnant:false,recipientName:'Miguel',childAge:3,privacyConsent:true,marketingConsent:true
  })});
  assert.equal(response.status,200);
  const data=await response.json();
  assert.match(data.letter,/aos 3 anos/);
});

test('recusa telefone inválido e consentimento ausente',async()=>{
  const response=await fetch(`http://127.0.0.1:${port}/api/generate-letter`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    parentName:'Ana',phone:'123',isPregnant:false,recipientName:'Miguel',childAge:3,privacyConsent:false,marketingConsent:false
  })});
  assert.equal(response.status,400);
});
