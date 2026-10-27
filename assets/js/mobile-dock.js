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
   element.dataset.noticeType=['info','success','warning'].includes(notice.type)?notice.type:'info';
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

 function setupDiagnosticsPanel(){
  const page=$('page-admin');if(!page)return;
  let panel=$('rbSystemHealthPanel');
  if(!panel){
   panel=document.createElement('section');panel.id='rbSystemHealthPanel';
   panel.setAttribute('aria-labelledby','rbSystemHealthTitle');
   Object.assign(panel.style,{margin:'18px 0',padding:'16px',border:'1px solid rgba(208,244,119,.28)',borderRadius:'16px',background:'rgba(7,19,12,.78)',color:'var(--text,#edf7ed)'});
   const title=document.createElement('h2');title.id='rbSystemHealthTitle';title.textContent='Diagnóstico do sistema';
   Object.assign(title.style,{margin:'0 0 6px',fontSize:'18px'});
   const description=document.createElement('p');description.textContent='Verificação somente de leitura: conexão, funções críticas e integridade básica. Nenhuma credencial é exibida.';
   Object.assign(description.style,{margin:'0 0 12px',fontSize:'13px',opacity:'.85'});
   const controls=document.createElement('div');Object.assign(controls.style,{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'});
   const button=document.createElement('button');button.type='button';button.id='rbRunSystemHealth';
   button.textContent='Executar diagnóstico';
   Object.assign(button.style,{padding:'10px 14px',borderRadius:'10px',border:'1px solid rgba(208,244,119,.4)',background:'rgba(208,244,119,.12)',color:'inherit',fontWeight:'600',cursor:'pointer'});
   const status=document.createElement('p');status.id='rbSystemHealthStatus';status.setAttribute('role','status');status.textContent='Diagnóstico ainda não executado.';
   Object.assign(status.style,{margin:'0',fontSize:'13px'});
   const results=document.createElement('div');results.id='rbSystemHealthResults';
   Object.assign(results.style,{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:'8px',marginTop:'12px'});
   controls.append(button,status);panel.append(title,description,controls,results);
   page.appendChild(panel);
   button.addEventListener('click',()=>runSystemHealthDiagnostics(panel));
  }
  panel.hidden=!adminAllowed();
 }
 function renderHealthResults(results,items){
  results.replaceChildren();
  items.forEach(([label,value,ok])=>{
   const row=document.createElement('div');
   Object.assign(row.style,{padding:'10px 12px',border:'1px solid rgba(208,244,119,.16)',borderRadius:'10px',background:'rgba(255,255,255,.025)',minWidth:'0'});
   const name=document.createElement('div');name.textContent=label;
   Object.assign(name.style,{fontSize:'11px',opacity:'.72',marginBottom:'5px'});
   const val=document.createElement('div');val.textContent=String(value);
   Object.assign(val.style,{fontSize:'14px',fontWeight:'600',overflowWrap:'anywhere',color:ok===false?'#ffb4ab':'inherit'});
   row.append(name,val);results.appendChild(row);
  });
 }
 async function runSystemHealthDiagnostics(panel){
  const button=$('rbRunSystemHealth'),status=$('rbSystemHealthStatus'),results=$('rbSystemHealthResults');
  if(!button||!status||!results)return;
  if(!adminAllowed()){status.textContent='Acesso negado: entre com uma conta administradora.';return;}
  const client=getSupabaseClient();
  if(!client||typeof client.rpc!=='function'){status.textContent='Cliente Supabase indisponível nesta página.';return;}
  button.disabled=true;button.textContent='Verificando…';status.textContent='Consultando funções de diagnóstico…';
  const started=Date.now();
  try{
   const [settingsResult,healthResult]=await Promise.all([
    client.rpc('get_rabbitech_public_settings'),
    client.rpc('admin_rabbitech_system_health')
   ]);
   const elapsed=Date.now()-started;
   const settings=settingsResult?.data?(Array.isArray(settingsResult.data)?settingsResult.data[0]:settingsResult.data):null;
   const health=healthResult?.data?(Array.isArray(healthResult.data)?healthResult.data[0]:healthResult.data):null;
   const items=[
    ['Supabase / configurações públicas',settingsResult?.error?'Falhou':(settings?'Conectado':'Sem dados'),!settingsResult?.error&&!!settings],
    ['RPC de saúde administrativa',healthResult?.error?'Falhou':(health?'Respondendo':'Sem dados'),!healthResult?.error&&!!health],
    ['Tempo das verificações',elapsed+' ms',true]
   ];
   if(health){
    items.push(
     ['Equipes',health.teams_count??'Não informado',true],
     ['Rodadas',health.rounds_count??'Não informado',true],
     ['Rodadas órfãs',health.orphan_rounds??'Não informado',Number(health.orphan_rounds||0)===0],
     ['Nomes de equipes duplicados',health.duplicate_team_names??'Não informado',Number(health.duplicate_team_names||0)===0],
     ['Erros SQL nas últimas 24 h',health.recent_sql_errors_24h??'Não informado',Number(health.recent_sql_errors_24h||0)===0],
     ['Proprietário registrado',health.owner_registered===true?'Sim':'Não',health.owner_registered===true],
     ['Modo de manutenção',health.maintenance_mode===true?'Ativado':'Desativado',true],
     ['Módulo de avisos',health.notice_module_enabled===true?'Ativado':'Desativado',health.notice_module_enabled===true]
    );
   }
   renderHealthResults(results,items);
   const failures=items.filter(item=>item[2]===false).length;
   status.textContent=failures?'Verificação concluída com '+failures+' item(ns) que precisam de atenção.':'Verificação concluída; confira os indicadores antes de tomar medidas.';
   if(settingsResult?.error)console.warn('Rabbitech public settings health check failed',settingsResult.error);
   if(healthResult?.error)console.warn('Rabbitech admin health check failed',healthResult.error);
  }catch(error){
   status.textContent='Falha ao executar diagnóstico. Confira a conexão e as permissões da conta.';
   console.warn('Rabbitech system diagnostics failed',error);
  }finally{
   button.disabled=false;button.textContent='Executar novamente';
  }
 }

 function init(){
  setupDock();placeLanguageButton();syncAdmin();setupDiagnosticsPanel();loadPublicSettings();
  const observer=new MutationObserver(()=>{
   setupDock();placeLanguageButton();syncAdmin();setupDiagnosticsPanel();
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