import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3000);
const groqKey=process.env.GROQ_API_KEY||'';
const groqModel=process.env.GROQ_LETTER_MODEL||'llama-3.3-70b-versatile';
const attempts=new Map();
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
const publicFiles=new Set(['index.html','styles.css','app.js','assets/logo.png']);

function send(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...securityHeaders()});res.end(JSON.stringify(data));}
function securityHeaders(){return {'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin','permissions-policy':'camera=(), microphone=(), geolocation=()'};}
function limited(ip){const now=Date.now(),entry=attempts.get(ip);if(!entry||entry.until<now){attempts.set(ip,{count:1,until:now+60_000});return false;}entry.count++;return entry.count>6;}
function text(value,max=100){return String(value??'').trim().normalize('NFC').replace(/[<>]/g,'').slice(0,max);}
function body(req,limit=8192){return new Promise((resolve,reject)=>{const parts=[];let size=0;req.on('data',chunk=>{size+=chunk.length;if(size>limit){reject(new Error('PAYLOAD_TOO_LARGE'));req.destroy();return;}parts.push(chunk);});req.on('end',()=>resolve(Buffer.concat(parts).toString('utf8')));req.on('error',reject);});}

function validate(raw){
  const data={
    parentName:text(raw.parentName,70),phone:text(raw.phone,15).replace(/\D/g,''),isPregnant:raw.isPregnant===true,
    recipientName:text(raw.recipientName,70),weeks:raw.weeks==null?null:Number(raw.weeks),hasChildren:raw.hasChildren===true,
    childAge:raw.childAge==null?null:Number(raw.childAge),privacyConsent:raw.privacyConsent===true,marketingConsent:raw.marketingConsent===true
  };
  if(data.parentName.length<2||data.recipientName.length<2)throw new Error('Confira os nomes informados.');
  if(!/^\d{10,11}$/.test(data.phone))throw new Error('Informe um WhatsApp com DDD.');
  if(!data.privacyConsent||!data.marketingConsent)throw new Error('Confirme as autorizações para continuar.');
  if(data.isPregnant&&(!Number.isInteger(data.weeks)||data.weeks<1||data.weeks>42))throw new Error('Informe uma quantidade válida de semanas.');
  if(!data.isPregnant&&(!Number.isInteger(data.childAge)||data.childAge<0||data.childAge>17))throw new Error('Informe uma idade válida.');
  return data;
}

function fallbackLetter(data){
  if(data.isPregnant){
    const family=data.hasChildren?'Você já é parte de uma família que cresceu em amor, e logo conhecerá quem já espera por você.':'Tudo em mim aprende uma nova forma de amar enquanto espero por você.';
    return `Ainda não vi todos os seus detalhes, mas já reconheço a presença que você trouxe para os meus dias. Há ${data.weeks} semanas, meu coração começou a contar o tempo de um jeito diferente: não em horas, mas em sonhos, planos e pequenos instantes de espera.\n\n${family} Quero que um dia você saiba que, muito antes do nosso primeiro encontro, já havia um lugar inteiro preparado para você dentro de mim.\n\nQue esta carta guarde um pedacinho do começo da nossa história — o tempo em que eu ainda esperava para tocar suas mãos, mas já amava tudo o que você seria.`;
  }
  const age=data.childAge===0?'ainda tão pequeno':`aos ${data.childAge} ${data.childAge===1?'ano':'anos'}`;
  return `Desde que você chegou, os dias ganharam detalhes que antes eu não sabia enxergar. Seu jeito, suas descobertas e até as pequenas bagunças transformaram a nossa casa e também transformaram quem eu sou.\n\nHoje, ${age}, você me ensina que o amor mora nas coisas simples: em um abraço demorado, numa risada inesperada e na vontade de guardar cada fase para sempre.\n\nQuando você reler esta carta, quero que se lembre de uma verdade que nunca vai mudar: não importa quanto o tempo passe, você sempre terá em mim um lugar seguro, um colo e um amor inteiro.`;
}

async function generateWithGroq(data){
  if(!groqKey)return {letter:fallbackLetter(data),source:'automatic'};
  const facts={nome_de_quem_escreve:data.parentName,nome_da_crianca:data.recipientName,gestante:data.isPregnant};
  if(data.isPregnant){facts.semanas_de_gestacao=data.weeks;facts.tem_outros_filhos=data.hasChildren;}else facts.idade_da_crianca=data.childAge;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20_000);
  try{
    const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${groqKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:groqModel,temperature:.75,max_completion_tokens:620,messages:[
      {role:'system',content:'Você escreve cartas afetivas em português brasileiro, de uma mãe ou responsável para uma criança. Use somente os fatos presentes no JSON. Escreva exatamente 3 parágrafos curtos, íntimos, delicados e naturais, entre 500 e 850 caracteres no total. A carta será exibida com o nome da criança e assinatura fora do texto: não escreva saudação, título ou assinatura. Não pressuponha gênero, aparência, saúde, data do parto, relacionamento familiar, religião ou qualquer fato ausente. Não dê orientação médica. Não use clichês comerciais, emojis, markdown ou hashtags. Se a pessoa está gestante, reconheça com delicadeza a espera e a quantidade de semanas. Se não está gestante, celebre a fase atual conforme a idade. Retorne apenas a carta.'},
      {role:'user',content:`FATOS AUTORIZADOS:\n${JSON.stringify(facts)}`}
    ]})});
    if(!response.ok)throw new Error(`Groq HTTP ${response.status}`);
    const payload=await response.json();
    const letter=text(payload.choices?.[0]?.message?.content,1200).replace(/\s*\n\s*/g,'\n\n').replace(/\n{3,}/g,'\n\n');
    if(letter.length<250)throw new Error('Resposta incompleta');
    return {letter,source:'ai'};
  }catch(error){console.error('IA indisponível, usando carta automática:',error.message);return {letter:fallbackLetter(data),source:'automatic'};}finally{clearTimeout(timer);}
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/generate-letter'&&req.method==='POST'){
      if(limited(req.socket.remoteAddress||'unknown'))return send(res,429,{error:'Muitas tentativas. Aguarde um minuto e tente novamente.'});
      const raw=JSON.parse(await body(req));
      const data=validate(raw);
      return send(res,200,await generateWithGroq(data));
    }
    if(url.pathname.startsWith('/api/'))return send(res,404,{error:'Não encontrado'});
    const requested=url.pathname==='/'?'index.html':url.pathname.slice(1);
    const safe=path.normalize(requested).replace(/^(\.\.(\/|\\|$))+/,'');
    if(!publicFiles.has(safe.replaceAll('\\','/')))throw new Error('INVALID_PATH');
    const filename=path.join(root,safe);
    if(!filename.startsWith(root))throw new Error('INVALID_PATH');
    const file=await readFile(filename);
    const extension=path.extname(filename);
    const headers={...securityHeaders(),'content-type':mime[extension]||'application/octet-stream','cache-control':extension==='.png'?'public, max-age=86400':'no-store'};
    if(extension==='.html')headers['content-security-policy']="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
    res.writeHead(200,headers);res.end(file);
  }catch(error){
    if(error.code==='ENOENT'||error.message==='INVALID_PATH'){res.writeHead(404,securityHeaders());return res.end('Não encontrado');}
    if(error instanceof SyntaxError)return send(res,400,{error:'Dados inválidos.'});
    if(error.message==='PAYLOAD_TOO_LARGE')return send(res,413,{error:'Dados muito grandes.'});
    return send(res,400,{error:error.message||'Não foi possível concluir.'});
  }
});

server.listen(port,()=>console.log(`Carta A Principal: http://localhost:${port}`));
