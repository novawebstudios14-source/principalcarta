const form=document.querySelector('#letter-form');
const steps=[...document.querySelectorAll('.form-step')];
const progress=document.querySelector('#progress-bar');
const stepLabel=document.querySelector('#step-label');
const pregnantFields=document.querySelector('#pregnant-fields');
const parentFields=document.querySelector('#parent-fields');
const submitStatus=document.querySelector('#submit-status');
const result=document.querySelector('#letter-result');
let currentStep=1;

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

function displayLetter(data,input){
  form.hidden=true;
  document.querySelector('.experience-top').hidden=true;
  result.hidden=false;
  $('#letter-recipient').textContent=input.recipientName;
  $('#letter-copy').replaceChildren(...data.letter.split(/\n\s*\n/).map(paragraph=>{const p=document.createElement('p');p.textContent=paragraph;return p;}));
  $('#letter-signature').textContent=`Com todo o meu amor,\n${input.parentName}`;
  setTimeout(()=>{
    $('#envelope-scene').style.display='none';
    $('#letter-paper').classList.add('is-visible');
    $('.result-actions').classList.add('is-visible');
  },2200);
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
    displayLetter(data,input);
  }catch(error){
    submitStatus.textContent=error.message;
    button.classList.remove('is-loading');button.querySelector('.button-label').textContent='Criar minha carta';
  }
});

$('#print-letter').addEventListener('click',()=>window.print());
$('#restart').addEventListener('click',()=>{
  form.reset();form.hidden=false;result.hidden=true;document.querySelector('.experience-top').hidden=false;
  $('#letter-paper').classList.remove('is-visible');$('.result-actions').classList.remove('is-visible');$('#envelope-scene').style.display='grid';
  submitStatus.textContent='';$('.create-button').classList.remove('is-loading');$('.create-button .button-label').textContent='Criar minha carta';
  showStep(1);
});
