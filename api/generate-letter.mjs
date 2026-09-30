const groqKey = process.env.GROQ_API_KEY || '';
const groqModel = process.env.GROQ_LETTER_MODEL || 'llama-3.3-70b-versatile';
const attempts = new Map();

function cleanText(value, max = 100) {
  return String(value ?? '').trim().normalize('NFC').replace(/[<>]/g, '').slice(0, max);
}

export function validate(raw) {
  const data = {
    parentName: cleanText(raw.parentName, 70),
    phone: cleanText(raw.phone, 15).replace(/\D/g, ''),
    isPregnant: raw.isPregnant === true,
    recipientName: cleanText(raw.recipientName, 70),
    weeks: raw.weeks == null ? null : Number(raw.weeks),
    hasChildren: raw.hasChildren === true,
    childAge: raw.childAge == null ? null : Number(raw.childAge),
    privacyConsent: raw.privacyConsent === true,
    marketingConsent: raw.marketingConsent === true
  };

  if (data.parentName.length < 2 || data.recipientName.length < 2) throw new Error('Confira os nomes informados.');
  if (!/^\d{10,11}$/.test(data.phone)) throw new Error('Informe um WhatsApp com DDD.');
  if (!data.privacyConsent || !data.marketingConsent) throw new Error('Confirme as autorizações para continuar.');
  if (data.isPregnant && (!Number.isInteger(data.weeks) || data.weeks < 1 || data.weeks > 42)) throw new Error('Informe uma quantidade válida de semanas.');
  if (!data.isPregnant && (!Number.isInteger(data.childAge) || data.childAge < 0 || data.childAge > 17)) throw new Error('Informe uma idade válida.');
  return data;
}

function fallbackLetter(data) {
  if (data.isPregnant) {
    const family = data.hasChildren
      ? 'Você já é parte de uma família que cresceu em amor, e logo conhecerá quem já espera por você.'
      : 'Tudo em mim aprende uma nova forma de amar enquanto espero por você.';
    return `Ainda não vi todos os seus detalhes, mas já reconheço a presença que você trouxe para os meus dias. Há ${data.weeks} semanas, meu coração começou a contar o tempo de um jeito diferente: não em horas, mas em sonhos, planos e pequenos instantes de espera.\n\n${family} Quero que um dia você saiba que, muito antes do nosso primeiro encontro, já havia um lugar inteiro preparado para você dentro de mim.\n\nQue esta carta guarde um pedacinho do começo da nossa história. Era o tempo em que eu ainda esperava para tocar suas mãos, mas já amava tudo o que você seria.`;
  }

  const age = data.childAge === 0 ? 'ainda tão pequeno' : `aos ${data.childAge} ${data.childAge === 1 ? 'ano' : 'anos'}`;
  return `Desde que você chegou, os dias ganharam detalhes que antes eu não sabia enxergar. Seu jeito, suas descobertas e até as pequenas bagunças transformaram a nossa casa e também transformaram quem eu sou.\n\nHoje, ${age}, você me ensina que o amor mora nas coisas simples: em um abraço demorado, numa risada inesperada e na vontade de guardar cada fase para sempre.\n\nQuando você reler esta carta, quero que se lembre de uma verdade que nunca vai mudar: não importa quanto o tempo passe, você sempre terá em mim um lugar seguro, um colo e um amor inteiro.`;
}

export async function generateWithGroq(data) {
  if (!groqKey) return {letter: fallbackLetter(data), source: 'automatic'};

  const facts = {
    nome_de_quem_escreve: data.parentName,
    nome_da_crianca: data.recipientName,
    gestante: data.isPregnant
  };
  if (data.isPregnant) {
    facts.semanas_de_gestacao = data.weeks;
    facts.tem_outros_filhos = data.hasChildren;
  } else {
    facts.idade_da_crianca = data.childAge;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: groqModel,
        temperature: 0.75,
        max_completion_tokens: 620,
        messages: [
          {role: 'system', content: 'Você escreve cartas afetivas em português brasileiro, de uma mãe ou responsável para uma criança. Use somente os fatos presentes no JSON. Escreva exatamente 3 parágrafos curtos, íntimos, delicados e naturais, entre 500 e 850 caracteres no total. A carta será exibida com o nome da criança e assinatura fora do texto: não escreva saudação, título ou assinatura. Não pressuponha gênero, aparência, saúde, data do parto, relacionamento familiar, religião ou qualquer fato ausente. Não dê orientação médica. Não use clichês comerciais, emojis, markdown, hashtags, travessões ou hífens como recurso estilístico. Se a pessoa está gestante, reconheça com delicadeza a espera e a quantidade de semanas. Se não está gestante, celebre a fase atual conforme a idade. Retorne apenas a carta.'},
          {role: 'user', content: `FATOS AUTORIZADOS:\n${JSON.stringify(facts)}`}
        ]
      })
    });
    if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
    const payload = await response.json();
    const letter = cleanText(payload.choices?.[0]?.message?.content, 1200)
      .replace(/[—–]/g, ',')
      .replace(/\s*\n\s*/g, '\n\n')
      .replace(/\n{3,}/g, '\n\n');
    if (letter.length < 250) throw new Error('Resposta incompleta');
    return {letter, source: 'ai'};
  } catch {
    return {letter: fallbackLetter(data), source: 'automatic'};
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({error: 'Método não permitido'});

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.until < now) attempts.set(ip, {count: 1, until: now + 60000});
  else {
    entry.count += 1;
    if (entry.count > 6) return res.status(429).json({error: 'Muitas tentativas. Aguarde um minuto e tente novamente.'});
  }

  try {
    const data = validate(typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {});
    return res.status(200).json(await generateWithGroq(data));
  } catch (error) {
    return res.status(400).json({error: error.message || 'Não foi possível concluir.'});
  }
}
