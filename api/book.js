/* POST /api/book — recebe uma reserva do site e avisa a equipe no Telegram.
 *
 * O token do bot NUNCA aparece no navegador nem no repositório: ele vive
 * em variáveis de ambiente do projeto na Vercel.
 *
 *   TELEGRAM_BOT_TOKEN   token do @Rootsbjj_bot
 *   TELEGRAM_CHAT_ID     destino (pessoa, grupo ou canal)
 *
 * Responde { ok: true } quando a mensagem saiu. Qualquer outra coisa é
 * falha — o front-end trata e pede para o cliente ligar.
 */

const MAX = 200; // nenhum campo legítimo passa disso

function clean(v) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, MAX);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sydney(iso, opts) {
  try {
    return new Intl.DateTimeFormat('en-AU',
      Object.assign({ timeZone: 'Australia/Sydney' }, opts)).format(new Date(iso));
  } catch (_) {
    return iso;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('faltam TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID');
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = null; }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'bad_body' });
  }

  // honeypot: campo invisível preenchido = bot
  if (clean(body.company)) return res.status(200).json({ ok: true, skipped: true });

  const name = clean(body.name);
  const phone = clean(body.phone);
  const iso = clean(body.iso);
  if (!name || !phone || !iso) {
    return res.status(400).json({ ok: false, error: 'missing_fields' });
  }

  const email = clean(body.email);
  const classLabel = clean(body.classLabel) || 'Aula não informada';
  const ages = clean(body.ages);
  const range = clean(body.start) && clean(body.end)
    ? `${clean(body.start)} – ${clean(body.end)}` : '';
  const source = clean(body.source) || 'website';

  const day = sydney(iso, { weekday: 'long', day: 'numeric', month: 'long' });
  const time = range || sydney(iso, { hour: 'numeric', minute: '2-digit' });

  const lines = [
    '🥋 <b>NOVA AULA EXPERIMENTAL</b>',
    '',
    `👤 <b>${esc(name)}</b>`,
    `📞 ${esc(phone)}`,
    email ? `✉️ ${esc(email)}` : null,
    '',
    `📅 <b>${esc(day)}</b> · ${esc(time)}`,
    `🏷 ${esc(classLabel)}${ages ? ` · ${esc(ages)}` : ''}`,
    '',
    `🌐 Origem: ${esc(source === 'ads-landing' ? 'landing de anúncios' : 'site')}`,
  ].filter(Boolean);

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const out = await r.json();
    if (!out.ok) {
      console.error('telegram recusou:', out.description);
      return res.status(502).json({ ok: false, error: 'telegram_rejected' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('falha ao falar com o telegram:', err.message);
    return res.status(502).json({ ok: false, error: 'telegram_unreachable' });
  }
};
