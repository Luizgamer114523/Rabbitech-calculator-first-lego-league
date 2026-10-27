/* Rabbitech mobile dock + admin visibility. Single controller, idempotent setup. */
(()=>{'use strict';
 const OWNER_ID='7e799691-ba7e-42ea-ab6f-71ad11ca32ff';
 const $=id=>document.getElementById(id);
 function currentUser(){
  try{return (typeof rbCloudUser!=='undefined'&&rbCloudUser)||window.rbCloudUser||null}
  catch(_){return window.rbCloudUser||null}
 }
 function adminAllowed(){
  const user=currentUser();if(!user)return false;
  if(String(user.id||'')===OWNER_ID)return true;
  try{return (typeof rbIsAdmin!=='undefined'&&rbIsAdmin===true)||window.rbIsAdmin===true}
  catch(_){return window.rbIsAdmin===true}
 }
 function syncAdmin(){
  const allowed=adminAllowed(),button=$('rbAdminNav'),page=$('page-admin');
  if(button)button.hidden=!allowed;
  if(page&&!allowed){page.hidden=true;page.classList.remove('active')}
  else if(page&&allowed&&page.classList.contains('active'))page.hidden=false;
 }
 function setupDock(){
  const nav=document.querySelector('nav button[data-page]')?.closest('nav');
  if(!nav)return null;
  nav.classList.add('rb-samsung-dock');
  const adminButtons=nav.querySelectorAll('button[data-page="admin"]');
  adminButtons.forEach((button,index)=>{if(index===0)button.id='rbAdminNav';else button.remove()});
  const existing=nav.querySelector('#rbDockExpandOne');
  if(nav.dataset.rbDockController==='v4'&&existing)return nav;
  nav.querySelectorAll('#rbDockMore,#rbDockExpand,#rbDockExpandOne,#rbFinalDockMore').forEach(button=>button.remove());
  const more=document.createElement('button');
  more.id='rbDockExpandOne';more.type='button';more.textContent='−';
  more.title='Recolher abas';more.setAttribute('aria-label','Recolher abas');more.setAttribute('aria-expanded','true');
  more.addEventListener('click',event=>{
   event.preventDefault();event.stopImmediatePropagation();
   const collapsed=nav.classList.toggle('rb-dock-collapsed');
   more.textContent=collapsed?'+':'−';
   more.title=collapsed?'Mostrar todas as abas':'Recolher abas';
   more.setAttribute('aria-label',more.title);more.setAttribute('aria-expanded',String(!collapsed));
  });
  nav.appendChild(more);
  nav.dataset.rbDockController='v4';
  nav.classList.remove('rb-dock-collapsed');
  return nav;
 }
 function placeLanguageButton(){
  const button=$('rbLanguageQuick'),header=document.querySelector('body>header');
  const season=header?.querySelector('.season');
  if(!button||!season)return;
  // Keep the persistent language selector in the header, above "Founders Edition",
  // never inside the Privacy page content.
  if(button.parentElement!==season)season.insertBefore(button,season.firstChild);
  button.style.setProperty('display','inline-flex','important');
  button.style.setProperty('align-items','center','important');
  button.style.setProperty('justify-content','flex-end','important');
  button.style.setProperty('gap','6px','important');
  button.style.setProperty('margin','0 0 6px auto','important');
  button.style.setProperty('padding','4px 6px','important');
  button.style.setProperty('border','1px solid #49684b','important');
  button.style.setProperty('border-radius','9px','important');
  button.style.setProperty('font-size','11px','important');
  button.style.setProperty('white-space','nowrap','important');
  const select=button.querySelector('select');
  if(select){
   select.style.setProperty('margin-left','4px','important');
   select.style.setProperty('padding','4px 6px','important');
   select.style.setProperty('max-width','116px','important');
   select.style.setProperty('font-size','12px','important');
  }
 }
 const FEATURE_TARGETS={
  public_ranking:{page:'leaderboard',nav:'leaderboard'},
  youtube_tv:{page:'youtube',nav:'youtube'},
  music_player:{page:'music',nav:'music'},
  strategy:{page:'strategy',nav:'strategy'},
  routes:{page:'routes',nav:'routes'},
  rules:{page:'rules',nav:'rules'}
 };
 let lastFeatureFlags=null,lastNoticeActive=null;
 function getSupabaseClient(){
  try{if(typeof rbClient!=='undefined'&&rbClient)return rbClient}catch(_){}
  return window.rbClient||window.supabaseClient||null;
 }
 async function loadPublicSettings(){
  const client=getSupabaseClient();if(!client||typeof client.rpc!=='function')return;
  try{
   const result=await client.rpc('get_rabbitech_public_settings');
   if(result?.error||!result?.data)return;
   const settings=Array.isArray(result.data)?result.data[0]:result.data;
   const flags=settings?.feature_flags;
   if(!flags||typeof flags!=='object')return;
   // Scheduled notices use effective display fields; raw fields remain for admin editing.
   const activeNotice=typeof settings.display_notice_active==='boolean'
    ? settings.display_notice_active : settings.notice_active===true;
   const noticeText=typeof settings.display_notice_text==='string'
    ? settings.display_notice_text : (typeof settings.notice_text==='string'?settings.notice_text:'');
   const noticeType=typeof settings.display_notice_type==='string'
    ? settings.display_notice_type : (typeof settings.notice_type==='string'?settings.notice_type:'info');
   lastFeatureFlags=flags;lastNoticeActive=activeNotice;
   applyFeatureFlags(flags,lastNoticeActive,{text:noticeText,type:noticeType});
  }catch(error){console.warn('Rabbitech feature flags could not be refreshed',error)}
 }
 function applyFeatureFlags(flags,noticeActive,notice={}){
  Object.entries(FEATURE_TARGETS).forEach(([key,target])=>{
   const enabled=flags[key]!==false;
   document.querySelectorAll('nav button[data-page="'+target.nav+'"]').forEach(button=>{button.hidden=!enabled});
   const page=$('page-'+target.page);
   if(page){
    if(!enabled&&page.classList.contains('active')){
     page.classList.remove('active');
     const score=$('page-score');
     if(score){score.classList.add('active');score.hidden=false}
     document.querySelectorAll('main .page').forEach(other=>{if(other!==score){other.classList.remove('active');other.hidden=true}});
     document.querySelectorAll('nav button[data-page]').forEach(button=>button.classList.toggle('active',button.dataset.page==='score'));
    }
    page.hidden=!enabled;
   }
  });
  // Music is a module, so disabling it hides both the dock tab and floating library player.
  const musicEnabled=flags.music_player!==false;
  const musicFab=$('musicFab'),musicOverlay=$('musicOverlay'),musicAudio=$('musicAudio');
  if(musicFab)musicFab.hidden=!musicEnabled;
  if(musicOverlay){musicOverlay.hidden=!musicEnabled;if(!musicEnabled){musicOverlay.classList.remove('open','active','visible');musicOverlay.setAttribute('aria-hidden','true')}else musicOverlay.removeAttribute('aria-hidden')}
  if(!musicEnabled&&musicAudio){try{musicAudio.pause();musicAudio.currentTime=0}catch(_){}}
  document.querySelectorAll('[data-feature-flag]').forEach(element=>{if(element.closest('#page-admin'))return;const key=element.getAttribute('data-feature-flag');if(Object.prototype.hasOwnProperty.call(flags,key))element.hidden=flags[key]===false});
  const noticesEnabled=flags.global_notices!==false&&noticeActive===true;
  document.querySelectorAll('[id*="globalNotice" i],[class*="global-notice" i],[data-global-notice]').forEach(element=>{
   if(element.closest('#page-admin'))return;
   element.hidden=!noticesEnabled;
   element.classList.toggle('hidden',!noticesEnabled);
   const noticeType=['info','success','warning'].includes(notice.type)?notice.type:'info';
   element.dataset.noticeType=noticeType;
   element.classList.remove('rb-notice-info','rb-notice-success','rb-notice-warning');
   element.classList.add('rb-notice-'+noticeType);
   if(element.id==='rbGlobalNotice')element.setAttribute('role',noticeType==='warning'?'alert':'status');
   if(!noticesEnabled)element.setAttribute('aria-hidden','true');
   else element.removeAttribute('aria-hidden');
  });
  // Update only dedicated text targets so the banner's icons/buttons are preserved.
  if(typeof notice.text==='string'){
   document.querySelectorAll('[data-global-notice-text],[data-global-notice-message],#rbGlobalNoticeText,#rbGlobalNoticeMessage,.global-notice-text,.global-notice-message').forEach(element=>{
    if(!element.closest('#page-admin'))element.textContent=notice.text;
   });
  }
  document.querySelectorAll('[data-feature-flag]').forEach(element=>{
   const enabled=flags[element.getAttribute('data-feature-flag')]!==false;
   if(element.closest('#page-admin'))return;
   element.hidden=!enabled;
  });
 }


 function addDiagnostics(){
  if($('rbSystemDiagnosticsButton')||!$('page-admin'))return;
  const b=document.createElement('button');b.id='rbSystemDiagnosticsButton';b.type='button';b.textContent='Diagnóstico do sistema';
  b.style.cssText='display:block;width:100%;margin:12px auto;padding:12px;border:1px solid #7eaa63;border-radius:12px;background:#102318;color:#efffe8;font-weight:700';
  const p=document.createElement('section');p.id='rbSystemDiagnostics';p.hidden=true;p.style.cssText='margin:12px auto;padding:14px;border:1px solid #49684b;border-radius:14px;background:#0b1710;color:#edf7ed;overflow-wrap:anywhere';
  p.innerHTML='<h3>Diagnóstico Rabbitech</h3><p>Verifica a interface e a conexão pública. Não exibe credenciais nem altera configurações.</p><div id="rbSystemDiagnosticsResults" aria-live="polite">Pronto para verificar.</div><button id="rbSystemDiagnosticsRun" type="button">Executar verificação</button>';
  $('page-admin').append(b,p);b.addEventListener('click',()=>{p.hidden=!p.hidden;if(!p.hidden)runDiagnostics()});p.querySelector('#rbSystemDiagnosticsRun').addEventListener('click',runDiagnostics);
 }
 async function runDiagnostics(){
  const out=$('rbSystemDiagnosticsResults');if(!out)return;const checks=[];
  const add=(n,ok,d)=>checks.push({n,ok,d});
  const nav=document.querySelector('nav.rb-samsung-dock'),client=getSupabaseClient(),lang=$('rbLanguageConsent');
  add('Acesso administrativo',adminAllowed(),adminAllowed()?'Sessão administrativa detectada.':'Nenhuma sessão administrativa detectada.');
  add('Menu principal',!!nav,nav?'Menu encontrado.':'Menu de navegação não encontrado.');
  add('Página do placar',!!$('page-score'),$('page-score')?'Página encontrada.':'Elemento page-score ausente.');
  add('Página administrativa',!!$('page-admin'),$('page-admin')?'Página encontrada.':'Elemento page-admin ausente.');
  add('Tela de idioma',!lang||lang.hidden||getComputedStyle(lang).display==='none',!lang?'Sobreposição não encontrada.':(lang.hidden||getComputedStyle(lang).display==='none'?'Não está visível.':'Ainda está visível; verifique os controles.'));
  add('Cliente Supabase',!!client&&typeof client.rpc==='function',client?'RPC disponível.':'Cliente/RPC não encontrado.');
  if(client&&typeof client.rpc==='function'){try{const r=await Promise.race([client.rpc('get_rabbitech_public_settings'),new Promise((_,rej)=>setTimeout(()=>rej(new Error('Tempo limite de 8 s')),8000))]);add('RPC de configurações',!r?.error&&!!r?.data,r?.error?String(r.error.message||r.error).slice(0,180):r?.data?'Resposta recebida.':'Resposta sem dados.')}catch(e){add('RPC de configurações',false,String(e?.message||e).slice(0,180))}}else add('RPC de configurações',false,'Não foi possível testar sem cliente.');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  out.innerHTML=checks.map(x=>'<div style="padding:8px 0;border-bottom:1px solid #263d2c"><strong style="color:'+(x.ok?'#b8ef8b':'#ffb4a9')+'">'+(x.ok?'✓ ':'! ')+esc(x.n)+'</strong><div>'+esc(x.d)+'</div></div>').join('')+'<p>'+checks.filter(x=>x.ok).length+'/'+checks.length+' verificações aprovadas · '+new Date().toLocaleString()+'</p>';
 }


 function safeLocalGet(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(_){return []}}
 function addExtraTools(){
  const score=$('page-score'),strategy=$('page-strategy'),routes=$('page-routes'),admin=$('page-admin');
  if(score&&!$('rbCompetitionTimer')){
   const box=document.createElement('section');box.id='rbCompetitionTimer';box.style.cssText='margin:14px auto;padding:14px;max-width:720px;border:1px solid #49684b;border-radius:14px;background:rgba(9,25,15,.95);color:#edf7ed';
   box.innerHTML='<h3>⏱️ Cronômetro de competição</h3><div id="rbTimerDisplay" style="font-size:36px;font-weight:800;text-align:center;font-variant-numeric:tabular-nums">02:30</div><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button type="button" id="rbTimerStart">Iniciar</button><button type="button" id="rbTimerPause">Pausar</button><button type="button" id="rbTimerReset">Reiniciar</button></div><p style="font-size:12px;opacity:.75">Cronômetro local de 2 min e 30 s. Não altera nem envia pontuações.</p>';
   score.append(box);let remaining=150000,deadline=0,interval=null;
   const display=()=>{const sec=Math.max(0,Math.ceil(remaining/1000));$('rbTimerDisplay').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')};
   $('rbTimerStart').addEventListener('click',()=>{if(interval)return;deadline=Date.now()+remaining;interval=setInterval(()=>{remaining=Math.max(0,deadline-Date.now());display();if(!remaining){clearInterval(interval);interval=null;try{if(navigator.vibrate)navigator.vibrate([250,100,250])}catch(_){}}},200)});
   $('rbTimerPause').addEventListener('click',()=>{if(interval){remaining=Math.max(0,deadline-Date.now());clearInterval(interval);interval=null;display()}});
   $('rbTimerReset').addEventListener('click',()=>{if(interval)clearInterval(interval);interval=null;remaining=150000;display()});
  }
  if(strategy&&!$('rbStrategyPlanner')){
   const box=document.createElement('section');box.id='rbStrategyPlanner';box.style.cssText='margin:14px auto;padding:14px;max-width:720px;border:1px solid #49684b;border-radius:14px;background:rgba(9,25,15,.95);color:#edf7ed';
   box.innerHTML='<h3>🧠 Planejador rápido de estratégia</h3><p>Monte uma lista de missões e estime os pontos. Os valores são estimativas da equipe, não regras oficiais.</p><label>Nome da estratégia <input id="rbStrategyName" maxlength="60" placeholder="Ex.: rota lado esquerdo"></label><div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><input id="rbStrategyMission" maxlength="80" placeholder="Missão / objetivo"><input id="rbStrategyPoints" type="number" min="0" max="999" step="1" value="10" aria-label="Pontos estimados"><button type="button" id="rbStrategyAdd">Adicionar</button></div><ul id="rbStrategyList"></ul><p>Total estimado: <strong id="rbStrategyTotal">0</strong> pontos</p><button type="button" id="rbStrategySave">Salvar estratégia neste dispositivo</button><div id="rbStrategySaved" aria-live="polite"></div>';
   strategy.append(box);let items=[];
   const render=()=>{$('rbStrategyList').innerHTML=items.map((x,i)=>'<li>'+escapeDiagnosticText(x.name)+' · '+x.points+' pts <button type="button" data-remove="'+i+'">Remover</button></li>').join('');$('rbStrategyTotal').textContent=items.reduce((n,x)=>n+x.points,0);box.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{items.splice(Number(b.dataset.remove),1);render()}))};
   $('rbStrategyAdd').addEventListener('click',()=>{const name=$('rbStrategyMission').value.trim(),points=Number($('rbStrategyPoints').value);if(!name||!Number.isFinite(points)||points<0)return;items.push({name,points:Math.round(points)});$('rbStrategyMission').value='';render()});
   $('rbStrategySave').addEventListener('click',()=>{const saved=safeLocalGet('rabbitech_strategy_drafts');saved.push({name:$('rbStrategyName').value.trim()||'Estratégia sem nome',items,total:items.reduce((n,x)=>n+x.points,0),savedAt:new Date().toISOString()});try{localStorage.setItem('rabbitech_strategy_drafts',JSON.stringify(saved.slice(-30)));$('rbStrategySaved').textContent='Estratégia salva neste dispositivo.'}catch(_){$('rbStrategySaved').textContent='Não foi possível salvar no armazenamento local.'}});
  }
  if(routes&&!$('rbTrainingNotebook')){
   const box=document.createElement('section');box.id='rbTrainingNotebook';box.style.cssText='margin:14px auto;padding:14px;max-width:720px;border:1px solid #49684b;border-radius:14px;background:rgba(9,25,15,.95);color:#edf7ed';
   box.innerHTML='<h3>📓 Diário de testes do robô</h3><input id="rbTestTitle" maxlength="80" placeholder="Teste / alteração"><textarea id="rbTestNotes" maxlength="1500" rows="3" placeholder="O que aconteceu? O que vamos mudar?"></textarea><button type="button" id="rbTestSave">Registrar teste</button><ul id="rbTestEntries"></ul><p style="font-size:12px;opacity:.75">Os registros ficam somente neste navegador. Não são enviados ao Supabase.</p>';
   routes.append(box);
   const render=()=>{$('rbTestEntries').innerHTML=safeLocalGet('rabbitech_test_log').slice(-20).reverse().map(x=>'<li><strong>'+escapeDiagnosticText(x.title)+'</strong><div>'+escapeDiagnosticText(x.notes)+'</div><small>'+escapeDiagnosticText(new Date(x.at).toLocaleString())+'</small></li>').join('')||'<li>Nenhum teste registrado ainda.</li>'};
   $('rbTestSave').addEventListener('click',()=>{const title=$('rbTestTitle').value.trim(),notes=$('rbTestNotes').value.trim();if(!title||!notes)return;const entries=safeLocalGet('rabbitech_test_log');entries.push({title,notes,at:new Date().toISOString()});try{localStorage.setItem('rabbitech_test_log',JSON.stringify(entries.slice(-100)));$('rbTestTitle').value='';$('rbTestNotes').value='';render()}catch(_){$('rbTestEntries').textContent='Armazenamento local indisponível.'}});render();
  }
  if(admin&&!$('rbFeatureStatus')){
   const box=document.createElement('section');box.id='rbFeatureStatus';box.style.cssText='margin:14px auto;padding:14px;max-width:720px;border:1px solid #49684b;border-radius:14px;background:rgba(9,25,15,.95);color:#edf7ed';
   box.innerHTML='<h3>🧩 Estado dos módulos</h3><p>Resumo local dos módulos encontrados no HTML. Não altera as chaves globais.</p><button id="rbFeatureStatusRefresh" type="button">Atualizar diagnóstico de módulos</button><ul id="rbFeatureStatusList"></ul>';
   admin.append(box);const render=()=>{const keys=[...new Set([...document.querySelectorAll('nav button[data-page]')].map(b=>b.dataset.page))];$('rbFeatureStatusList').innerHTML=keys.map(k=>{const b=document.querySelector('nav button[data-page="'+k+'"]'),p=$('page-'+k);return '<li><strong>'+escapeDiagnosticText(k)+'</strong>: botão '+(b?(b.hidden?'oculto':'presente'):'ausente')+', página '+(p?(p.hidden?'oculta':'presente'):'ausente')+'</li>'}).join('')||'<li>Nenhum módulo encontrado.</li>'};$('rbFeatureStatusRefresh').addEventListener('click',render);render();
  }
 }

 function init(){
  setupDock();placeLanguageButton();syncAdmin();loadPublicSettings();addDiagnostics();addExtraTools();
  const observer=new MutationObserver(()=>{
   setupDock();placeLanguageButton();syncAdmin();addDiagnostics();addExtraTools();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  let previous='';
  setInterval(()=>{
   const user=currentUser(),key=user?String(user.id||'')+':'+String(adminAllowed()):'out';
   if(key!==previous){previous=key;syncAdmin()}
  },700);
  window.addEventListener('rb-auth-state-changed',syncAdmin);
  window.addEventListener('rb-site-settings-updated',loadPublicSettings);
  setInterval(loadPublicSettings,15000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();