import {generateWithGroq, validate} from '../../api/generate-letter.mjs';

const attempts = new Map();

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

export default async function handler(request) {
  if (request.method !== 'POST') return json(405, {error: 'Método não permitido'});

  const ip = request.headers.get('x-nf-client-connection-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.until < now) attempts.set(ip, {count: 1, until: now + 60000});
  else {
    entry.count += 1;
    if (entry.count > 6) return json(429, {error: 'Muitas tentativas. Aguarde um minuto e tente novamente.'});
  }

  try {
    const data = validate(await request.json());
    return json(200, await generateWithGroq(data));
  } catch (error) {
    return json(400, {error: error.message || 'Não foi possível concluir.'});
  }
}
