import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return new Response(JSON.stringify({ error: "Método não permitido." }), { status: 405, headers: corsHeaders });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  let serviceKey = "";
  try { serviceKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || ""; } catch {}
  if (!supabaseUrl || !serviceKey) return new Response(JSON.stringify({ error: "Configuração interna do Supabase indisponível." }), { status: 503, headers: corsHeaders });
  let q = "";
  try { q = req.method === "GET" ? new URL(req.url).searchParams.get("q") || "" : (await req.json()).q || ""; } catch {}
  q = String(q).trim().slice(0, 200);
  if (q.length < 2) return new Response(JSON.stringify({ error: "Informe uma pesquisa com pelo menos 2 caracteres." }), { status: 400, headers: corsHeaders });
  try {
    const secretUrl = new URL("/rest/v1/rabbitech_private_secrets", supabaseUrl);
    secretUrl.search = new URLSearchParams({ select: "secret_value", secret_name: "eq.youtube_data_api_v3", limit: "1" }).toString();
    const saved = await fetch(secretUrl, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    if (!saved.ok) return new Response(JSON.stringify({ error: "Não foi possível ler a configuração privada do YouTube." }), { status: 502, headers: corsHeaders });
    const apiKey = (await saved.json())?.[0]?.secret_value;
    if (!apiKey) return new Response(JSON.stringify({ error: "A API do YouTube ainda não foi configurada pelo proprietário." }), { status: 503, headers: corsHeaders });
    const yt = new URL("https://www.googleapis.com/youtube/v3/search");
    yt.search = new URLSearchParams({ part: "snippet", type: "video", maxResults: "12", safeSearch: "moderate", q, key: apiKey }).toString();
    const response = await fetch(yt);
    const data = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ error: response.status === 403 ? "O YouTube recusou a chave ou a cota foi esgotada." : "Erro na pesquisa do YouTube." }), { status: 502, headers: corsHeaders });
    const items = (data.items || []).map((v: any) => ({ id: v.id?.videoId, title: v.snippet?.title || "Vídeo do YouTube", channelTitle: v.snippet?.channelTitle || "", thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || "" })).filter((v: any) => v.id);
    return new Response(JSON.stringify({ items }), { status: 200, headers: corsHeaders });
  } catch { return new Response(JSON.stringify({ error: "Falha ao consultar o YouTube." }), { status: 502, headers: corsHeaders }); }
});