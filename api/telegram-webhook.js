// Rabbitech Telegram bot webhook for Vercel.
// Required server-only environment variables:
// TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createHash } from 'node:crypto';

const noStore = { 'Cache-Control': 'no-store, max-age=0' };
const trim = (value, max = 180) => String(value ?? '').trim().slice(0, max);
const escapeText = (value) => String(value ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const commandText = (message) => trim(message?.text, 4000);
const isTelegramId = (value) => /^\d{1,20}$/.test(String(value ?? ''));

function sendJson(res, status, payload) {
  res.setHeader('Cache-Control', noStore['Cache-Control']);
  return res.status(status).json(payload);
}

async function telegram(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const response = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok !== true) throw new Error('Telegram API request failed: ' + method);
  return data.result;
}

async function supabase(path, options = {}) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = new URL(path.replace(/^\//, ''), base.replace(/\/$/, '') + '/');
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation'
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(8000)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  if (!response.ok) {
    const message = Array.isArray(data) ? data[0]?.message : data?.message;
    throw new Error(message || 'Supabase request failed.');
  }
  return data;
}

async function sendMessage(chatId, text) {
  const safeText = String(text ?? '').slice(0, 3900);
  return telegram('sendMessage', {
    chat_id: chatId,
    text: safeText,
    disable_web_page_preview: true
  });
}

async function getLinkedUser(telegramUserId) {
  const params = new URLSearchParams({
    select: 'telegram_user_id,chat_id,user_id,username,first_name',
    telegram_user_id: 'eq.' + String(telegramUserId),
    limit: '1'
  });
  const rows = await supabase('rest/v1/telegram_user_links?' + params);
  return rows?.[0] || null;
}

async function getTeam(userId) {
  const membershipParams = new URLSearchParams({
    select: 'team_id,display_name,role',
    user_id: 'eq.' + userId,
    limit: '1'
  });
  const memberships = await supabase('rest/v1/team_memberships?' + membershipParams);
  const membership = memberships?.[0];
  if (!membership) return null;

  const teamParams = new URLSearchParams({
    select: 'id,name,auth_user_id',
    id: 'eq.' + membership.team_id,
    limit: '1'
  });
  const teams = await supabase('rest/v1/teams?' + teamParams);
  if (!teams?.[0]) return null;
  return { ...teams[0], display_name: membership.display_name, role: membership.role };
}

async function handleCommand(message) {
  const chatId = message?.chat?.id;
  const telegramUserId = message?.from?.id;
  if (!isTelegramId(chatId) || !isTelegramId(telegramUserId)) return;
  const raw = commandText(message);
  const [commandToken, ...args] = raw.split(/\s+/);
  const command = (commandToken || '').split('@')[0].toLowerCase();
  const argument = args.join(' ').trim();

  if (command === '/start' && argument) {
    const code = argument.replace(/\s+/g, '').toLowerCase();
    if (!/^[a-f0-9]{48}$/.test(code)) {
      await sendMessage(chatId, 'Para vincular sua conta, gere um código no Espaço da equipe do Rabbitech e envie /link SEU_CODIGO. O código expira em 10 minutos.');
      return;
    }
    await claimLink(message, code);
    return;
  }

  if (command === '/link') {
    const code = argument.replace(/\s+/g, '').toLowerCase();
    if (!/^[a-f0-9]{48}$/.test(code)) {
      await sendMessage(chatId, 'Uso: /link SEU_CODIGO\nGere o código no Espaço da equipe do Rabbitech. Ele expira em 10 minutos.');
      return;
    }
    await claimLink(message, code);
    return;
  }

  if (command === '/help' || command === '/start') {
    await sendMessage(chatId,
      '🤖 Rabbitech Bot\n\n' +
      '/link CODIGO · vincular sua conta Rabbitech\n' +
      '/team · consultar sua equipe\n' +
      '/tasks · ver tarefas pendentes\n' +
      '/rounds · ver desempenho recente\n' +
      '/notice · consultar aviso global\n' +
      '/robotica · ferramentas de robótica\n' +
      '/fll · recursos da FIRST LEGO League\n' +
      '/support · ajuda e suporte\n' +
      '/unlink · desvincular esta conta do Telegram');
    return;
  }

  const linked = await getLinkedUser(telegramUserId);
  if (!linked) {
    await sendMessage(chatId, 'Sua conta ainda não está vinculada. Entre no Rabbitech, abra Espaço da equipe e gere um código. Depois envie /link SEU_CODIGO.');
    return;
  }

  if (command === '/unlink') {
    await supabase('rest/v1/rpc/unlink_telegram_account', {
      method: 'POST', body: { p_telegram_user_id: String(telegramUserId) }, prefer: 'return=minimal'
    });
    await sendMessage(chatId, 'Conta do Telegram desvinculada. Para usar o bot novamente, gere um novo código no Rabbitech.');
    return;
  }

  if (command === '/team') {
    const team = await getTeam(linked.user_id);
    await sendMessage(chatId, team
      ? '👥 ' + team.name + '\nSeu nome: ' + team.display_name + '\nFunção na equipe: ' + team.role
      : 'Sua conta está vinculada, mas ainda não pertence a uma equipe no Rabbitech.');
    return;
  }

  if (command === '/tasks') {
    const team = await getTeam(linked.user_id);
    if (!team) { await sendMessage(chatId, 'Sua conta ainda não está vinculada a uma equipe.'); return; }
    const params = new URLSearchParams({
      select: 'title,status,priority,due_date',
      team_id: 'eq.' + team.id,
      status: 'neq.done',
      order: 'due_date.asc.nullslast,created_at.desc',
      limit: '10'
    });
    const tasks = await supabase('rest/v1/team_tasks?' + params);
    await sendMessage(chatId, tasks?.length
      ? '📋 Tarefas pendentes de ' + team.name + ':\n\n' + tasks.map((t, i) =>
          (i + 1) + '. ' + t.title + ' [' + t.status + ', ' + t.priority + ']' +
          (t.due_date ? ' · prazo ' + t.due_date : '')).join('\n')
      : 'Nenhuma tarefa pendente encontrada para ' + team.name + '.');
    return;
  }

  if (command === '/rounds') {
    const team = await getTeam(linked.user_id);
    if (!team) { await sendMessage(chatId, 'Sua conta ainda não está vinculada a uma equipe.'); return; }
    const params = new URLSearchParams({
      select: 'round_number,score,start_position,performed_at',
      team_id: 'eq.' + team.id,
      order: 'performed_at.desc',
      limit: '5'
    });
    const rounds = await supabase('rest/v1/team_round_logs?' + params);
    if (!rounds?.length) { await sendMessage(chatId, 'Ainda não há rounds registrados para ' + team.name + '.'); return; }
    const average = Math.round(rounds.reduce((sum, round) => sum + Number(round.score || 0), 0) / rounds.length);
    await sendMessage(chatId, '🤖 Rounds recentes · ' + team.name + '\nMédia dos últimos ' + rounds.length + ': ' + average + ' pontos\n\n' +
      rounds.map(r => 'Round ' + r.round_number + ': ' + r.score + ' pts · ' + new Date(r.performed_at).toLocaleDateString('pt-BR')).join('\n'));
    return;
  }

  if (command === '/notice') {
    const result = await supabase('rest/v1/rpc/get_rabbitech_public_settings', { method: 'POST', body: {} });
    const settings = Array.isArray(result) ? result[0] : result;
    const active = settings?.display_notice_active ?? settings?.notice_active;
    const text = settings?.display_notice_text ?? settings?.notice_text;
    await sendMessage(chatId, active && String(text || '').trim()
      ? '📢 Aviso do Rabbitech:\n' + String(text).slice(0, 3000)
      : 'Não há aviso global ativo no momento.');
    return;
  }

  if (command === '/robotica') {
    await sendMessage(chatId, '🤖 Robótica no Rabbitech\nUse o Espaço da equipe para registrar rounds, pontuações, posição inicial, missões e observações dos testes.\nPlataforma: https://rabbitech-fllc.vercel.app/');
    return;
  }

  if (command === '/fll') {
    await sendMessage(chatId, '🏁 FIRST LEGO League\nNo Rabbitech, organize tarefas, metas, estratégias e resultados dos rounds. Confira as informações oficiais em https://www.firstlegoleague.org/ e as regras do desafio com a organização local.');
    return;
  }

  if (command === '/support') {
    await sendMessage(chatId, '🛠️ Suporte Rabbitech\nUse a plataforma: https://rabbitech-fllc.vercel.app/\nNão envie senhas, códigos de login ou chaves de API pelo chat.');
    return;
  }

  await sendMessage(chatId, 'Não reconheci esse comando. Envie /help para ver o que posso fazer.');
}

async function claimLink(message, code) {
  const chatId = message.chat.id;
  const telegramUserId = message.from.id;
  const codeHash = createHash('sha256').update(code, 'utf8').digest('hex');
  try {
    await supabase('rest/v1/rpc/claim_telegram_link', {
      method: 'POST',
      body: {
        p_code_hash: codeHash,
        p_telegram_user_id: String(telegramUserId),
        p_chat_id: String(chatId),
        p_username: trim(message.from.username, 64),
        p_first_name: trim(message.from.first_name, 120)
      }
    });
    await sendMessage(chatId, '✅ Conta vinculada com segurança ao Rabbitech! Envie /help para ver os comandos.');
  } catch (error) {
    const detail = String(error?.message || '');
    const friendly = /expirado|inválido|vinculad|autorizado/i.test(detail)
      ? detail.slice(0, 250)
      : 'Não foi possível concluir o vínculo. Gere um novo código no Rabbitech e tente novamente.';
    await sendMessage(chatId, friendly);
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', noStore['Cache-Control']);
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método não permitido.' });

  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const received = req.headers?.['x-telegram-bot-api-secret-token'];
  if (!expected || !received || received !== expected) return sendJson(res, 401, { error: 'Não autorizado.' });

  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return sendJson(res, 503, { error: 'Integração Telegram não configurada no servidor.' });
  }

  try {
    const update = req.body || {};
    const message = update.message || update.edited_message;
    if (message?.chat?.type === 'private' && message?.text) {
      await handleCommand(message);
    }
    // Telegram expects a fast 2xx response. Non-text/group updates are intentionally ignored.
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    // Avoid logging user messages, access tokens, bot tokens, or database responses.
    console.error('Rabbitech Telegram webhook failed:', String(error?.message || 'unknown error').slice(0, 180));
    return sendJson(res, 200, { ok: true });
  }
}
