const form=document.querySelector('#letter-form');
const steps=[...document.querySelectorAll('.form-step')];
const progress=document.querySelector('#progress-bar');
const stepLabel=document.querySelector('#step-label');
const pregnantFields=document.querySelector('#pregnant-fields');
const parentFields=document.querySelector('#parent-fields');
const submitStatus=document.querySelector('#submit-status');
const result=document.querySelector('#letter-result');
let currentStep=1;
let storyBlob=null;
let storyUrl='';
let storyFilename='carta-a-principal-story.jpg';

const $=selector=>document.querySelector(selector);
const value=name=>form.elements[name]?.value?.trim()||'';
const checked=name=>form.elements[name]?.checked===true;

function showStep(number){
  currentStep=number;
  steps.forEach(step=>{const active=Number(step.dataset.step)===number;step.hidden=!active;step.classList.toggle('is-active',active);});
  stepLabel.textContent=`Passo ${number} de 3`;
  progress.style.width=`${number/3*100}%`;
  document.querySelector('.experience-shell').scrollIntoView({behavior:'smooth',block:'start'});
}

function setError(name,message=''){
  const node=document.querySelector(`[data-error-for="${name}"]`);
  if(!node)return;
  node.textContent=message;
  node.closest('.field-group,.form-step')?.classList.toggle('has-error',Boolean(message));
}

function validateStep(number){
  let valid=true;
  if(number===1){
    const name=value('parentName');
    const digits=value('phone').replace(/\D/g,'');
    const pregnancy=value('isPregnant');
    setError('parentName',name.length<2?'Informe seu nome.':'');
    setError('phone',digits.length<10||digits.length>11?'Informe um WhatsApp com DDD.':'');
    setError('isPregnant',!pregnancy?'Escolha uma das opções.':'');
    valid=name.length>=2&&digits.length>=10&&digits.length<=11&&Boolean(pregnancy);
  }
  if(number===2){
    if(value('isPregnant')==='yes'){
      const baby=value('babyNamePregnant'),weeks=Number(value('weeks')),children=value('hasChildren');
      setError('babyNamePregnant',baby.length<2?'Informe o nome do bebê.':'');
      setError('weeks',!Number.isInteger(weeks)||weeks<1||weeks>42?'Informe de 1 a 42 semanas.':'');
      setError('hasChildren',!children?'Escolha uma opção.':'');
      valid=baby.length>=2&&Number.isInteger(weeks)&&weeks>=1&&weeks<=42&&Boolean(children);
    }else{
      const child=value('childName'),age=value('childAge'),ageNumber=Number(age);
      setError('childName',child.length<2?'Informe o nome da criança.':'');
      setError('childAge',age===''||!Number.isInteger(ageNumber)||ageNumber<0||ageNumber>17?'Informe uma idade de 0 a 17.':'');
      valid=child.length>=2&&age!==''&&Number.isInteger(ageNumber)&&ageNumber>=0&&ageNumber<=17;
    }
  }
  if(number===3){
    setError('privacyConsent',!checked('privacyConsent')?'Confirme o termo de uso e a política de privacidade.':'');
    setError('marketingConsent',!checked('marketingConsent')?'Confirme a autorização de comunicações.':'');
    valid=checked('privacyConsent')&&checked('marketingConsent');
  }
  return valid;
}

function syncConditionalFields(){
  const pregnant=value('isPregnant')==='yes';
  pregnantFields.hidden=!pregnant;
  parentFields.hidden=pregnant;
  $('#conditional-description').textContent=pregnant?'Cada semana já carrega uma história inteira.':'Porque o amor também cresce depois que eles chegam.';
}

form.addEventListener('change',event=>{
  if(event.target.name==='isPregnant')syncConditionalFields();
  setError(event.target.name,'');
});

$('#phone').addEventListener('input',event=>{
  const digits=event.target.value.replace(/\D/g,'').slice(0,11);
  if(digits.length<=2)event.target.value=digits;
  else if(digits.length<=6)event.target.value=`(${digits.slice(0,2)}) ${digits.slice(2)}`;
  else if(digits.length<=10)event.target.value=`(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  else event.target.value=`(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
});

document.addEventListener('click',event=>{
  const next=event.target.closest('[data-next]');
  const back=event.target.closest('[data-back]');
  if(next&&validateStep(currentStep)){if(currentStep===1)syncConditionalFields();showStep(currentStep+1);}
  if(back)showStep(currentStep-1);
});

function payload(){
  const pregnant=value('isPregnant')==='yes';
  return {
    parentName:value('parentName'),
    phone:value('phone').replace(/\D/g,''),
    isPregnant:pregnant,
    recipientName:pregnant?value('babyNamePregnant'):value('childName'),
    weeks:pregnant?Number(value('weeks')):null,
    hasChildren:pregnant?value('hasChildren')==='yes':null,
    childAge:pregnant?null:Number(value('childAge')),
    privacyConsent:checked('privacyConsent'),
    marketingConsent:checked('marketingConsent')
  };
}

function roundedRect(context,x,y,width,height,radius){
  context.beginPath();
  context.roundRect(x,y,width,height,radius);
}

function wrapText(context,text,maxWidth){
  const words=text.split(/\s+/),lines=[];
  let line='';
  for(const word of words){
    const candidate=line?`${line} ${word}`:word;
    if(context.measureText(candidate).width>maxWidth&&line){lines.push(line);line=word;}else line=candidate;
  }
  if(line)lines.push(line);
  return lines;
}

function storyParagraphs(context,text,maxWidth,maxHeight){
  const paragraphs=text.split(/\n\s*\n/);
  for(let size=42;size>=30;size-=2){
    context.font=`500 ${size}px Caveat, cursive`;
    const lineHeight=Math.round(size*1.28);
    const blocks=paragraphs.map(paragraph=>wrapText(context,paragraph,maxWidth));
    const totalLines=blocks.reduce((sum,lines)=>sum+lines.length,0);
    const height=totalLines*lineHeight+(blocks.length-1)*Math.round(lineHeight*.55);
    if(height<=maxHeight)return {blocks,lineHeight,size,height};
  }
  context.font='500 30px Caveat, cursive';
  const lineHeight=38;
  const blocks=paragraphs.map(paragraph=>wrapText(context,paragraph,maxWidth));
  return {blocks,lineHeight,size:30,height:blocks.reduce((sum,lines)=>sum+lines.length,0)*lineHeight+(blocks.length-1)*20};
}

function loadImage(source){
  return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=source;});
}

function safeFilename(name){return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'bebe';}

async function createStoryJpg(data,input){
  await document.fonts.ready;
  const canvas=document.createElement('canvas');
  canvas.width=1080;canvas.height=1920;
  const context=canvas.getContext('2d');

  const background=context.createLinearGradient(0,0,1080,1920);
  background.addColorStop(0,'#fff8f5');background.addColorStop(.52,'#fdebf2');background.addColorStop(1,'#f9d5e4');
  context.fillStyle=background;context.fillRect(0,0,1080,1920);
  context.globalAlpha=.42;context.fillStyle='#ffffff';context.beginPath();context.arc(90,230,260,0,Math.PI*2);context.fill();
  context.fillStyle='#f39abb';context.beginPath();context.arc(1040,1700,300,0,Math.PI*2);context.fill();context.globalAlpha=1;

  context.save();context.shadowColor='rgba(101,42,67,.16)';context.shadowBlur=50;context.shadowOffsetY=24;
  roundedRect(context,86,250,908,1428,42);context.fillStyle='#fffaf4';context.fill();context.restore();
  roundedRect(context,108,272,864,1384,31);context.strokeStyle='#eccbd7';context.lineWidth=2;context.stroke();

  try{
    const logo=await loadImage('./assets/logo.png');
    context.save();context.beginPath();context.arc(540,178,72,0,Math.PI*2);context.clip();context.drawImage(logo,468,106,144,144);context.restore();
  }catch{
    context.fillStyle='#f22d85';context.beginPath();context.arc(540,178,72,0,Math.PI*2);context.fill();
    context.fillStyle='#fff';context.textAlign='center';context.font='600 70px Playfair Display, serif';context.fillText('A',540,202);
  }

  context.textAlign='center';context.fillStyle='#a8778d';context.font='700 22px DM Sans, sans-serif';
  context.fillText('UMA CARTA PARA',540,356);
  let nameSize=106;do{context.font=`700 ${nameSize}px Caveat, cursive`;nameSize-=4;}while(context.measureText(input.recipientName).width>760&&nameSize>62);
  context.fillStyle='#ef2c82';context.fillText(input.recipientName,540,465);
  context.font='500 38px Caveat, cursive';context.fillStyle='#e277a0';context.fillText('♡',540,525);

  const layout=storyParagraphs(context,data.letter,740,820);
  context.textAlign='left';context.fillStyle='#613d4d';context.font=`500 ${layout.size}px Caveat, cursive`;
  let y=610;
  for(const lines of layout.blocks){
    for(const line of lines){context.fillText(line,170,y);y+=layout.lineHeight;}
    y+=Math.round(layout.lineHeight*.55);
  }

  const signatureY=Math.max(y+28,1460);
  context.textAlign='right';context.fillStyle='#803c5b';context.font='600 37px Caveat, cursive';
  context.fillText('Com todo o meu amor,',900,signatureY);
  context.font='700 43px Caveat, cursive';context.fillText(input.parentName,900,signatureY+50);

  context.strokeStyle='#e8ccd7';context.lineWidth=2;context.beginPath();context.moveTo(170,1580);context.lineTo(910,1580);context.stroke();
  context.textAlign='center';context.fillStyle='#714256';context.font='600 28px Playfair Display, serif';context.fillText('A Principal',540,1618);
  context.fillStyle='#aa7e91';context.font='700 15px DM Sans, sans-serif';context.fillText('BEBÊ E MAMÃE · MEMÓRIAS QUE ABRAÇAM',540,1648);
  context.fillStyle='#9d7084';context.font='600 18px DM Sans, sans-serif';context.fillText('@aprincipalbebeemamae',540,1802);
  context.font='500 16px DM Sans, sans-serif';context.fillText('Feito para celebrar cada fase.',540,1838);

  const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Não foi possível criar a imagem.')),'image/jpeg',.94));
  if(storyUrl)URL.revokeObjectURL(storyUrl);
  storyBlob=blob;storyUrl=URL.createObjectURL(blob);storyFilename=`carta-para-${safeFilename(input.recipientName)}-story.jpg`;
  $('#story-preview').src=storyUrl;
  const shareButton=$('#share-story');
  const shareFile=new File([blob],storyFilename,{type:'image/jpeg'});
  shareButton.hidden=!(navigator.share&&navigator.canShare?.({files:[shareFile]}));
}

async function displayLetter(data,input){
  form.hidden=true;
  document.querySelector('.experience-top').hidden=true;
  result.hidden=false;
  $('#letter-recipient').textContent=input.recipientName;
  $('#letter-copy').replaceChildren(...data.letter.split(/\n\s*\n/).map(paragraph=>{const p=document.createElement('p');p.textContent=paragraph;return p;}));
  $('#letter-signature').textContent=`Com todo o meu amor,\n${input.parentName}`;
  await createStoryJpg(data,input);
  setTimeout(()=>{
    $('#envelope-scene').style.display='none';
    $('#story-card').hidden=false;
    $('#story-card').classList.add('is-visible');
    $('.result-actions').classList.add('is-visible');
  },1700);
}

form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!validateStep(3))return;
  const button=$('.create-button'),input=payload();
  button.classList.add('is-loading');button.querySelector('.button-label').textContent='Escrevendo sua carta…';
  submitStatus.textContent='Transformando os detalhes de vocês em palavras.';
  try{
    const response=await fetch('/api/generate-letter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Não foi possível criar a carta.');
    await displayLetter(data,input);
  }catch(error){
    submitStatus.textContent=error.message;
    button.classList.remove('is-loading');button.querySelector('.button-label').textContent='Criar minha carta';
  }
});

function downloadStory(){
  if(!storyBlob)return;
  const link=document.createElement('a');link.href=storyUrl;link.download=storyFilename;document.body.append(link);link.click();link.remove();
}

$('#download-story').addEventListener('click',downloadStory);
$('#share-story').addEventListener('click',async()=>{
  if(!storyBlob)return;
  const file=new File([storyBlob],storyFilename,{type:'image/jpeg'});
  if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'Uma carta para guardar'});
  else downloadStory();
});
$('#restart').addEventListener('click',()=>{
  form.reset();form.hidden=false;result.hidden=true;document.querySelector('.experience-top').hidden=false;
  $('#story-card').hidden=true;$('#story-card').classList.remove('is-visible');$('.result-actions').classList.remove('is-visible');$('#envelope-scene').style.display='grid';
  if(storyUrl)URL.revokeObjectURL(storyUrl);storyUrl='';storyBlob=null;$('#story-preview').removeAttribute('src');
  submitStatus.textContent='';$('.create-button').classList.remove('is-loading');$('.create-button .button-label').textContent='Criar minha carta';
  showStep(1);
});
