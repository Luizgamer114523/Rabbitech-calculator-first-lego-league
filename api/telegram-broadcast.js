// Admin-authenticated broadcast of a newly changed active global notice to linked Telegram accounts.
import { createHash } from 'node:crypto';

const responseJson = (res, status, payload) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(status).json(payload);
};
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = () => String(process.env.SUPABASE_URL || '').replace(/\/$/, '');

async function db(path, options = {}) {
  const key = serviceKey();
  const response = await fetch(baseUrl() + '/rest/v1/' + path.replace(/^\//, ''), {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation'
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(10000)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  if (!response.ok) throw new Error('Supabase request failed.');
  return data;
}

async function telegramSend(chatId, text) {
  const response = await fetch('https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 3900), disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok !== true) throw new Error('Telegram delivery failed.');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') return responseJson(res, 405, { error: 'Método não permitido.' });

  const authorization = String(req.headers?.authorization || '');
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return responseJson(res, 401, { error: 'Sessão necessária.' });
  if (!process.env.SUPABASE_URL || !serviceKey() || !process.env.TELEGRAM_BOT_TOKEN) {
    return responseJson(res, 503, { error: 'Notificações Telegram não configuradas no servidor.' });
  }

  try {
    const userResponse = await fetch(baseUrl() + '/auth/v1/user', {
      headers: { apikey: serviceKey(), Authorization: 'Bearer ' + tokenMatch[1] },
      signal: AbortSignal.timeout(8000)
    });
    if (!userResponse.ok) return responseJson(res, 401, { error: 'Sessão inválida.' });
    const user = await userResponse.json();
    if (!user?.id) return responseJson(res, 401, { error: 'Sessão inválida.' });

    const admins = await db('app_admins?select=user_id&user_id=eq.' + encodeURIComponent(user.id) + '&limit=1');
    if (!admins?.length) return responseJson(res, 403, { error: 'Apenas administradores podem enviar avisos globais.' });

    const settingsData = await db('rpc/get_rabbitech_public_settings', { method: 'POST', body: {} });
    const settings = Array.isArray(settingsData) ? settingsData[0] : settingsData;
    const enabled = settings?.feature_flags?.global_notices !== false;
    const active = settings?.display_notice_active ?? settings?.notice_active;
    const text = String(settings?.display_notice_text ?? settings?.notice_text ?? '').trim();
    const type = String(settings?.display_notice_type ?? settings?.notice_type ?? 'info');
    if (!enabled || !active || !text) return responseJson(res, 200, { sent: false, reason: 'no_active_notice' });

    const digest = createHash('sha256').update(JSON.stringify({ text, type }), 'utf8').digest('hex');
    const inserted = await db('telegram_notice_broadcasts?on_conflict=notice_hash', {
      method: 'POST',
      body: [{ notice_hash: digest, created_by: user.id, status: 'sending', recipient_count: 0, failed_count: 0 }],
      prefer: 'resolution=ignore-duplicates,return=representation'
    });
    if (!inserted?.length) return responseJson(res, 200, { sent: false, reason: 'already_sent' });

    try {
      const links = await db('telegram_user_links?select=chat_id');
      let sent = 0, failed = 0;
      for (const link of links || []) {
        try { await telegramSend(link.chat_id, '📢 Aviso global do Rabbitech\n\n' + text); sent++; }
        catch (_) { failed++; }
      }
      await db('telegram_notice_broadcasts?notice_hash=eq.' + digest, {
        method: 'PATCH',
        body: { status: failed ? 'partial' : 'sent', recipient_count: sent, failed_count: failed },
        prefer: 'return=minimal'
      });
      if (sent === 0 && failed > 0) {
        await db('telegram_notice_broadcasts?notice_hash=eq.' + digest, { method: 'DELETE', prefer: 'return=minimal' });
        return responseJson(res, 502, { sent: false, reason: 'delivery_failed', failed });
      }
      return responseJson(res, 200, { sent: true, recipients: sent, failed });
    } catch (error) {
      await db('telegram_notice_broadcasts?notice_hash=eq.' + digest, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {});
      throw error;
    }
  } catch (_) {
    return responseJson(res, 500, { error: 'Não foi possível processar o aviso Telegram.' });
  }
}
