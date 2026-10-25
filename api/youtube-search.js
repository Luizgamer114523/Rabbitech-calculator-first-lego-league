// Vercel Serverless Function: api/youtube-search.js
// Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel Project Settings > Environment Variables.
// Never put SUPABASE_SERVICE_ROLE_KEY in the HTML or send it to a browser.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  const q = String(req.query?.q || '').trim().slice(0, 160);
  if (q.length < 1) return res.status(400).json({ error: 'Informe o que deseja pesquisar.' });
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'O servidor ainda não foi configurado.' });
  try {
    const secretUrl = new URL('/rest/v1/rabbitech_private_secrets', supabaseUrl);
    secretUrl.searchParams.set('select', 'secret_value');
    secretUrl.searchParams.set('secret_name', 'eq.youtube_data_api_v3');
    secretUrl.searchParams.set('limit', '1');
    const secretResponse = await fetch(secretUrl, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    if (!secretResponse.ok) throw new Error('Não foi possível ler a configuração da API.');
    const rows = await secretResponse.json();
    const apiKey = rows?.[0]?.secret_value;
    if (!apiKey) return res.status(503).json({ error: 'A API do YouTube ainda não foi configurada pelo proprietário.' });
    const yt = new URL('https://www.googleapis.com/youtube/v3/search');
    yt.searchParams.set('part', 'snippet');
    yt.searchParams.set('type', 'video');
    yt.searchParams.set('maxResults', '12');
    yt.searchParams.set('safeSearch', 'moderate');
    yt.searchParams.set('q', q);
    yt.searchParams.set('key', apiKey);
    const response = await fetch(yt, { headers: { Referer: 'https://rabbitech-fllc.vercel.app/', Origin: 'https://rabbitech-fllc.vercel.app' } });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data?.error?.message || 'O YouTube recusou a pesquisa.' });
    const items = (data.items || []).map(v => ({
      id: v.id?.videoId,
      title: v.snippet?.title || 'Vídeo do YouTube',
      channelTitle: v.snippet?.channelTitle || '',
      thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || ''
    })).filter(v => v.id);
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Erro interno ao pesquisar vídeos.' });
  }
}
