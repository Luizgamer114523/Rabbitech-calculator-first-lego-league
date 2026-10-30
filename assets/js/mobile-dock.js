/* Rabbitech mobile dock + admin visibility. Single controller, idempotent setup. */
(()=>{'use strict';
 // Prevent duplicate event handlers and Supabase subscriptions if the bundle is included twice.
 if(window.__rbMobileDockSingleton)return;
 window.__rbMobileDockSingleton=true;
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
  nav.querySelectorAll('#rbDockMore,#rbDockExpand,#rbDockExpandOne,#rbFinalDockMore').forEach(button=>button.remove());
  nav.classList.remove('rb-dock-collapsed');
  delete nav.dataset.rbDockController;
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
   lastFeatureFlags=flags;
   const noticeActive=typeof settings.display_notice_active==='boolean'?settings.display_notice_active:settings.notice_active===true;
   const noticeText=typeof settings.display_notice_text==='string'?settings.display_notice_text:(settings.notice_text||'');
   const noticeType=typeof settings.display_notice_type==='string'?settings.display_notice_type:(settings.notice_type||'info');
   lastNoticeActive=noticeActive;
   applyFeatureFlags(flags,noticeActive,{text:noticeText,type:noticeType});
  }catch(error){console.warn('Rabbitech feature flags could not be refreshed',error)}
 }
 let settingsRealtimeChannel=null,settingsRealtimeStatus='CLOSED';
 function setupSiteSettingsRealtime(){
  const client=getSupabaseClient();
  if(!client?.channel)return;
  if(settingsRealtimeChannel&&settingsRealtimeStatus==='SUBSCRIBED')return;
  if(settingsRealtimeChannel){try{client.removeChannel(settingsRealtimeChannel)}catch(_){}settingsRealtimeChannel=null}
  settingsRealtimeStatus='CONNECTING';
  // Public channel carries only an invalidation signal, never the settings payload.
  // The client then reads the public RPC, so table RLS and private columns stay protected.
  settingsRealtimeChannel=client.channel('public:site-settings')
   .on('broadcast',{event:'site_settings_updated'},()=>loadPublicSettings())
   .subscribe(status=>{
    settingsRealtimeStatus=status;
    if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')console.warn('Atualização em tempo real dos avisos indisponível; será tentada novamente.');
   });
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
  const noticesEnabled=flags.global_notices!==false&&noticeActive===true&&String(notice.text||'').trim().length>0;
  document.querySelectorAll('[id*="globalNotice" i],[class*="global-notice" i],[data-global-notice]').forEach(element=>{
   if(element.closest('#page-admin'))return;
   element.hidden=!noticesEnabled;
   element.classList.toggle('hidden',!noticesEnabled);
   const type=['info','success','warning'].includes(notice.type)?notice.type:'info';
   element.dataset.noticeType=type;
   element.classList.remove('rb-notice-info','rb-notice-success','rb-notice-warning');
   element.classList.add('rb-notice-'+type);
   if(!noticesEnabled)element.setAttribute('aria-hidden','true');
   else element.removeAttribute('aria-hidden');
   if(element.id==='rbGlobalNotice')element.setAttribute('role',type==='warning'?'alert':'status');
  });
  document.querySelectorAll('[data-global-notice-text],[data-global-notice-message],#rbGlobalNoticeText,#rbGlobalNoticeMessage,.global-notice-text,.global-notice-message').forEach(element=>{
   if(!element.closest('#page-admin')&&typeof notice.text==='string'&&element.textContent!==notice.text)element.textContent=notice.text;
  });
  document.querySelectorAll('[data-feature-flag]').forEach(element=>{
   const enabled=flags[element.getAttribute('data-feature-flag')]!==false;
   if(element.closest('#page-admin'))return;
   element.hidden=!enabled;
  });
 }

 // Team workspace: leader/member portal backed by Supabase RLS and RPCs.
 const TEAM_STATES=['todo','in_progress','done'];
 const TEAM_LABELS={todo:'A fazer',in_progress:'Em andamento',done:'Concluído'};
 let teamState={profile:null,team:null,authUserId:null,loading:false,refreshing:false,inviteCode:'',timer:null,realtimeChannel:null,realtimeTeamId:null,realtimeReady:false,messageSignature:'',notesSignature:'',backgroundRefreshInFlight:false,backgroundRefreshQueued:false,sendingMessage:false};
 const teamEsc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const teamClient=()=>getSupabaseClient();
 function ensureTeamPage(){
  const nav=document.querySelector('nav.rb-samsung-dock')||document.querySelector('nav button[data-page]')?.closest('nav');
  if(!nav)return null;
  nav.classList.add('rb-samsung-dock');
  let button=nav.querySelector('button[data-page="team-workspace"]');
  if(!button){
   button=document.createElement('button');
   button.type='button';
   button.dataset.page='team-workspace';
   nav.append(button);
  }
  // Keep "Equipe" among the normal workspace tabs, not after Admin/off-screen.
  // Keep the team entry beside Admin, where it is discoverable on narrow phone docks.
  const anchor=nav.querySelector('button[data-page="admin"]')||nav.querySelector('button[data-page="strategy"]')||nav.querySelector('button[data-page="leaderboard"]');
  if(anchor&&anchor.nextElementSibling!==button)anchor.insertAdjacentElement('afterend',button);
  if(!button.querySelector('.dock-label')){
   button.innerHTML='<span class="dock-icon" aria-hidden="true">👥</span><span class="dock-label">Equipe</span>';
  }
  button.id='rbTeamWorkspaceNav';
  button.hidden=false;
  button.removeAttribute('hidden');
  button.removeAttribute('aria-hidden');
  button.style.removeProperty('display');
  button.title='Espaço da equipe';
  button.setAttribute('aria-label','Área da equipe');
  if(button.dataset.rbTeamHandler!=='true'){
   button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();openTeamPage()});
   button.dataset.rbTeamHandler='true';
  }
  let page=$('page-team-workspace');
  if(!page){
   const main=document.querySelector('main')||document.body;
   page=document.createElement('section');
   page.id='page-team-workspace';
   page.className='page';
   page.hidden=true;
   page.style.cssText='max-width:1100px;margin:0 auto;padding:18px 14px 110px;color:var(--text,#eef7eb)';
   page.innerHTML='<div id="rbTeamWorkspaceRoot"></div>';
   main.append(page);
  }
  const root=$('rbTeamWorkspaceRoot');
  if(root&&root.dataset.deleteHandler!=='true'){
   root.addEventListener('click',event=>{
    const button=event.target.closest('[data-team-delete]');
    if(!button||!root.contains(button))return;
    event.preventDefault();
    deleteTeamContent(button.dataset.teamDelete,button.dataset.recordId,button);
   });
   root.dataset.deleteHandler='true';
  }
  return {button,page};
 }
 function teamClientUser(){
  const u=currentUser();
  if(u&&u.id)return u;
  return null;
 }
 async function teamAuthUser(){
  const u=teamClientUser();if(u)return u;
  const c=teamClient();
  try{const r=await c?.auth?.getUser?.();return r?.data?.user||null}catch(_){return null}
 }
 async function openTeamPage(){
  const refs=ensureTeamPage();if(!refs)return;
  const wasAlreadyActive=!refs.page.hidden&&refs.page.classList.contains('active');
  document.querySelectorAll('main .page').forEach(p=>{
   p.classList.remove('active');
   p.hidden=true;
   p.style.removeProperty('display');
  });
  refs.page.hidden=false;
  refs.page.style.removeProperty('display');
  refs.page.classList.add('active');
  refs.page.setAttribute('aria-hidden','false');
  document.querySelectorAll('nav button[data-page]').forEach(btn=>{
   const active=btn.dataset.page==='team-workspace';
   btn.classList.toggle('active',active);
   if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
  });
  const root=$('rbTeamWorkspaceRoot');
  // Do not reconstruct the entry form when a user taps Equipe again while it is open.
  // For existing teams, update server data in place without replacing the visible DOM.
  if(wasAlreadyActive&&root?.dataset.initialized==='true'){
   if(teamState.team?.team_id)refreshTeamBackground();
   return;
  }
  const scrollToTeam=()=>{if(!refs.page.hidden&&refs.page.classList.contains('active')){const top=Math.max(0,window.scrollY+refs.page.getBoundingClientRect().top-12);window.scrollTo({top,behavior:'auto'})}};
  scrollToTeam();
  // The page may have been opened before Google sign-in finished. Do not keep
  // the anonymous/loading screen cached after the auth state changes.
  const signedIn=!!teamClientUser();
  if(root?.dataset.initialized==='true'&&teamState.team?.team_id){
   refreshTeamBackground();
   return;
  }
  if(root?.dataset.initialized==='true'&&!signedIn)return;
  await renderTeamWorkspace();
  if(root)root.dataset.initialized='true';
  requestAnimationFrame(scrollToTeam);
 }
 function teamShell(body){
  const root=$('rbTeamWorkspaceRoot');if(!root)return;
  const preserveScroll=root.dataset.initialized==='true'&&$('page-team-workspace')?.classList.contains('active');
  const scrollY=window.scrollY;
  const active=document.activeElement;
  const activeId=active&&root.contains(active)?active.id:'';
  // Preserve every in-progress field if a foreground action must redraw the view.
  // Previously only the focused field survived, so the rest of a form could vanish.
  const savedFields=new Map([...root.querySelectorAll('input[id],textarea[id],select[id]')].map(el=>[el.id,{
   value:el.value,checked:'checked' in el?el.checked:undefined,
   selectionStart:typeof el.selectionStart==='number'?el.selectionStart:null,
   selectionEnd:typeof el.selectionEnd==='number'?el.selectionEnd:null
  }]));
  root.innerHTML='<style>'+
   '#rbTeamWorkspaceRoot .tw-card{background:rgba(12,29,18,.92);border:1px solid #34543a;border-radius:16px;padding:16px;margin:12px 0;min-width:0}'+
   '#rbTeamWorkspaceRoot .tw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:12px}'+
   '#rbTeamWorkspaceRoot .tw-field{box-sizing:border-box;width:100%;padding:10px 11px;margin:5px 0;border-radius:9px;border:1px solid #49684b;background:#07120b;color:#f1faef;font:inherit}'+
   '#rbTeamWorkspaceRoot .tw-btn{padding:10px 13px;margin:4px 4px 4px 0;border-radius:9px;border:1px solid #789b5b;background:#1a3521;color:#f4ffe9;font:inherit;font-weight:700;cursor:pointer}'+
   '#rbTeamWorkspaceRoot .tw-btn:disabled{opacity:.5}'+
   '#rbTeamWorkspaceRoot .tw-muted{opacity:.76;font-size:.9rem}'+
   '#rbTeamWorkspaceRoot .tw-board{display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:10px;overflow-x:auto;padding-bottom:8px}'+
   '#rbTeamWorkspaceRoot .tw-task{background:#0c1b11;border:1px solid #35533a;border-radius:12px;padding:11px;margin:8px 0;overflow-wrap:anywhere}'+
   '#rbTeamWorkspaceRoot .tw-bubble{padding:9px 12px;border-radius:12px;background:#102319;margin:7px 0;overflow-wrap:anywhere}'+
   '#rbTeamWorkspaceRoot .tw-chat-media{display:block;width:100%;max-width:520px;max-height:320px;margin:8px 0;border-radius:10px}'+
   '#rbTeamWorkspaceRoot .tw-chat-upload-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:8px;margin:10px 0}'+
   '#rbTeamWorkspaceRoot .tw-chat-upload{display:flex;flex-direction:column;gap:6px;min-width:0}'+
   '#rbTeamWorkspaceRoot .tw-chat-record-row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}'+
   '#rbTeamWorkspaceRoot [aria-pressed="true"]{background:#d0f477;color:#102014;border-color:#d0f477}'+
   '#rbTeamWorkspaceRoot .tw-stat{font-size:1.65rem;font-weight:800;color:#d0f477}'+
   '@media(max-width:650px){#rbTeamWorkspaceRoot .tw-board{grid-template-columns:repeat(3,minmax(205px,1fr))}}'+
   '</style>'+body;
  savedFields.forEach((saved,id)=>{const el=$(id);if(!el)return;if('value' in el)el.value=saved.value;if(saved.checked!==undefined&&'checked' in el)el.checked=saved.checked});
  if(activeId){const restored=$(activeId);if(restored){restored.focus({preventScroll:true});const saved=savedFields.get(activeId);if(saved&&saved.selectionStart!==null&&typeof restored.setSelectionRange==='function'){try{restored.setSelectionRange(saved.selectionStart,saved.selectionEnd)}catch(_){}}}}
  if(preserveScroll)requestAnimationFrame(()=>{if($('page-team-workspace')?.classList.contains('active'))window.scrollTo({top:scrollY,behavior:'auto'})});
 }
 function teamMissionPicker(){const labels=[];document.querySelectorAll('#page-score [data-mission-id],#page-score [data-mission],#page-score .mission-card,#page-score .mission-item').forEach(el=>{const text=(el.querySelector('h2,h3,h4,label,strong,.mission-title')?.textContent||el.getAttribute('data-mission-name')||el.textContent||'').trim().replace(/\\s+/g,' ');if(/M(?:iss[aã]o)?\\s*0?\\d{1,2}/i.test(text)&&!labels.includes(text))labels.push(text.slice(0,100))});if(!labels.length)for(let i=1;i<=15;i++)labels.push('M'+String(i).padStart(2,'0'));return '<fieldset style="border:1px solid #49684b;border-radius:10px;padding:10px;margin:7px 0"><legend>Missões tentadas</legend>'+labels.map(name=>'<label style="display:block;margin:5px 0"><input type="checkbox" name="twRoundMission" value="'+teamEsc(name)+'"> '+teamEsc(name)+'</label>').join('')+'</fieldset>'}
  function teamFormField(id,label,placeholder,type='text',attrs=''){
  return '<label style="display:block;margin:7px 0">'+teamEsc(label)+'<input class="tw-field" id="'+id+'" type="'+type+'" placeholder="'+teamEsc(placeholder)+'" '+attrs+'></label>';
 }
 async function renderTeamWorkspace(){
  const root=$('rbTeamWorkspaceRoot');if(!root)return;
  const c=teamClient(),user=await teamAuthUser();
  teamState.authUserId=user?.id||null;
  if(!c||!user){
   teamShell('<div class="tw-card"><h2>👥 Espaço da equipe</h2><p>Entre na sua conta do Rabbitech para criar uma equipe ou aceitar um convite.</p></div>');return;
  }
  if(root.dataset.initialized!=='true')
  teamShell('<div class="tw-card"><h2>👥 Espaço da equipe</h2><p>Carregando sua equipe com segurança…</p></div>');
  let result;
  try{result=await c.rpc('get_my_team_workspace')}catch(e){teamShell('<div class="tw-card"><h2>Espaço da equipe</h2><p>Não foi possível consultar sua equipe: '+teamEsc(e.message||e)+'</p><button class="tw-btn" id="twRetry">Tentar novamente</button></div>');$('twRetry')?.addEventListener('click',renderTeamWorkspace);return}
  if(result?.error){teamShell('<div class="tw-card"><h2>Espaço da equipe</h2><p>O Supabase recusou a consulta. Verifique sua sessão e as permissões do projeto.</p><p class="tw-muted">'+teamEsc(result.error.message)+'</p><button class="tw-btn" id="twRetry">Tentar novamente</button></div>');$('twRetry')?.addEventListener('click',renderTeamWorkspace);return}
  const profile=Array.isArray(result.data)?result.data[0]:result.data;
  teamState.profile=profile||null;teamState.team=profile?.member?profile:null;
  if(!(profile?.member&&profile?.team_id)){
   teamShell('<div class="tw-card"><h2>Monte o espaço da sua equipe</h2><p>O mentor cria a equipe; depois compartilha o convite com os alunos. Cada pessoa entra usando a própria conta do Rabbitech.</p><div class="tw-grid"><section><h3>Criar equipe</h3>'+teamFormField('twTeamName','Nome da equipe','Ex.: Techscorpions')+teamFormField('twLeaderName','Seu nome','Nome do mentor')+'<button class="tw-btn" id="twCreate">Criar equipe</button></section><section><h3>Aceitar convite</h3>'+teamFormField('twInviteInput','Código de convite','Cole o código recebido')+teamFormField('twMemberName','Seu nome na equipe','Nome para os colegas')+'<button class="tw-btn" id="twStartInviteScanner">📷 Ler QR Code</button><div id="twInviteScanner" hidden style="margin:10px 0"><video id="twInviteVideo" playsinline muted style="width:100%;max-width:360px;border-radius:12px;background:#000"></video><p id="twScannerStatus" class="tw-muted">Aponte a câmera para o QR Code do convite.</p><button class="tw-btn" type="button" id="twStopInviteScanner">Fechar câmera</button></div><button class="tw-btn" id="twJoin">Entrar na equipe</button></section></div><p class="tw-muted">Uma conta só pode pertencer a uma equipe por vez. O acesso aos dados é protegido no banco, não apenas por esconder botões.</p><div id="twFeedback" aria-live="polite"></div></div>');
   $('twCreate')?.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();createTeamWorkspace()},true);
   // Capture this action before legacy inline handlers that reused the same IDs.
   // Otherwise an old handler can overwrite the real result with a false validation error.
   const joinButton=$('twJoin');
   if(joinButton&&joinButton.dataset.rbJoinCapture!=='true'){
    joinButton.dataset.rbJoinCapture='true';
    joinButton.addEventListener('click',event=>{
     event.preventDefault();event.stopImmediatePropagation();
     joinTeamWorkspace('twInviteInput','twMemberName','twFeedback');
    },true);
   }
   $('twStartInviteScanner')?.addEventListener('click',startTeamInviteScanner);
   $('twStopInviteScanner')?.addEventListener('click',stopTeamInviteScanner);
   return;
  }
  const teamId=profile.team_id;
  if(typeof teamId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(teamId)){
   teamState.team=null;
   teamShell('<div class="tw-card"><h2>Espaço da equipe</h2><p>O cadastro retornou um identificador de equipe inválido. Nenhuma consulta foi enviada ao banco.</p><p class="tw-muted">Saia e entre novamente na conta. Se continuar, o vínculo da equipe precisa ser reparado no Supabase.</p><button class="tw-btn" id="twRetry">Tentar novamente</button></div>');
   $('twRetry')?.addEventListener('click',renderTeamWorkspace);return;
  }
  if(!profile.team_name){
   const teamLookup=await c.from('teams').select('id,name').eq('id',teamId).maybeSingle();
   if(!teamLookup.error&&teamLookup.data?.name)profile.team_name=teamLookup.data.name;
  }
  let tasks=[],goals=[],notes=[],rounds=[],messages=[],members=[];
  const query=async(table,columns='*',order='created_at')=>{const r=await c.from(table).select(columns).eq('team_id',teamId).order(order,{ascending:true}).limit(250);if(r.error)throw r.error;return r.data||[]};
  try{
   [tasks,goals,notes,rounds,messages,members]=await Promise.all([
    query('team_tasks','*','created_at'),query('team_goals','*','created_at'),query('team_notes','*','created_at'),
    query('team_round_logs','*','performed_at'),query('team_messages','*','created_at'),query('team_memberships','id,team_id,user_id,display_name,role,created_at','created_at')
   ]);
  }catch(e){teamShell('<div class="tw-card"><h2>'+teamEsc(profile.team_name)+'</h2><p>Não foi possível carregar todos os dados da equipe. Confira as políticas RLS.</p><p class="tw-muted">'+teamEsc(e.message||e)+'</p><button class="tw-btn" id="twRetry">Recarregar</button></div>');$('twRetry')?.addEventListener('click',renderTeamWorkspace);return}
  teamState.members=members;
  setupTeamChatRealtime(teamId);
  const done=tasks.filter(t=>t.status==='done').length,progress=tasks.length?Math.round(done/tasks.length*100):0;
  const avg=rounds.length?Math.round(rounds.reduce((sum,r)=>sum+Number(r.score||0),0)/rounds.length):0;
  const recent=rounds.slice(-5),previous=rounds.slice(-10,-5);
  const avgOf=arr=>arr.length?arr.reduce((s,r)=>s+Number(r.score||0),0)/arr.length:0;
  const trend=recent.length&&previous.length?(avgOf(recent)-avgOf(previous)):null;
  const trendText=trend===null?'Ainda sem dados suficientes':trend>0?'Melhorando +' + Math.round(trend)+' pts':trend<0?'Caindo '+Math.round(trend)+' pts':'Estável';
  const manager=profile.is_manager===true||profile.role==='leader';
  const statusTasks=state=>tasks.filter(t=>t.status===state);
  const taskCard=t=>'<article class="tw-task" data-team-task-card="'+teamEsc(t.id)+'"><strong>'+teamEsc(t.title)+'</strong><p>'+teamEsc(t.description||'')+'</p><p class="tw-muted">Prioridade: '+teamEsc(t.priority)+' · '+(t.due_date?'Prazo '+teamEsc(t.due_date):'Sem prazo')+'</p><p class="tw-muted">Responsável: '+teamEsc(members.find(m=>m.user_id===t.assigned_to)?.display_name||'Equipe toda')+'</p><label class="tw-muted">Status <select class="tw-field" '+((manager||!t.assigned_to||t.assigned_to===profile.user_id)?'':'disabled')+' data-current-status="'+teamEsc(t.status||'todo')+'" data-task-status="'+teamEsc(t.id)+'">'+TEAM_STATES.map(s=>'<option value="'+s+'" '+(t.status===s?'selected':'')+'>'+TEAM_LABELS[s]+'</option>').join('')+'</select></label>'+(manager?'<button class="tw-btn" data-team-delete="team_tasks" data-record-id="'+teamEsc(t.id)+'">Excluir tarefa</button>':'')+'</article>';
  const taskColumns=TEAM_STATES.map(s=>'<section class="tw-card"><h3>'+TEAM_LABELS[s]+' ('+statusTasks(s).length+')</h3>'+statusTasks(s).map(taskCard).join('')+'</section>').join('');
  const memberOptions='<option value="">Equipe toda</option>'+members.map(m=>'<option value="'+teamEsc(m.user_id)+'">'+teamEsc(m.display_name)+(m.role==='leader'?' · mentor':'')+'</option>').join('');
  const goalHtml=goals.map(g=>{const taskPct=g.target_tasks?Math.min(100,Math.round(done/g.target_tasks*100)):0;const roundPct=g.target_rounds?Math.min(100,Math.round(rounds.length/g.target_rounds*100)):0;return '<div class="tw-task" data-goal-id="'+teamEsc(g.id)+'"><strong>'+teamEsc(g.title)+'</strong><p>'+teamEsc(g.description||'')+'</p><p>Tarefas: '+done+'/'+g.target_tasks+' ('+taskPct+'%)</p><progress max="100" value="'+taskPct+'" style="width:100%"></progress><p>Rounds registrados: '+rounds.length+'/'+g.target_rounds+' ('+roundPct+'%)</p><progress max="100" value="'+roundPct+'" style="width:100%"></progress><p>Meta de média: '+Number(g.target_average_score||0)+' pts · '+teamEsc(g.due_date||'Sem prazo')+'</p>'+(manager?'<button class="tw-btn" data-team-delete="team_goals" data-record-id="'+teamEsc(g.id)+'">Excluir meta</button>':'')+'</div>'}).join('');
  const chart=recent.length?'<div style="display:flex;align-items:end;gap:8px;height:140px;padding:8px 0">'+recent.map((r,i)=>'<div style="flex:1;min-width:24px;text-align:center"><div title="'+Number(r.score||0)+' pontos" style="height:'+Math.max(5,Math.round(Number(r.score||0)/Math.max(1,...recent.map(x=>Number(x.score||0)))*105))+'px;background:#9dcc65;border-radius:6px 6px 0 0"></div><small>'+teamEsc('R'+r.round_number)+'</small><br><strong>'+Number(r.score||0)+'</strong></div>').join('')+'</div>':'<p class="tw-muted">Registre os rounds abaixo para começar o gráfico de desempenho.</p>';
  teamShell('<div class="tw-card" style="display:flex;gap:8px;flex-wrap:wrap;padding:10px"><button class="tw-btn" type="button" id="twTabDashboard" aria-pressed="true">📋 Painel da equipe</button><button class="tw-btn" type="button" id="twTabChat" aria-pressed="false">💬 Chat da equipe</button></div><div id="twDashboardPanel"><div class="tw-card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><p class="tw-muted">ESPAÇO DA EQUIPE</p><h2>'+teamEsc(profile.team_name)+'</h2><p>Olá, '+teamEsc(profile.display_name)+' · '+(manager?'Mentor / responsável':'Membro')+'</p></div><div><button class="tw-btn" id="twRefresh">Atualizar</button><button class="tw-btn" id="twEnableNotifications">Ativar notificações</button></div></div><div class="tw-grid"><div class="tw-card"><div class="tw-stat">'+tasks.length+'</div><div>Tarefas criadas</div></div><div class="tw-card"><div class="tw-stat">'+done+'</div><div>Tarefas concluídas</div></div><div class="tw-card"><div class="tw-stat">'+progress+'%</div><div>Progresso das tarefas</div></div><div class="tw-card"><div class="tw-stat">'+avg+'</div><div>Média dos rounds · '+rounds.length+' registros</div></div></div><p><strong>Tendência:</strong> '+teamEsc(trendText)+'</p></div>'+
   (manager?'<div class="tw-card"><h3>Convidar membros</h3><p>Gere um código para compartilhar com os alunos. O código expira em 7 dias.</p><button class="tw-btn" id="twMakeInvite">Gerar convite</button><div id="twInviteResult" aria-live="polite"></div></div>':'')+
   (manager?'<div class="tw-card"><h3>Nova tarefa</h3><div class="tw-grid">'+teamFormField('twTaskTitle','Tarefa','Ex.: testar missão')+teamFormField('twTaskDue','Prazo','', 'date')+'</div><textarea class="tw-field" id="twTaskDescription" rows="2" maxlength="2000" placeholder="O que precisa ser feito?"></textarea><div class="tw-grid"><label>Prioridade<select class="tw-field" id="twTaskPriority"><option value="normal">Normal</option><option value="high">Alta</option><option value="low">Baixa</option></select></label><label>Atribuir a<select class="tw-field" id="twTaskAssignee">'+memberOptions+'</select></label></div><button class="tw-btn" id="twAddTask">Adicionar tarefa</button></div>':'')+
   '<div class="tw-card"><h3>Quadro Kanban</h3><p class="tw-muted">Mova tarefas entre A fazer, Em andamento e Concluído. O histórico de alterações fica salvo.</p><div class="tw-board">'+taskColumns+'</div></div>'+
   (manager?'<div class="tw-card"><h3>Metas da equipe</h3>'+teamFormField('twGoalTitle','Meta','Ex.: 10 rounds confiáveis')+teamFormField('twGoalDue','Prazo','', 'date')+'<div class="tw-grid"><label>Meta de tarefas<input class="tw-field" id="twGoalTasks" type="number" min="0" max="10000" value="0"></label><label>Meta de rounds<input class="tw-field" id="twGoalRounds" type="number" min="0" max="10000" value="0"></label><label>Média de pontos alvo<input class="tw-field" id="twGoalAverage" type="number" min="0" max="10000" value="0"></label></div><textarea class="tw-field" id="twGoalDescription" rows="2" maxlength="1000" placeholder="Descrição da meta"></textarea><button class="tw-btn" id="twAddGoal">Salvar meta</button></div>':'')+
   '<div class="tw-card"><h3>Metas e progresso</h3><div id="twGoalsList">'+(goalHtml||'<p class="tw-muted">O mentor ainda não cadastrou metas.</p>')+'</div></div>'+
   '<div class="tw-grid"><section class="tw-card"><h3>Registrar round de treino</h3>'+teamFormField('twRoundNumber','Número do round','1','number','min="1" max="10000"')+teamFormField('twRoundScore','Pontuação','0','number','min="0" max="10000"')+'<label style="display:block;margin:7px 0">Onde começou<select class="tw-field" id="twRoundStart"><option value="Base esquerda">Base esquerda</option><option value="Base direita">Base direita</option></select></label>'+teamMissionPicker()+'<textarea class="tw-field" id="twRoundNotes" rows="2" maxlength="2000" placeholder="Observações do round"></textarea><button class="tw-btn" id="twAddRound">Salvar round</button></section><section class="tw-card"><h3>Desempenho dos rounds</h3><p>Média atual: <strong id="twRoundsAverage">'+avg+' pontos</strong></p><div id="twRoundChart">'+chart+'</div><div style="margin-top:10px"><h4>Histórico de rounds</h4><div id="twRoundList">'+(rounds.slice().reverse().map(r=>'<article class="tw-task" data-round-id="'+teamEsc(r.id)+'"><strong>Round '+teamEsc(r.round_number)+'</strong><p>'+Number(r.score||0)+' pontos · '+teamEsc(r.start_position||'Início não informado')+'</p><p class="tw-muted">'+teamEsc(r.notes||'')+'</p>'+((manager||r.created_by===profile.user_id)?'<button class="tw-btn" data-team-delete="team_round_logs" data-record-id="'+teamEsc(r.id)+'">Excluir round</button>':'')+'</article>').join('')||'<p class="tw-muted">Nenhum round registrado.</p>')+'</div></div><p id="twRoundCountFooter" class="tw-muted">'+rounds.length+' rounds de treino registrados.</p></section></div>'+
   '<div class="tw-grid"><section class="tw-card"><h3>Notas compartilhadas</h3>'+teamFormField('twNoteTitle','Título da nota','Ideias da reunião')+'<textarea class="tw-field" id="twNoteBody" rows="4" maxlength="8000" placeholder="Planejamento, decisões, o que testar..."></textarea><button class="tw-btn" id="twAddNote">Salvar anotação</button><div id="twNotesList">'+(notes.slice().reverse().map(n=>'<article class="tw-task" data-team-note-id="'+teamEsc(n.id)+'"><strong>'+teamEsc(n.title)+'</strong><p style="white-space:pre-wrap">'+teamEsc(n.body)+'</p><small class="tw-muted">'+teamEsc(new Date(n.created_at).toLocaleString())+' · '+teamEsc(members.find(m=>m.user_id===n.author_user_id)?.display_name||'Membro')+'</small>'+((manager||n.author_user_id===profile.user_id)?'<button class="tw-btn" data-team-delete="team_notes" data-record-id="'+teamEsc(n.id)+'">Excluir anotação</button>':'')+'</article>').join('')||'<p class="tw-muted">Nenhuma anotação ainda.</p>')+'</div></section>'+
   '</div><div id="twChatPanel" hidden><section class="tw-card"><h3>Chat da equipe</h3><p class="tw-muted">Conversa privada desta equipe. Envie mensagens, documentos, códigos, PDFs, imagens, áudio e vídeos.</p><div id="twMessages" style="max-height:360px;overflow:auto;overscroll-behavior:contain">'+messages.slice(-60).map(m=>'<div class="tw-bubble" data-message-id="'+teamEsc(m.id)+'" data-created-at="'+teamEsc(m.created_at)+'"><strong>'+teamEsc(members.find(x=>x.user_id===m.author_user_id)?.display_name||'Membro')+'</strong>'+(m.body?'<p style="white-space:pre-wrap;margin:4px 0">'+teamEsc(m.body)+'</p>':'')+(m.media_path&&m.media_type==='file'?'<p class="tw-muted">📎 '+teamEsc(m.media_name||'Arquivo anexado')+'</p>':'')+'<small class="tw-muted">'+teamEsc(new Date(m.created_at).toLocaleString())+'</small>'+((manager||m.author_user_id===profile.user_id)?'<button class="tw-btn" data-team-delete="team_messages" data-record-id="'+teamEsc(m.id)+'">Apagar mensagem</button>':'')+'</div>').join('')+'</div><textarea class="tw-field" id="twMessageBody" rows="2" maxlength="2000" placeholder="Escreva para a equipe..."></textarea><button class="tw-btn" id="twSendMessage">Enviar mensagem</button><div class="tw-chat-upload-grid"><div class="tw-chat-upload"><button class="tw-btn" type="button" id="twChooseAudio">🎧 Enviar áudio</button><input class="tw-field" id="twAudioFile" type="file" accept="audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,.mp3,.m4a,.ogg,.wav,.webm" hidden></div><div class="tw-chat-upload"><button class="tw-btn" type="button" id="twChooseVideo">🎬 Enviar vídeo</button><input class="tw-field" id="twVideoFile" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v" hidden></div><div class="tw-chat-upload"><button class="tw-btn" type="button" id="twChooseFile">📎 Anexar arquivo</button><input class="tw-field" id="twAnyFile" type="file" hidden></div></div><div class="tw-chat-record-row"><button class="tw-btn" type="button" id="twRecordAudio">🎙️ Gravar áudio</button><button class="tw-btn" type="button" id="twStopAudio" disabled>Parar gravação e enviar</button></div><p class="tw-muted" id="twMediaFeedback" role="status" aria-live="polite">Arquivos de até 25 MB por envio. O acesso é limitado aos membros desta equipe.</p></section></div>'+
   '<div id="twFeedback" aria-live="polite"></div>');
  const dashboardPanel=$('twDashboardPanel'),chatPanel=$('twChatPanel');
  const showTeamTab=tab=>{
   const chat=tab==='chat';
   if(dashboardPanel)dashboardPanel.hidden=chat;
   if(chatPanel)chatPanel.hidden=!chat;
   const dashboardButton=$('twTabDashboard'),chatButton=$('twTabChat');
   if(dashboardButton)dashboardButton.setAttribute('aria-pressed',String(!chat));
   if(chatButton)chatButton.setAttribute('aria-pressed',String(chat));
   if(chat){const box=$('twMessages');if(box)box.scrollTop=box.scrollHeight}
  };
  $('twTabDashboard')?.addEventListener('click',()=>showTeamTab('dashboard'));
  $('twTabChat')?.addEventListener('click',()=>showTeamTab('chat'));
  $('twRefresh')?.addEventListener('click',()=>{refreshTeamBackground();teamFeedback('Atualizando os dados em segundo plano…')});
  $('twEnableNotifications')?.addEventListener('click',requestTeamNotifications);
  $('twMakeInvite')?.addEventListener('click',createTeamInvite);
  $('twStartInviteScanner')?.addEventListener('click',startTeamInviteScanner);
  $('twStopInviteScanner')?.addEventListener('click',stopTeamInviteScanner);
  $('twAddTask')?.addEventListener('click',createTeamTask);
  $('twAddGoal')?.addEventListener('click',createTeamGoal);
  $('twAddRound')?.addEventListener('click',createTeamRound);
  $('twAddNote')?.addEventListener('click',createTeamNote);
  $('twSendMessage')?.addEventListener('click',sendTeamMessage);
  $('twChooseAudio')?.addEventListener('click',()=> $('twAudioFile')?.click());
  $('twChooseVideo')?.addEventListener('click',()=> $('twVideoFile')?.click());
  $('twChooseFile')?.addEventListener('click',()=> $('twAnyFile')?.click());
  $('twAnyFile')?.addEventListener('change',event=>sendTeamChatMedia(event.target.files?.[0],'file'));
  $('twAudioFile')?.addEventListener('change',event=>sendTeamChatMedia(event.target.files?.[0],'audio'));
  $('twVideoFile')?.addEventListener('change',event=>sendTeamChatMedia(event.target.files?.[0],'video'));
  setupTeamAudioRecorder();
  messages.slice(-60).filter(message=>message.media_path).forEach(message=>{
   const bubble=[...document.querySelectorAll('#twMessages [data-message-id]')].find(el=>el.dataset.messageId===String(message.id));
   if(bubble)loadTeamMessageMedia(message,bubble);
  });
  document.querySelectorAll('#rbTeamWorkspaceRoot [data-task-status]').forEach(sel=>{if(sel.dataset.rbStatusHandler==='true')return;sel.dataset.rbStatusHandler='true';sel.addEventListener('change',()=>changeTeamTaskStatus(sel.dataset.taskStatus,sel.value))});
 }
 async function deleteTeamContent(table,id,button){
  const allowed=['team_tasks','team_goals','team_notes','team_messages','team_round_logs'];
  if(!allowed.includes(table)||!id)return;
  const label={team_tasks:'tarefa',team_goals:'meta',team_notes:'anotação',team_messages:'mensagem',team_round_logs:'registro de round'}[table];
  if(!window.confirm('Apagar '+label+'? Essa ação não pode ser desfeita.'))return;
  if(button)button.disabled=true;
  try{
   const result=await teamClient().from(table).delete().eq('id',id).select('id');
   if(result.error)throw result.error;
   if(!result.data?.length)throw new Error('O banco não confirmou a exclusão. Verifique suas permissões.');
   const selectors={team_tasks:'[data-team-task-card]',team_goals:'[data-goal-id]',team_notes:'[data-team-note-id]',team_messages:'[data-message-id]',team_round_logs:'[data-round-id]'};
   const card=[...document.querySelectorAll('#rbTeamWorkspaceRoot '+selectors[table])].find(el=>Object.values(el.dataset).includes(id));
   card?.remove();teamFeedback('Excluído com sucesso.');refreshTeamBackground();
  }catch(e){teamFeedback('Não foi possível apagar: '+(e?.message||'verifique as permissões.'),true);if(button)button.disabled=false}
 }
 async function requestTeamNotifications(){
  if(!('Notification' in window)||!window.isSecureContext){
   teamFeedback('Este navegador não permite notificações do sistema nesta janela. O chat e o quadro continuam atualizando em tempo real enquanto o site estiver aberto. Para alertas fora do site, abra o Rabbitech em um navegador compatível por HTTPS e permita notificações nas configurações do site.',true);
   return;
  }
  try{
   const permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;
   if(permission==='granted'){
    teamFeedback('Notificações do navegador ativadas neste dispositivo enquanto o navegador permitir alertas.');
    try{new Notification('Rabbitech',{body:'As notificações da equipe estão ativadas.'})}catch(_){}
   }else if(permission==='denied'){
    teamFeedback('O navegador bloqueou as notificações. Abra as configurações do site neste celular e permita notificações.',true);
   }else{
    teamFeedback('A permissão não foi concedida. O chat continua atualizando em tempo real com o site aberto.',true);
   }
  }catch(_){teamFeedback('Não foi possível ativar notificações do sistema neste navegador. O chat continua atualizando em tempo real com o site aberto.',true)}
 }
 function notifyTeamMessage(message){
  const userId=teamState.profile?.user_id;
  if(!message||!userId||message.author_user_id===userId)return;
  const pageActive=!document.hidden&&$('page-team-workspace')?.classList.contains('active');
  if(pageActive)return;
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  try{
   const notice=new Notification('Nova mensagem na equipe',{body:String(message.body||'Você recebeu uma mensagem').slice(0,180),tag:'rabbitech-message-'+message.id});
   notice.onclick=()=>{window.focus();openTeamPage();notice.close()};
  }catch(_){}
 }
 function notifyAssignedTeamTask(task){
  const user=teamState.profile?.user_id;
  if(!task||!user||task.assigned_to!==user||task.created_by===user||!('Notification' in window)||Notification.permission!=='granted')return;
  try{const notice=new Notification('Nova tarefa no Rabbitech',{body:String(task.title||'Uma tarefa foi atribuída a você'),tag:'rabbitech-task-'+task.id});notice.onclick=()=>{window.focus();openTeamPage();notice.close()}}catch(_){}
 }
 function teamFeedback(message,error=false){
  const el=$('twFeedback')||$('twMessage');if(el)el.innerHTML='<p style="color:'+(error?'#ffb4a9':'#d0f477')+'">'+teamEsc(message)+'</p>';
 }
 async function teamWrite(operation,{rerender=false}={}){
  const c=teamClient();if(!c){teamFeedback('A conexão com o Supabase não está disponível.',true);return null}
  try{
   const r=await operation(c);if(r?.error)throw r.error;
   teamFeedback('Salvo com sucesso.');
   if(rerender)await renderTeamWorkspace();else refreshTeamBackground();
   return r?.data??r;
  }catch(e){teamFeedback(e?.message||'Não foi possível salvar. Confira a conexão e as permissões.',true);return null}
 }
 async function createTeamWorkspace(){
  const name=$('twTeamName')?.value.trim(),display=$('twLeaderName')?.value.trim();if(!name||!display){teamFeedback('Preencha o nome da equipe e o seu nome.',true);return}
  await teamWrite(c=>c.rpc('create_team_workspace',{p_name:name,p_display_name:display}),{rerender:true});
 }
 async function joinTeamWorkspace(codeInput='twInviteInput',nameInput='twMemberName',feedbackId='twFeedback'){
  // Invite codes are case-insensitive hashes; ignore pasted whitespace/newlines.
  const code=String($(codeInput)?.value||'').replace(/\s+/g,'').toLowerCase(),display=$(nameInput)?.value.trim();
  const feedback=$(feedbackId);
  const say=(message,error=false)=>{if(feedback)feedback.innerHTML='<p style="color:'+(error?'#ffb4a9':'#d0f477')+'">'+teamEsc(message)+'</p>';else teamFeedback(message,error)};
  if(!code||!display){say('Informe o código do convite e seu nome.',true);return}
  const c=teamClient();if(!c){say('A conexão com o Supabase não está disponível.',true);return}
  try{
   const r=await c.rpc('join_team_with_code',{p_code:code,p_display_name:display});
   if(r?.error)throw r.error;
   const data=Array.isArray(r.data)?r.data[0]:r.data;
   if(data?.already_member){
    const currentTeamName=data.team_name||'equipe atual';
    await renderTeamWorkspace();
    const root=$('rbTeamWorkspaceRoot');if(root)root.dataset.initialized='true';
    teamFeedback('Esta conta já está vinculada à equipe '+currentTeamName+'. Abri o espaço que já pertence a esta conta. Cada conta só pode participar de uma equipe por vez; para entrar em outra, é preciso resolver o vínculo anterior.',false);
    return;
   }
   if(!data?.joined&&!data?.team_id)throw new Error('O servidor não confirmou a entrada na equipe. Gere um novo convite e tente novamente.');
   say(data?.already_member?'Esta conta já faz parte da equipe '+(data?.team_name||'atual')+'. Carregando o espaço da equipe.':'Convite aceito! Você entrou na equipe '+(data?.team_name||'com sucesso')+'.');
   await renderTeamWorkspace();
   const root=$('rbTeamWorkspaceRoot');if(root)root.dataset.initialized='true';
  }catch(e){say(e?.message||'Não foi possível aceitar o convite. Confira se o código está correto e ainda é válido.',true)}
 }
 let teamInviteQrLibraryPromise=null,teamInviteStream=null,teamInviteScanFrame=0,teamInviteScanActive=false;
 function loadTeamQrLibrary(){
  if(window.QRCode)return Promise.resolve(window.QRCode);
  if(teamInviteQrLibraryPromise)return teamInviteQrLibraryPromise;
  teamInviteQrLibraryPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
   script.async=true;
   script.onload=()=>window.QRCode?resolve(window.QRCode):reject(new Error('Biblioteca QR indisponível.'));
   script.onerror=()=>reject(new Error('Não foi possível carregar o gerador de QR Code.'));
   document.head.appendChild(script);
  });
  return teamInviteQrLibraryPromise;
 }
 async function renderTeamInviteQr(code){
  const box=$('twInviteQr'),status=$('twInviteQrStatus');if(!box)return;
  box.replaceChildren();
  try{
   const QR=await loadTeamQrLibrary();
   if(!$('twInviteQr'))return;
   new QR(box,{text:String(code),width:220,height:220,colorDark:'#102318',colorLight:'#ffffff',correctLevel:QR.CorrectLevel.M});
   if(status)status.textContent='QR Code pronto. O aluno pode escanear com a câmera dentro do Rabbitech.';
  }catch(e){if(status)status.textContent='Não foi possível gerar o QR Code agora. Compartilhe o código escrito acima.'}
 }
 function stopTeamInviteScanner(){
  teamInviteScanActive=false;
  if(teamInviteScanFrame)cancelAnimationFrame(teamInviteScanFrame);
  teamInviteScanFrame=0;
  if(teamInviteStream){teamInviteStream.getTracks().forEach(track=>track.stop());teamInviteStream=null}
  const video=$('twInviteVideo');if(video){try{video.pause();video.srcObject=null}catch(_){}}
  const box=$('twInviteScanner');if(box)box.hidden=true;
 }
 async function startTeamInviteScanner(){
  const box=$('twInviteScanner'),video=$('twInviteVideo'),status=$('twScannerStatus');
  if(!box||!video)return;
  if(!('BarcodeDetector' in window)){
   box.hidden=false;
   if(status)status.textContent='Este navegador não oferece leitura de QR integrada. Você ainda pode entrar usando o código escrito no campo acima.';
   return;
  }
  if(!navigator.mediaDevices?.getUserMedia){
   box.hidden=false;if(status)status.textContent='A câmera não está disponível neste navegador. Digite o código manualmente.';return;
  }
  try{
   const detector=new BarcodeDetector({formats:['qr_code']});
   teamInviteStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
   video.srcObject=teamInviteStream;box.hidden=false;teamInviteScanActive=true;
   await video.play();
   if(status)status.textContent='Aponte a câmera para o QR Code do convite.';
   const scan=async()=>{
    if(!teamInviteScanActive||!video.isConnected)return;
    try{
     if(video.readyState>=2){
      const codes=await detector.detect(video);
      if(codes?.length){
       let code=String(codes[0].rawValue||'').trim();
       try{const url=new URL(code);code=url.searchParams.get('invite')||url.searchParams.get('code')||code}catch(_){}
       if(code){
        const input=$('twInviteInput');if(input)input.value=code;
        stopTeamInviteScanner();
        teamFeedback('QR Code lido. Confira seu nome e toque em “Entrar na equipe”.');
        return;
       }
      }
     }
    }catch(_){}
    if(teamInviteScanActive)teamInviteScanFrame=requestAnimationFrame(scan);
   };
   teamInviteScanFrame=requestAnimationFrame(scan);
  }catch(e){
   stopTeamInviteScanner();box.hidden=false;
   if(status)status.textContent=e?.name==='NotAllowedError'?'Permita o acesso à câmera nas configurações do navegador e tente novamente.':'Não foi possível abrir a câmera. Você pode digitar o código manualmente.';
  }
 }
 async function createTeamInvite(){
  const t=teamState.team;if(!t?.team_id)return;
  const c=teamClient();try{const r=await c.rpc('create_team_invite',{p_team_id:t.team_id,p_expires_days:7,p_max_uses:20});if(r.error)throw r.error;const data=Array.isArray(r.data)?r.data[0]:r.data;teamState.inviteCode=data.code;const out=$('twInviteResult');if(out)out.innerHTML='<p>Convite criado. Compartilhe o código ou o QR Code com os membros:</p><code style="overflow-wrap:anywhere">'+teamEsc(data.code)+'</code><div id="twInviteQr" style="display:none;justify-content:center;align-items:center;min-height:16px;margin:12px 0;padding:12px;background:#fff;border-radius:12px"></div><p id="twInviteQrStatus" class="tw-muted" aria-live="polite">QR Code ainda não gerado.</p><p class="tw-muted">Expira em '+teamEsc(new Date(data.expires_at).toLocaleString())+'</p><button class="tw-btn" id="twGenerateInviteQr" type="button">Gerar QR Code</button> <button class="tw-btn" id="twDownloadInviteQr" type="button" disabled>Baixar QR Code</button> <button class="tw-btn" id="twCopyInvite">Copiar código</button>';const qrBox=$('twInviteQr');$('twGenerateInviteQr')?.addEventListener('click',async()=>{if(qrBox)qrBox.style.display='flex';await renderTeamInviteQr(data.code);const img=qrBox?.querySelector('img,canvas');const download=$('twDownloadInviteQr');if(download)download.disabled=!img});$('twDownloadInviteQr')?.addEventListener('click',()=>{const box=$('twInviteQr'),canvas=box?.querySelector('canvas'),img=box?.querySelector('img');let url='';if(canvas)url=canvas.toDataURL('image/png');else if(img?.src)url=img.src;if(!url){teamFeedback('Gere o QR Code antes de baixar.',true);return}const a=document.createElement('a');a.href=url;a.download='rabbitech-convite-qr.png';document.body.appendChild(a);a.click();a.remove()});$('twCopyInvite')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(data.code);$('twCopyInvite').textContent='Copiado'}catch(_){teamFeedback('Selecione e copie o código manualmente.')}})}catch(e){teamFeedback(e.message||'Não foi possível gerar o convite.',true)}
 }
 async function createTeamTask(){
  const c=teamClient(),t=teamState.team,title=$('twTaskTitle')?.value.trim();if(!title){teamFeedback('Informe o título da tarefa.',true);return}
  await teamWrite(client=>client.from('team_tasks').insert({team_id:t.team_id,title,description:$('twTaskDescription')?.value.trim()||'',priority:$('twTaskPriority')?.value||'normal',assigned_to:$('twTaskAssignee')?.value||null,due_date:$('twTaskDue')?.value||null,created_by:teamState.profile.user_id}));
 }
 async function changeTeamTaskStatus(id,status){
  if(!TEAM_STATES.includes(status))return;
  const select=document.querySelector('[data-task-status="'+CSS.escape(id)+'"]');
  const oldStatus=select?.dataset.currentStatus||'todo';
  if(select?.disabled){teamFeedback('Só a pessoa responsável ou a liderança da equipe pode alterar o status desta tarefa.',true);return}
  if(oldStatus===status)return;
  if(select)select.disabled=true;
  const c=teamClient();
  try{
   const r=await c.rpc('set_team_task_status',{p_task_id:id,p_status:status,p_note:''});
   if(r.error)throw r.error;
   const card=select?.closest('.tw-task');
   const columns=[...document.querySelectorAll('#rbTeamWorkspaceRoot .tw-board > .tw-card')];
   const target=columns.find(section=>section.querySelector('h3')?.textContent?.startsWith(TEAM_LABELS[status]+' ('));
   if(card&&target&&card.parentElement!==target)target.append(card);
   if(select){select.value=status;select.dataset.currentStatus=status;select.disabled=false}
   columns.forEach(section=>{
    const heading=section.querySelector('h3');if(!heading)return;
    const key=Object.keys(TEAM_LABELS).find(s=>heading.textContent.startsWith(TEAM_LABELS[s]+' ('));
    if(!key)return;
    const count=section.querySelectorAll('[data-task-status]').length;
    heading.textContent=TEAM_LABELS[key]+' ('+count+')';
   });
   teamFeedback('Tarefa atualizada.');
   refreshTeamBackground();
  }catch(e){
   teamFeedback(e.message||'Não foi possível atualizar a tarefa.',true);
   if(select){select.value=oldStatus;select.disabled=false}
  }
 }
 async function createTeamGoal(){
  const t=teamState.team,p=teamState.profile;const title=$('twGoalTitle')?.value.trim();if(!title){teamFeedback('Informe o nome da meta.',true);return}
  await teamWrite(c=>c.from('team_goals').insert({team_id:t.team_id,title,description:$('twGoalDescription')?.value.trim()||'',target_tasks:Number($('twGoalTasks')?.value||0),target_rounds:Number($('twGoalRounds')?.value||0),target_average_score:Number($('twGoalAverage')?.value||0),due_date:$('twGoalDue')?.value||null,created_by:p.user_id}));
 }
 async function createTeamRound(){
  const t=teamState.team,p=teamState.profile,roundNumber=Number($('twRoundNumber')?.value),score=Number($('twRoundScore')?.value||0);if(!Number.isInteger(roundNumber)||roundNumber<1||score<0){teamFeedback('Confira o número do round e a pontuação.',true);return}
  await teamWrite(c=>c.from('team_round_logs').insert({team_id:t.team_id,created_by:p.user_id,round_number:roundNumber,score,start_position:$('twRoundStart')?.value||'',missions:[...document.querySelectorAll('#rbTeamWorkspaceRoot input[name="twRoundMission"]:checked')].map(el=>el.value).join(', '),notes:$('twRoundNotes')?.value.trim()||''}));
 }
 async function createTeamNote(){
  const t=teamState.team,p=teamState.profile,titleInput=$('twNoteTitle'),bodyInput=$('twNoteBody'),title=titleInput?.value.trim(),body=bodyInput?.value.trim();
  if(!title||!body){teamFeedback('Preencha o título e o conteúdo da anotação.',true);return}
  const button=$('twAddNote');if(button)button.disabled=true;
  try{
   const result=await teamClient().from('team_notes').insert({team_id:t.team_id,author_user_id:p.user_id,title,body}).select('id,team_id,author_user_id,title,body,created_at').single();
   if(result.error)throw result.error;
   const note=result.data,box=$('twNotesList');
   if(box){
    const empty=box.querySelector('.tw-muted');if(empty&&empty.textContent.includes('Nenhuma anotação'))empty.remove();
    const article=document.createElement('article');article.className='tw-task';article.dataset.teamNoteId=note.id;
    const heading=document.createElement('strong');heading.textContent=note.title;
    const content=document.createElement('p');content.style.whiteSpace='pre-wrap';content.textContent=note.body;
    const meta=document.createElement('small');meta.className='tw-muted';meta.textContent=new Date(note.created_at).toLocaleString()+' · '+(p.display_name||'Membro');
    article.append(heading,content,meta);box.prepend(article);
   }
   if(titleInput)titleInput.value='';if(bodyInput)bodyInput.value='';
   teamFeedback('Anotação salva e exibida.');
   refreshTeamBackground();
  }catch(e){teamFeedback(e?.message||'Não foi possível salvar a anotação.',true)}
  finally{if(button)button.disabled=false}
 }
 async function refreshTeamMemberNames(teamId){
  const client=teamClient();if(!client||!teamId)return teamState.members||[];
  try{
   const result=await client.from('team_memberships').select('id,team_id,user_id,display_name,role,created_at').eq('team_id',teamId).order('created_at',{ascending:true}).limit(100);
   if(result.error)throw result.error;
   const members=result.data||[];
   if(members.length)teamState.members=members;
   return teamState.members||members;
  }catch(error){console.warn('Não foi possível atualizar os nomes dos membros',error);return teamState.members||[]}
 }
 async function resolveTeamMemberName(userId,teamId){
  if(!userId)return 'Membro';
  const cached=(teamState.members||[]).find(m=>String(m.user_id)===String(userId))?.display_name;
  if(cached&&String(cached).trim())return String(cached).trim();
  const members=await refreshTeamMemberNames(teamId||teamState.team?.team_id);
  const found=members.find(m=>String(m.user_id)===String(userId))?.display_name;
  return found&&String(found).trim()?String(found).trim():'Membro';
 }
 function appendTeamMessage(message,pending=false){
  const box=$('twMessages');if(!box)return null;
  if(!pending&&message.id){
   const existing=[...box.querySelectorAll('[data-message-id]')].find(el=>el.dataset.messageId===String(message.id));
   if(existing)return existing;
  }
  const cachedName=teamState.members?.find(m=>String(m.user_id)===String(message.author_user_id))?.display_name;
  const name=cachedName&&String(cachedName).trim()?String(cachedName).trim():(message.author_user_id===teamState.profile?.user_id?(teamState.profile?.display_name||'Membro'):'Membro');
  const bubble=document.createElement('div');bubble.className='tw-bubble';
  if(pending)bubble.dataset.pendingMessage='true';else if(message.id)bubble.dataset.messageId=String(message.id);
  const strong=document.createElement('strong');strong.textContent=name;
  if(!pending&&name==='Membro'&&message.author_user_id){resolveTeamMemberName(message.author_user_id,message.team_id).then(resolved=>{if(bubble.isConnected&&resolved&&resolved!=='Membro')strong.textContent=resolved})}
  bubble.append(strong);
  if(message.body){
   const body=document.createElement('p');body.style.cssText='white-space:pre-wrap;margin:4px 0';body.textContent=message.body;bubble.append(body);
  }
  const time=document.createElement('small');time.className='tw-muted';time.textContent=pending?'Enviando…':new Date(message.created_at).toLocaleString();
  bubble.append(time);
  if(message.media_path&&!pending)loadTeamMessageMedia(message,bubble);
  if(!pending&&(teamState.profile?.is_manager===true||teamState.profile?.role==='leader'||message.author_user_id===teamState.profile?.user_id)){
   const del=document.createElement('button');del.type='button';del.className='tw-btn';del.dataset.teamDelete='team_messages';del.dataset.recordId=String(message.id);del.textContent='Apagar mensagem';bubble.append(del);
  }
  box.appendChild(bubble);box.scrollTop=box.scrollHeight;return bubble;
 }
 const TEAM_CHAT_BUCKET='rabbitech-team-chat';
 const TEAM_CHAT_MAX_BYTES=25*1024*1024;
 const TEAM_CHAT_MIME_TYPES=new Set(['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','video/mp4','video/webm','video/quicktime']);
 async function loadTeamMessageMedia(message,bubble){
  if(!message?.media_path||!bubble||bubble.dataset.mediaLoaded==='true'||bubble.dataset.mediaLoading==='true')return;
  bubble.dataset.mediaLoading='true';
  try{
   const {data,error}=await teamClient().storage.from(TEAM_CHAT_BUCKET).createSignedUrl(message.media_path,3600);
   if(error)throw error;
   if(!data?.signedUrl)throw new Error('Link temporário indisponível.');
   const time=bubble.querySelector('small');
   if(message.media_type==='file'){
    const link=document.createElement('a');link.href=data.signedUrl;link.target='_blank';link.rel='noopener noreferrer';link.download=message.media_name||'arquivo';
    link.textContent='📎 '+(message.media_name||'Baixar arquivo');link.style.cssText='display:inline-block;margin:8px 0;color:#d0f477;font-weight:700;overflow-wrap:anywhere';
    if(time)bubble.insertBefore(link,time);else bubble.append(link);
   }else{
    const media=document.createElement(message.media_type==='video'?'video':'audio');
    media.className='tw-chat-media';media.controls=true;media.preload='metadata';media.src=data.signedUrl;
    if(message.media_type==='video')media.playsInline=true;
    if(time)bubble.insertBefore(media,time);else bubble.append(media);
   }
   if(message.media_name){
    const caption=document.createElement('small');caption.className='tw-muted';caption.textContent=message.media_name;
    if(time)bubble.insertBefore(caption,time);else bubble.append(caption);
   }
   bubble.dataset.mediaLoaded='true';
  }catch(error){
   bubble.dataset.mediaLoading='false';
   const notice=document.createElement('small');notice.className='tw-muted';notice.textContent='Mídia indisponível: '+String(error?.message||'não foi possível abrir.');
   bubble.append(notice);bubble.dataset.mediaLoaded='error';
  }
 }
 async function sendTeamChatMedia(file,mediaType){
  const status=$('twMediaFeedback'),audioInput=$('twAudioFile'),videoInput=$('twVideoFile'),anyFileInput=$('twAnyFile');
  const team=teamState.team,profile=teamState.profile,c=teamClient();
  const kind=mediaType==='audio'?'áudio':mediaType==='video'?'vídeo':'arquivo';
  const fail=message=>{if(status)status.textContent=message;teamFeedback(message,true)};
  if(!file){fail('Nenhum arquivo selecionado. Escolha um vídeo da galeria e tente novamente.');return}
  if(!team?.team_id||!profile?.user_id||!c){fail('Entre na equipe novamente antes de enviar mídia.');return}
  if(teamState.sendingMessage){fail('Aguarde o envio atual terminar.');return}
  const rawMime=String(file.type||'').toLowerCase().split(';')[0].trim();
  const rawExtension=String(file.name||'').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'');
  // Android file providers sometimes return an empty or generic MIME type.
  // Infer only known formats; never trust an arbitrary extension as a MIME type.
  const mimeByExtension={mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',mov:'video/quicktime',mp3:'audio/mpeg',m4a:'audio/mp4',ogg:'audio/ogg',wav:'audio/wav'};
  const mime=(!rawMime||rawMime==='application/octet-stream')?(mimeByExtension[rawExtension]||''):rawMime;
  if(mediaType==='audio'||mediaType==='video'){
   if(!TEAM_CHAT_MIME_TYPES.has(mime)||!(mediaType==='audio'?mime.startsWith('audio/'):mime.startsWith('video/'))){
    fail('Formato não aceito ('+(rawMime||'tipo não identificado')+'). Escolha um formato de áudio ou vídeo compatível.');return;
   }
  }else if(mediaType!=='file'){
   fail('Tipo de anexo inválido.');return;
  }
  if(file.size<=0||file.size>TEAM_CHAT_MAX_BYTES){
   fail(file.size>TEAM_CHAT_MAX_BYTES?'O vídeo ultrapassa o limite de 25 MB. Comprima ou reduza o arquivo antes de enviar.':'O arquivo está vazio.');return;
  }
  teamState.sendingMessage=true;
  if(status)status.textContent='Preparando '+kind+'…';
  ['twChooseAudio','twChooseVideo','twChooseFile','twRecordAudio','twSendMessage'].forEach(id=>{const b=$(id);if(b)b.disabled=true});
  const extensionByMime={'audio/webm':'webm','audio/ogg':'ogg','audio/mp4':'m4a','audio/mpeg':'mp3','audio/wav':'wav','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
  const extension=extensionByMime[mime]||String(file.name||'arquivo').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,12)||'bin';
  const fallbackName=(mediaType==='audio'?'audio-equipe.':mediaType==='video'?'video-equipe.':'anexo.')+extension;
  const safeName=String(file.name||fallbackName).replace(/[\\/\\\\]/g,'_').slice(0,180);
  const uuid=globalThis.crypto?.randomUUID?.()||(Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12));
  const path=team.team_id+'/'+profile.user_id+'/'+uuid+'.'+extension;
  let uploaded=false;
  try{
   if(status)status.textContent='Enviando '+kind+'… mantenha o Rabbitech aberto.';
   const {error:uploadError}=await c.storage.from(TEAM_CHAT_BUCKET).upload(path,file,{contentType:mime,upsert:false,cacheControl:'3600'});
   if(uploadError)throw uploadError;
   uploaded=true;
   if(status)status.textContent='Arquivo enviado. Publicando no chat…';
   const {data,error}=await c.from('team_messages').insert({
    team_id:team.team_id,author_user_id:profile.user_id,body:'',
    media_type:mediaType,media_path:path,media_name:safeName,
    media_mime:mime,media_size:file.size
   }).select('*').single();
   if(error)throw error;
   if(data)appendTeamMessage(data,false);
   if(status)status.textContent=(mediaType==='audio'?'Áudio':mediaType==='video'?'Vídeo':'Arquivo')+' enviado com sucesso.';
   if(audioInput)audioInput.value='';
   if(videoInput)videoInput.value='';
   if(anyFileInput)anyFileInput.value='';
  }catch(error){
   if(uploaded){try{await c.storage.from(TEAM_CHAT_BUCKET).remove([path])}catch(cleanupError){console.warn('Could not remove failed team media upload',cleanupError)}}
   const detail=String(error?.message||error||'erro desconhecido');
   fail('Falha ao enviar '+kind+': '+detail);
   console.warn('Rabbitech team media upload failed',error);
  }finally{
   teamState.sendingMessage=false;
   ['twChooseAudio','twChooseVideo','twRecordAudio','twSendMessage'].forEach(id=>{const b=$(id);if(b)b.disabled=false});
   if(status?.textContent?.startsWith('Falha')){if(mediaType==='video'&&videoInput)videoInput.value='';if(mediaType==='audio'&&audioInput)audioInput.value='';if(mediaType==='file'&&anyFileInput)anyFileInput.value=''}
  }
 }
 function setupTeamAudioRecorder(){
  const start=$('twRecordAudio'),stop=$('twStopAudio'),status=$('twMediaFeedback');
  if(!start||!stop||start.dataset.bound==='true')return;
  start.dataset.bound='true';
  let recorder=null,stream=null,chunks=[];
  start.addEventListener('click',async()=>{
   if(teamState.sendingMessage)return;
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
    if(status)status.textContent='Gravação não suportada neste navegador. Use “Enviar áudio” para escolher um arquivo.';return;
   }
   try{
    stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const types=['audio/webm;codecs=opus','audio/webm','audio/ogg','audio/mp4'];
    const mime=types.find(type=>MediaRecorder.isTypeSupported(type));
    recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);chunks=[];
    recorder.addEventListener('dataavailable',event=>{if(event.data?.size)chunks.push(event.data)});
    recorder.addEventListener('stop',async()=>{
     stream?.getTracks().forEach(track=>track.stop());stream=null;
     const blob=new Blob(chunks,{type:recorder?.mimeType||chunks[0]?.type||'audio/webm'});
     const normalized=String(blob.type||'audio/webm').split(';')[0].toLowerCase();
     const ext=({'audio/webm':'webm','audio/ogg':'ogg','audio/mp4':'m4a'})[normalized]||'webm';
     const file=new File([blob],'audio-equipe-'+Date.now()+'.'+ext,{type:normalized});
     start.disabled=false;stop.disabled=true;
     await sendTeamChatMedia(file,'audio');
    });
    recorder.start();start.disabled=true;stop.disabled=false;
    if(status)status.textContent='Gravando áudio… toque em “Parar gravação” para enviar.';
   }catch(error){
    stream?.getTracks().forEach(track=>track.stop());stream=null;
    if(status)status.textContent='Não foi possível usar o microfone: '+String(error?.message||error);
    start.disabled=false;stop.disabled=true;
   }
  });
  stop.addEventListener('click',()=>{
   if(recorder?.state==='recording'){stop.disabled=true;recorder.stop()}
  });
 }
 async function sendTeamMessage(){
  const t=teamState.team,p=teamState.profile,input=$('twMessageBody'),button=$('twSendMessage'),body=input?.value.trim();
  // Guard against double taps and duplicate listeners on mobile while the insert is pending.
  if(teamState.sendingMessage||!body||!t?.team_id||!p?.user_id)return;
  const c=teamClient();if(!c)return;
  teamState.sendingMessage=true;
  const localId='pending-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
  const box=$('twMessages');const oldScroll=box?.scrollTop||0;
  if(button)button.disabled=true;
  appendTeamMessage({id:localId,team_id:t.team_id,author_user_id:p.user_id,body,created_at:new Date().toISOString()},true);
  input.value='';
  try{
   const result=await c.from('team_messages').insert({team_id:t.team_id,author_user_id:p.user_id,body}).select('id,team_id,author_user_id,body,created_at').single();
   if(result.error)throw result.error;
   const pending=box?.querySelector('[data-pending-message="true"]');
   if(pending){
    pending.removeAttribute('data-pending-message');
    const time=pending.querySelector('small');if(time)time.textContent=new Date(result.data.created_at).toLocaleString();
    pending.dataset.messageId=result.data.id;
    const deleteButton=document.createElement('button');deleteButton.type='button';deleteButton.className='tw-btn';deleteButton.dataset.teamDelete='team_messages';deleteButton.dataset.recordId=String(result.data.id);deleteButton.textContent='Apagar mensagem';pending.append(deleteButton);
   }
   const renderedMessages=[...(box?.querySelectorAll('.tw-bubble')||[])].map(el=>el.dataset.messageId||'').filter(Boolean);
   teamState.messageSignature=renderedMessages.join('|');
   refreshTeamBackground();
  }catch(e){
   const pending=box?.querySelector('[data-pending-message="true"]');if(pending)pending.remove();
   input.value=body;
   teamFeedback('Não foi possível enviar a mensagem: '+(e?.message||'verifique a conexão.'),true);
   if(box)box.scrollTop=oldScroll;
  }finally{teamState.sendingMessage=false;if(button)button.disabled=false;input?.focus()}
 }
 function setupTeamChatRealtime(teamId){
  const client=teamClient();if(!client?.channel||!teamId)return;
  if(teamState.realtimeTeamId===teamId&&teamState.realtimeChannel&&teamState.realtimeReady)return;
  if(teamState.realtimeChannel){try{client.removeChannel(teamState.realtimeChannel)}catch(_){}}
  teamState.realtimeTeamId=teamId;teamState.realtimeReady=false;
  const channel=client.channel('rabbitech-team-chat-'+teamId)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'team_messages',filter:'team_id=eq.'+teamId},payload=>{
    const message=payload?.new;if(!message||message.team_id!==teamId)return;
    const box=$('twMessages');
    if(message.author_user_id===teamState.profile?.user_id){
     const duplicate=[...(box?.querySelectorAll('.tw-bubble')||[])].some(el=>el.dataset.messageId===message.id);
     if(duplicate)return;
    }
    const messageBox=$('twMessages');
    const alreadyShown=[...(messageBox?.querySelectorAll('.tw-bubble')||[])].some(el=>el.dataset.messageId===String(message.id));
    if(alreadyShown)return;
    notifyTeamMessage(message);
    const pending=messageBox?.querySelector('[data-pending-message="true"]');
    if(pending&&message.author_user_id===teamState.profile?.user_id){
     pending.removeAttribute('data-pending-message');pending.dataset.messageId=message.id;
     const time=pending.querySelector('small');if(time)time.textContent=new Date(message.created_at).toLocaleString();
    }else{
     const wasNearBottom=messageBox?messageBox.scrollHeight-messageBox.scrollTop-messageBox.clientHeight<48:true;
     appendTeamMessage(message,false);
     const added=messageBox?.lastElementChild;if(added)added.dataset.messageId=message.id;
     if(messageBox&&wasNearBottom)messageBox.scrollTop=messageBox.scrollHeight;
    }
    teamState.messageSignature='';
    refreshTeamBackground();
   })
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'team_tasks',filter:'team_id=eq.'+teamId},payload=>{notifyAssignedTeamTask(payload?.new);refreshTeamBackground()})
   .on('postgres_changes',{event:'UPDATE',schema:'public',table:'team_tasks',filter:'team_id=eq.'+teamId},()=>refreshTeamBackground())
   .on('postgres_changes',{event:'DELETE',schema:'public',table:'team_tasks'},()=>refreshTeamBackground())
   .on('postgres_changes',{event:'DELETE',schema:'public',table:'team_messages'},payload=>{const id=String(payload?.old?.id||'');const bubble=[...document.querySelectorAll('#twMessages [data-message-id]')].find(el=>el.dataset.messageId===id);bubble?.remove();refreshTeamBackground()})
   .on('postgres_changes',{event:'*',schema:'public',table:'team_round_logs',filter:'team_id=eq.'+teamId},()=>refreshTeamBackground())
   .on('postgres_changes',{event:'*',schema:'public',table:'team_goals',filter:'team_id=eq.'+teamId},()=>refreshTeamBackground())
   .on('postgres_changes',{event:'*',schema:'public',table:'team_notes',filter:'team_id=eq.'+teamId},()=>refreshTeamBackground())
   .on('postgres_changes',{event:'*',schema:'public',table:'team_memberships',filter:'team_id=eq.'+teamId},()=>refreshTeamBackground())
   .subscribe(status=>{teamState.realtimeReady=status==='SUBSCRIBED';if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('Chat realtime indisponível; usando atualização de reserva.')});
  teamState.realtimeChannel=channel;
 }
 let teamAuthCheckInFlight=false;
 function syncTeamWorkspace(){
  const refs=ensureTeamPage();
  if(refs){
   refs.button.hidden=false;
   refs.button.removeAttribute('hidden');
   refs.button.removeAttribute('aria-hidden');
   refs.button.style.removeProperty('display');
  }
 }
 async function refreshTeamBackground(){
  if(teamState.backgroundRefreshInFlight){teamState.backgroundRefreshQueued=true;return;}
  const root=$('rbTeamWorkspaceRoot');
  if(!root||!$('page-team-workspace')?.classList.contains('active'))return;
  const client=teamClient(),team=teamState.team;
  if(!client||!team?.team_id)return;
  teamState.backgroundRefreshInFlight=true;
  try{
   const teamId=team.team_id;
   const [taskResult,roundResult,goalResult,messageResult,noteResult,memberResult]=await Promise.all([
    client.from('team_tasks').select('*').eq('team_id',teamId).order('created_at',{ascending:true}).limit(250),
    client.from('team_round_logs').select('*').eq('team_id',teamId).order('performed_at',{ascending:true}).limit(250),
    client.from('team_goals').select('*').eq('team_id',teamId).order('created_at',{ascending:true}).limit(250),
    client.from('team_messages').select('id,team_id,author_user_id,body,created_at,media_type,media_path,media_name,media_mime,media_size').eq('team_id',teamId).order('created_at',{ascending:true}).limit(60),
    client.from('team_notes').select('id,author_user_id,title,body,created_at').eq('team_id',teamId).order('created_at',{ascending:false}).limit(100),
    client.from('team_memberships').select('id,team_id,user_id,display_name,role,created_at').eq('team_id',teamId).order('created_at',{ascending:true}).limit(100)
   ]);
   if(memberResult.error)return;
   if(Array.isArray(memberResult.data)&&memberResult.data.length)teamState.members=memberResult.data;
   if(taskResult.error||roundResult.error||goalResult.error||messageResult.error||noteResult.error)return;
   // If the user navigated away while the queries were running, do not touch the page.
   if(!$('page-team-workspace')?.classList.contains('active'))return;
   const tasks=taskResult.data||[],rounds=roundResult.data||[],goals=goalResult.data||[],messages=messageResult.data||[],notes=noteResult.data||[];
   const done=tasks.filter(t=>t.status==='done').length;
   const progress=tasks.length?Math.round(done/tasks.length*100):0;
   const avg=rounds.length?Math.round(rounds.reduce((sum,r)=>sum+Number(r.score||0),0)/rounds.length):0;
   const stats=root.querySelectorAll('.tw-stat');
   if(stats.length>=4){
    const values=[tasks.length,done,progress+'%',avg];
    values.forEach((value,i)=>{if(stats[i].textContent!==String(value))stats[i].textContent=String(value)});
   }
   // Reconcile Kanban cards in place. Never rebuild the whole workspace during background refresh.
   const board=root.querySelector('.tw-board');
   if(board){
    const columns=[...board.querySelectorAll(':scope > .tw-card')];
    const memberName=id=>teamState.members?.find(m=>m.user_id===id)?.display_name||'Equipe toda';
    const existing=new Map([...board.querySelectorAll('[data-team-task-card]')].map(card=>[card.dataset.teamTaskCard,card]));
    tasks.forEach(task=>{
     let card=existing.get(String(task.id));
     if(!card){
      card=document.createElement('article');card.className='tw-task';card.dataset.teamTaskCard=task.id;
      card.innerHTML='<strong></strong><p></p><p class="tw-muted"></p><p class="tw-muted"></p><label class="tw-muted">Status <select class="tw-field" data-task-status="'+teamEsc(task.id)+'"></select></label>';
      if(teamState.profile?.is_manager===true||teamState.profile?.role==='leader'){const del=document.createElement('button');del.type='button';del.className='tw-btn';del.dataset.teamDelete='team_tasks';del.dataset.recordId=String(task.id);del.textContent='Excluir tarefa';card.append(del)}
      const select=card.querySelector('select');
      TEAM_STATES.forEach(state=>{const option=document.createElement('option');option.value=state;option.textContent=TEAM_LABELS[state];select.append(option)});
      select.addEventListener('change',()=>changeTeamTaskStatus(task.id,select.value));
     }
     card.querySelector('strong').textContent=task.title||'Tarefa';
     card.querySelector('p').textContent=task.description||'';
     const ps=card.querySelectorAll('p');
     if(ps[1])ps[1].textContent='Prioridade: '+(task.priority||'normal')+' · '+(task.due_date?'Prazo '+task.due_date:'Sem prazo');
     if(ps[2])ps[2].textContent='Responsável: '+memberName(task.assigned_to);
     const select=card.querySelector('[data-task-status]');
     if(select){select.value=task.status||'todo';select.dataset.currentStatus=task.status||'todo';select.disabled=!(teamState.profile?.is_manager===true||teamState.profile?.role==='leader'||!task.assigned_to||task.assigned_to===teamState.profile?.user_id)}
     const key=TEAM_STATES.includes(task.status)?task.status:'todo';
     const target=columns.find(col=>col.querySelector('h3')?.textContent?.startsWith(TEAM_LABELS[key]+' ('));
     if(target&&card.parentElement!==target)target.append(card);
     existing.delete(String(task.id));
    });
    existing.forEach(card=>card.remove());
    columns.forEach(col=>{const heading=col.querySelector('h3');if(!heading)return;const state=Object.keys(TEAM_LABELS).find(s=>heading.textContent.startsWith(TEAM_LABELS[s]+' ('));if(state)heading.textContent=TEAM_LABELS[state]+' ('+col.querySelectorAll('[data-task-status]').length+')'});
   }
   const currentManager=teamState.profile?.is_manager===true||teamState.profile?.role==='leader';
   const currentUserId=teamState.profile?.user_id;
   const goalsBox=$('twGoalsList');
   if(goalsBox){
    const goalSignature=JSON.stringify([goals.map(g=>[g.id,g.title,g.description,g.target_tasks,g.target_rounds,g.target_average_score,g.due_date]),done,rounds.length,currentManager]);
    if(goalsBox.dataset.refreshSignature!==goalSignature){
     const goalHtml=goals.map(g=>{
      const taskPct=g.target_tasks?Math.min(100,Math.round(done/g.target_tasks*100)):0;
      const roundPct=g.target_rounds?Math.min(100,Math.round(rounds.length/g.target_rounds*100)):0;
      return '<div class="tw-task" data-goal-id="'+teamEsc(g.id)+'"><strong>'+teamEsc(g.title)+'</strong><p>'+teamEsc(g.description||'')+'</p><p>Tarefas: '+done+'/'+g.target_tasks+' ('+taskPct+'%)</p><progress max="100" value="'+taskPct+'" style="width:100%"></progress><p>Rounds registrados: '+rounds.length+'/'+g.target_rounds+' ('+roundPct+'%)</p><progress max="100" value="'+roundPct+'" style="width:100%"></progress><p>Meta de média: '+Number(g.target_average_score||0)+' pts · '+teamEsc(g.due_date||'Sem prazo')+'</p>'+(currentManager?'<button class="tw-btn" data-team-delete="team_goals" data-record-id="'+teamEsc(g.id)+'">Excluir meta</button>':'')+'</div>';
     }).join('')||'<p class="tw-muted">O mentor ainda não cadastrou metas.</p>';
     goalsBox.innerHTML=goalHtml;goalsBox.dataset.refreshSignature=goalSignature;
    }
   }
   const roundList=$('twRoundList');
   if(roundList){
    const roundSignature=JSON.stringify([rounds.map(r=>[r.id,r.round_number,r.score,r.start_position,r.notes,r.created_by]),currentManager,currentUserId]);
    if(roundList.dataset.refreshSignature!==roundSignature){
     const roundHtml=rounds.slice().reverse().map(r=>'<article class="tw-task" data-round-id="'+teamEsc(r.id)+'"><strong>Round '+teamEsc(r.round_number)+'</strong><p>'+Number(r.score||0)+' pontos · '+teamEsc(r.start_position||'Início não informado')+'</p><p class="tw-muted">'+teamEsc(r.notes||'')+'</p>'+((currentManager||r.created_by===currentUserId)?'<button class="tw-btn" data-team-delete="team_round_logs" data-record-id="'+teamEsc(r.id)+'">Excluir round</button>':'')+'</article>').join('')||'<p class="tw-muted">Nenhum round registrado.</p>';
     roundList.innerHTML=roundHtml;roundList.dataset.refreshSignature=roundSignature;
    }
   }
   const roundChart=$('twRoundChart');
   if(roundChart){
    const recentRounds=rounds.slice(-5);
    const chartSignature=JSON.stringify(recentRounds.map(r=>[r.id,r.round_number,r.score]));
    if(roundChart.dataset.refreshSignature!==chartSignature){
     const chartHtml=recentRounds.length?'<div style="display:flex;align-items:end;gap:8px;height:140px;padding:8px 0">'+recentRounds.map(r=>'<div style="flex:1;min-width:24px;text-align:center"><div title="'+Number(r.score||0)+' pontos" style="height:'+Math.max(5,Math.round(Number(r.score||0)/Math.max(1,...recentRounds.map(x=>Number(x.score||0)))*105))+'px;background:#9dcc65;border-radius:6px 6px 0 0"></div><small>'+teamEsc('R'+r.round_number)+'</small><br><strong>'+Number(r.score||0)+'</strong></div>').join('')+'</div>':'<p class="tw-muted">Registre os rounds abaixo para começar o gráfico de desempenho.</p>';
     roundChart.innerHTML=chartHtml;roundChart.dataset.refreshSignature=chartSignature;
    }
   }
   const roundsAverage=$('twRoundsAverage');if(roundsAverage)roundsAverage.textContent=avg+' pontos';
   const roundsFooter=$('twRoundCountFooter');if(roundsFooter)roundsFooter.textContent=rounds.length+' rounds de treino registrados.';
   const statLabels=root.querySelectorAll('.tw-stat + div');
   if(statLabels.length>=4&&statLabels[3].textContent!==('Média dos rounds · '+rounds.length+' registros'))statLabels[3].textContent='Média dos rounds · '+rounds.length+' registros';
   const notesBox=$('twNotesList');
   if(notesBox){
    const existingNotes=new Map([...notesBox.querySelectorAll('[data-team-note-id]')].map(el=>[el.dataset.teamNoteId,el]));
    notes.forEach(note=>{
     const id=String(note.id);let article=existingNotes.get(id);
     if(!article){article=document.createElement('article');article.className='tw-task';article.dataset.teamNoteId=id;const h=document.createElement('strong'),p=document.createElement('p'),meta=document.createElement('small');p.style.whiteSpace='pre-wrap';meta.className='tw-muted';article.append(h,p,meta);if(teamState.profile?.is_manager===true||teamState.profile?.role==='leader'||note.author_user_id===teamState.profile?.user_id){const del=document.createElement('button');del.type='button';del.className='tw-btn';del.dataset.teamDelete='team_notes';del.dataset.recordId=id;del.textContent='Excluir anotação';article.append(del)}const empty=notesBox.querySelector('.tw-muted');if(empty&&empty.textContent.includes('Nenhuma anotação'))empty.remove();notesBox.prepend(article)}
     const h=article.querySelector('strong'),p=article.querySelector('p'),meta=article.querySelector('small');
     if(h&&h.textContent!==String(note.title||''))h.textContent=note.title||'';
     if(p&&p.textContent!==String(note.body||''))p.textContent=note.body||'';
     const metaText=new Date(note.created_at).toLocaleString()+' · '+(teamState.members?.find(m=>m.user_id===note.author_user_id)?.display_name||'Membro');if(meta&&meta.textContent!==metaText)meta.textContent=metaText;
     existingNotes.delete(id);
    });
    existingNotes.forEach(el=>el.remove());
    if(!notes.length&&!notesBox.querySelector('[data-team-note-id]')&&!notesBox.querySelector('.tw-muted')){const empty=document.createElement('p');empty.className='tw-muted';empty.textContent='Nenhuma anotação ainda.';notesBox.appendChild(empty)}
   }
   const messageBox=$('twMessages');
   if(messageBox){
    const wasNearBottom=messageBox.scrollHeight-messageBox.scrollTop-messageBox.clientHeight<48;
    const existingMessages=new Map([...messageBox.querySelectorAll('[data-message-id]')].map(el=>[el.dataset.messageId,el]));
    messages.forEach(message=>{
     const id=String(message.id);let bubble=existingMessages.get(id);
     if(!bubble){const pending=messageBox.querySelector('[data-pending-message="true"]');if(pending&&message.author_user_id===teamState.profile?.user_id){bubble=pending;pending.removeAttribute('data-pending-message');bubble.dataset.messageId=id;bubble.dataset.createdAt=message.created_at;const del=document.createElement('button');del.type='button';del.className='tw-btn';del.dataset.teamDelete='team_messages';del.dataset.recordId=id;del.textContent='Apagar mensagem';bubble.append(del)}else{bubble=document.createElement('div');bubble.className='tw-bubble';bubble.dataset.messageId=id;bubble.dataset.createdAt=message.created_at;const h=document.createElement('strong'),p=document.createElement('p'),meta=document.createElement('small');p.style.cssText='white-space:pre-wrap;margin:4px 0';meta.className='tw-muted';bubble.append(h,p,meta);if(teamState.profile?.is_manager===true||teamState.profile?.role==='leader'||message.author_user_id===teamState.profile?.user_id){const del=document.createElement('button');del.type='button';del.className='tw-btn';del.dataset.teamDelete='team_messages';del.dataset.recordId=id;del.textContent='Apagar mensagem';bubble.append(del)}messageBox.appendChild(bubble)}}
     const h=bubble.querySelector('strong');let p=bubble.querySelector('p');const meta=bubble.querySelector('small');
     if(message.body&&!p){p=document.createElement('p');p.style.cssText='white-space:pre-wrap;margin:4px 0';if(meta)bubble.insertBefore(p,meta);else bubble.append(p)}
     if(!message.body&&p)p.remove();
     const knownName=teamState.members?.find(m=>String(m.user_id)===String(message.author_user_id))?.display_name;
     if(h)h.textContent=knownName&&String(knownName).trim()?String(knownName).trim():(message.author_user_id===teamState.profile?.user_id?(teamState.profile?.display_name||'Membro'):'Membro');
     if(h&&h.textContent==='Membro'&&message.author_user_id)resolveTeamMemberName(message.author_user_id,message.team_id).then(resolved=>{if(h.isConnected&&resolved&&resolved!=='Membro')h.textContent=resolved});
     if(p&&p.textContent!==String(message.body||''))p.textContent=message.body||'';
     const time=new Date(message.created_at).toLocaleString();if(meta&&meta.textContent!==time)meta.textContent=time;
     if(message.media_path)loadTeamMessageMedia(message,bubble);
     existingMessages.delete(id);
    });
    existingMessages.forEach(el=>el.remove());
    const emptyMessage=messageBox.querySelector('.tw-muted');if(messages.length&&emptyMessage&&emptyMessage.textContent.includes('Nenhuma mensagem'))emptyMessage.remove();
    if(!messages.length&&!messageBox.querySelector('[data-message-id]')&&!messageBox.querySelector('[data-pending-message]'))messageBox.textContent='Nenhuma mensagem ainda.';
    if(wasNearBottom)messageBox.scrollTop=messageBox.scrollHeight;
   }
   teamState.backgroundData={taskCount:tasks.length,done,progress,avg,roundCount:rounds.length};
  }catch(error){console.warn('Atualização em segundo plano da equipe falhou',error)}
  finally{
   teamState.backgroundRefreshInFlight=false;
   if(teamState.backgroundRefreshQueued){
    teamState.backgroundRefreshQueued=false;
    if(!$('page-team-workspace')?.hidden&&$('page-team-workspace')?.classList.contains('active'))queueMicrotask(()=>refreshTeamBackground());
   }
  }
 }
 function initTeamWorkspace(){
  syncTeamWorkspace();
  window.addEventListener('rb-auth-state-changed',async()=>{
   const user=await teamAuthUser();
   const userId=user?.id||null;
   if(userId!==teamState.authUserId){
    teamState.authUserId=userId;
    teamState.profile=null;teamState.team=null;
    teamState.messageSignature='';teamState.notesSignature='';
    const root=$('rbTeamWorkspaceRoot');
    if(root)root.dataset.initialized='false';
    syncTeamWorkspace();
    if($('page-team-workspace')?.classList.contains('active')){
     await renderTeamWorkspace();
     if(root)root.dataset.initialized='true';
    }
   }else if($('page-team-workspace')?.classList.contains('active')){
    refreshTeamBackground();
   }
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('page-team-workspace')?.classList.contains('active'))refreshTeamBackground()});
  setInterval(()=>{if(!document.hidden&&!teamState.realtimeReady&&$('page-team-workspace')?.classList.contains('active')){setupTeamChatRealtime(teamState.team?.team_id);refreshTeamBackground()}},30000);
 }
 

 function initFirstVisitTour(){
  const KEY='rabbitech_first_visit_tour_v1';
  const STYLE_ID='rbFirstVisitTourStyles';
  const ROOT_ID='rbFirstVisitTour';
  if($(ROOT_ID))return;
  const css=`
   #rbFirstVisitTour .rb-tour-shade{position:fixed;background:rgba(2,9,5,.74);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:2147483000;pointer-events:none}
   #rbFirstVisitTour .rb-tour-card{position:fixed;z-index:2147483646;left:50%;transform:translateX(-50%);width:min(520px,calc(100vw - 28px));box-sizing:border-box;padding:18px;border:1px solid rgba(208,244,119,.8);border-radius:18px;background:linear-gradient(145deg,#10291a,#07130c);color:#f1faed;box-shadow:0 18px 60px #000a;font:inherit}
   #rbFirstVisitTour .rb-tour-kicker{font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#d0f477;font-weight:800}
   #rbFirstVisitTour .rb-tour-title{font-size:clamp(20px,5vw,25px);line-height:1.15;margin:8px 0}
   #rbFirstVisitTour .rb-tour-copy{font-size:15px;line-height:1.5;margin:8px 0 14px;color:#d9e8d8}
   #rbFirstVisitTour .rb-tour-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
   #rbFirstVisitTour .rb-tour-btn{border:1px solid #49684b;border-radius:999px;padding:10px 14px;background:#183722;color:#f3ffe9;font:inherit;font-weight:750;cursor:pointer}
   #rbFirstVisitTour .rb-tour-btn.primary{background:#d0f477;color:#122014;border-color:#d0f477}
   #rbFirstVisitTour .rb-tour-progress{height:4px;border-radius:999px;background:#263d2c;overflow:hidden;margin:12px 0}
   #rbFirstVisitTour .rb-tour-progress span{display:block;height:100%;background:#d0f477;transition:width .18s ease}
   #rbFirstVisitTour .rb-tour-arrow{position:fixed;z-index:2147483645;color:#d0f477;font-size:36px;font-weight:900;line-height:1;text-shadow:0 2px 8px #000;pointer-events:none}
   .rb-tour-highlight{position:relative!important;z-index:2147483001!important;outline:3px solid #d0f477!important;outline-offset:4px!important;box-shadow:0 0 0 7px rgba(208,244,119,.2),0 0 28px rgba(208,244,119,.65)!important;border-radius:12px!important}
   #rbFirstVisitTourHelp{position:fixed;left:12px;right:auto;top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 300px);z-index:2147482999;width:40px;height:40px;border-radius:50%;border:1px solid #789b5b;background:#102719;color:#d0f477;font-size:21px;font-weight:900;box-shadow:0 4px 16px #0006;cursor:pointer}
   @media(max-width:520px){#rbFirstVisitTour .rb-tour-card{bottom:calc(env(safe-area-inset-bottom,0px) + 16px);padding:15px}#rbFirstVisitTour .rb-tour-copy{font-size:14px}#rbFirstVisitTourHelp{left:12px;right:auto;top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 300px)}}
  `;
  if(!$(STYLE_ID)){const style=document.createElement('style');style.id=STYLE_ID;style.textContent=css;document.head.appendChild(style)}
  const help=document.createElement('button');help.id='rbFirstVisitTourHelp';help.type='button';help.textContent='?';help.title='Abrir tutorial do Rabbitech';help.setAttribute('aria-label','Abrir tutorial do Rabbitech');document.body.appendChild(help);
  const steps=[
   {title:'Bem-vindo ao Rabbitech!',copy:'Este tour rápido mostra onde ficam as ferramentas principais. O fundo fica desfocado e você pode avançar, voltar ou pular quando quiser.',find:()=>document.querySelector('body>header')||document.querySelector('main .hero')||document.querySelector('main')},
   {title:'Placar e pontuação',copy:'Aqui você registra as missões do round e acompanha os pontos. Confira os valores antes de salvar uma rodada.',find:()=>document.querySelector('nav button[data-page="score"]')||document.querySelector('#page-score')},
   {title:'Histórico e ranking',copy:'O histórico ajuda a comparar os rounds que vocês já registraram. O ranking público depende dos critérios de rodadas configurados no site.',find:()=>document.querySelector('nav button[data-page="history"]')||document.querySelector('nav button[data-page="leaderboard"]')||document.querySelector('#page-leaderboard')},
   {title:'Estratégia e rotas',copy:'Use essas áreas para planejar a ordem das missões, os caminhos do robô e o que a equipe quer testar antes da próxima rodada.',find:()=>document.querySelector('nav button[data-page="strategy"]')||document.querySelector('nav button[data-page="routes"]')||document.querySelector('#page-strategy')},
   {title:'Regras e conteúdo',copy:'Consulte as regras da temporada e os materiais do Rabbitech TV quando precisar revisar uma missão ou estudar uma estratégia.',find:()=>document.querySelector('nav button[data-page="rules"]')||document.querySelector('nav button[data-page="youtube"]')||document.querySelector('#page-rules')},
   {title:'Espaço da equipe',copy:'Crie uma equipe ou entre usando o código de convite do responsável. Depois, vocês podem organizar tarefas, metas, rounds, anotações e conversar no chat. Os dados sincronizados ficam na nuvem.',find:()=>document.querySelector('#rbTeamWorkspaceNav')||document.querySelector('nav button[data-page="team-workspace"]')||document.querySelector('#page-team-workspace')},
   {title:'Conta e sincronização',copy:'Entre com sua conta e confira o estado da conexão com a nuvem. Use a mesma conta nos dispositivos em que precisa acessar seus dados.',find:()=>document.querySelector('[id*="cloud" i] button')||[...document.querySelectorAll('button')].find(b=>/sincronizar histórico|trocar conta google|mostrar opções da nuvem/i.test(b.textContent||''))||document.querySelector('body>header')},
   {title:'Pronto para começar',copy:'É isso. Você pode abrir este tutorial novamente pelo botão ? no topo da tela. Bom trabalho, equipe!',find:()=>document.querySelector('#rbTeamWorkspaceNav')||document.querySelector('nav button[data-page="score"]')||document.querySelector('main')}
  ];
  let index=0,root=null,card=null,arrow=null,highlight=null,shades=[],resizeHandler=null;
  const visible=el=>!!el&&el.isConnected&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none';
  function clearHighlight(){if(highlight){highlight.classList.remove('rb-tour-highlight');highlight=null}}
  function cleanup(){
   clearHighlight();if(resizeHandler){window.removeEventListener('resize',resizeHandler);window.removeEventListener('scroll',resizeHandler,true);resizeHandler=null}
   root?.remove();root=null;card=null;arrow=null;shades=[];
  }
  function finish(skipped){
   cleanup();try{localStorage.setItem(KEY,'done')}catch(_){}
   window.dispatchEvent(new CustomEvent('rb-first-visit-tour-finished',{detail:{skipped:!!skipped}}));
  }
  function build(){
   cleanup();root=document.createElement('div');root.id=ROOT_ID;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Tutorial inicial do Rabbitech');
   for(let i=0;i<4;i++){const s=document.createElement('div');s.className='rb-tour-shade';root.appendChild(s);shades.push(s)}
   arrow=document.createElement('div');arrow.className='rb-tour-arrow';arrow.setAttribute('aria-hidden','true');root.appendChild(arrow);
   card=document.createElement('section');card.className='rb-tour-card';card.innerHTML='<div class="rb-tour-kicker">Guia rápido · <span id="rbTourStepCount"></span></div><h2 class="rb-tour-title" id="rbTourTitle"></h2><p class="rb-tour-copy" id="rbTourCopy"></p><div class="rb-tour-progress"><span id="rbTourProgress"></span></div><div class="rb-tour-actions"><button type="button" class="rb-tour-btn" id="rbTourBack">Voltar</button><button type="button" class="rb-tour-btn" id="rbTourSkip">Pular tutorial</button><button type="button" class="rb-tour-btn primary" id="rbTourNext">Avançar</button></div>';
   root.appendChild(card);document.body.appendChild(root);
   root.querySelector('#rbTourBack').addEventListener('click',()=>{index=Math.max(0,index-1);render()});
   root.querySelector('#rbTourSkip').addEventListener('click',()=>finish(true));
   root.querySelector('#rbTourNext').addEventListener('click',()=>{index++;if(index>=steps.length)finish(false);else render()});
   resizeHandler=()=>position();window.addEventListener('resize',resizeHandler,{passive:true});window.addEventListener('scroll',resizeHandler,true);
  }
  function position(){
   if(!root||!card)return;
   const rect=highlight&&visible(highlight)?highlight.getBoundingClientRect():null;
   const w=window.innerWidth,h=window.innerHeight;
   if(!rect){shades.forEach(s=>{s.style.display='none'});arrow.style.display='none';card.style.top='50%';card.style.bottom='auto';card.style.transform='translate(-50%,-50%)';return}
   const pad=7,left=Math.max(0,rect.left-pad),top=Math.max(0,rect.top-pad),right=Math.min(w,rect.right+pad),bottom=Math.min(h,rect.bottom+pad);
   const dims=[
    {left:0,top:0,width:w,height:top},
    {left:0,top:bottom,width:w,height:Math.max(0,h-bottom)},
    {left:0,top:top,width:left,height:Math.max(0,bottom-top)},
    {left:right,top:top,width:Math.max(0,w-right),height:Math.max(0,bottom-top)}
   ];
   shades.forEach((s,i)=>{Object.assign(s.style,{display:'block',left:dims[i].left+'px',top:dims[i].top+'px',width:dims[i].width+'px',height:dims[i].height+'px'})});
   card.style.transform='translateX(-50%)';
   if(rect.top>h*.56){card.style.top='calc(env(safe-area-inset-top, 0px) + 14px)';card.style.bottom='auto';arrow.textContent='↓';arrow.style.left=Math.min(w-42,Math.max(8,rect.left+rect.width/2-14))+'px';arrow.style.top=Math.min(h-42,rect.top-42)+'px'}
   else{card.style.top='auto';card.style.bottom='calc(env(safe-area-inset-bottom, 0px) + 14px)';arrow.textContent='↑';arrow.style.left=Math.min(w-42,Math.max(8,rect.left+rect.width/2-14))+'px';arrow.style.top=Math.min(h-42,rect.bottom+8)+'px'}
   arrow.style.display='block';
  }
  function render(){
   if(!root)build();
   clearHighlight();
   let step=steps[index],target=step.find?.();
   if(!visible(target)){
    // Skip controls not present in this particular layout, instead of spotlighting empty space.
    let attempts=0;
    while(attempts++<steps.length&&!visible(target)){index++;if(index>=steps.length){finish(false);return}step=steps[index];target=step.find?.()}
   }
   if(target){highlight=target;target.classList.add('rb-tour-highlight');try{target.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'})}catch(_){}}
   card.querySelector('#rbTourStepCount').textContent=(index+1)+' de '+steps.length;
   card.querySelector('#rbTourTitle').textContent=step.title;
   card.querySelector('#rbTourCopy').textContent=step.copy;
   card.querySelector('#rbTourProgress').style.width=((index+1)/steps.length*100)+'%';
   card.querySelector('#rbTourBack').disabled=index===0;
   card.querySelector('#rbTourBack').style.opacity=index===0?'.45':'1';
   card.querySelector('#rbTourNext').textContent=index===steps.length-1?'Concluir':'Avançar';
   requestAnimationFrame(position);
  }
  let waitingForConsent=false;
  function start(force){
   if(root)return;
   if(!force){try{if(localStorage.getItem(KEY)==='done')return}catch(_){}}
   const privacy=$('rbPrivacyGate'),language=$('rbLanguageConsent');
   if((visible(privacy)&&!privacy.hidden)||(visible(language)&&!language.hidden)){
    if(waitingForConsent)return;waitingForConsent=true;
    const observer=new MutationObserver(()=>{if(!visible(privacy)&&!visible(language)){observer.disconnect();waitingForConsent=false;setTimeout(()=>start(force),450)}});
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','style','class','aria-hidden']});
    setTimeout(()=>{observer.disconnect();waitingForConsent=false},45000);return;
   }
   index=0;build();render();
  }
  help.addEventListener('click',()=>start(true));
  setTimeout(()=>start(false),1400);
 }


 function ensurePrivacyDisclosure(){
  if($('rbPrivacyDataNotice'))return;
  const navButton=document.querySelector('nav button[data-page="privacy"]');
  const page=$('page-privacy')||(navButton?$('page-'+navButton.dataset.page):null);
  if(!page)return;
  const section=document.createElement('section');
  section.id='rbPrivacyDataNotice';
  section.className='privacy-card';
  section.style.cssText='margin:14px 0;padding:18px;border:1px solid #34543a;border-radius:16px;background:rgba(12,29,18,.94);color:var(--text,#eef7eb);line-height:1.6;overflow-wrap:anywhere';
  section.innerHTML=`
   <h2>Privacidade e proteção de dados</h2>
   <p><strong>Transparência:</strong> o Rabbitech é uma plataforma de apoio às atividades da equipe de robótica/FLL. Os dados são usados para permitir o login, organizar equipes, tarefas, metas, anotações, mensagens e registros de rounds, além de manter a segurança e o funcionamento do site. Não vendemos dados pessoais.</p>
   <h3>Quais dados podem ser tratados?</h3>
   <ul>
    <li>Dados da conta fornecidos pelo serviço de login, como identificador da conta e e-mail;</li>
    <li>Nome de exibição, equipe e participação em convites;</li>
    <li>Tarefas, metas, status, anotações, mensagens do chat e registros de rounds inseridos pelos membros;</li>
    <li>Informações técnicas necessárias para funcionamento, segurança, diagnóstico e prevenção de abuso.</li>
   </ul>
   <h3>Para que e com quem?</h3>
   <p>Os dados são usados para fornecer os recursos solicitados, sincronizar a equipe entre dispositivos, proteger contas e corrigir falhas. O site utiliza serviços de terceiros para autenticação, hospedagem e banco de dados, incluindo Google (login, quando escolhido), Vercel (hospedagem) e Supabase (autenticação/banco de dados). Esses fornecedores processam informações conforme seus próprios termos e políticas. Dados também poderão ser tratados quando necessário para cumprir obrigações legais ou responder a solicitações legítimas de autoridades.</p>
   <h3>Armazenamento e segurança</h3>
   <p>Os dados de equipe são armazenados no serviço de banco de dados para que os membros autorizados possam acessá-los em seus dispositivos. Algumas funções podem guardar informações localmente no navegador. Aplicamos controles de acesso e medidas técnicas disponíveis, mas nenhum serviço conectado à internet pode prometer risco zero. Compartilhe códigos de convite apenas com pessoas que devem entrar na equipe e não registre informações sensíveis desnecessárias no chat ou nas anotações.</p>
   <h3>Crianças e adolescentes</h3>
   <p>Como o Rabbitech pode ser usado em atividades educacionais por menores de idade, o tratamento deve respeitar o melhor interesse da criança ou do adolescente. Quando aplicável, o uso deve ocorrer com conhecimento e orientação dos pais ou responsáveis e das regras da escola/equipe. Não publique dados pessoais de terceiros sem autorização.</p>
   <h3>Seus direitos</h3>
   <p>Nos termos da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018, LGPD), você pode solicitar confirmação do tratamento, acesso, correção, informações sobre o uso e, quando aplicável, anonimização, bloqueio ou eliminação de dados. A eliminação pode ter limites quando a manutenção for necessária por obrigação legal, segurança ou defesa de direitos. Para fazer uma solicitação, entre em contato com o responsável pela manutenção do Rabbitech pelos canais oficiais do projeto e informe o pedido sem enviar senhas ou códigos de acesso.</p>
   <h3>Base legal e legislação</h3>
   <p>O tratamento deve se apoiar na base legal adequada a cada finalidade prevista na LGPD; esta política não presume que todo tratamento dependa de consentimento. Aplicam-se também as regras pertinentes de proteção de crianças e adolescentes e as orientações da Autoridade Nacional de Proteção de Dados (ANPD).</p>
   <h3>Referências oficiais</h3>
   <ul>
    <li><a href="https://www.presidencia.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm" target="_blank" rel="noopener noreferrer">Lei nº 13.709/2018 (LGPD)</a></li>
    <li><a href="https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados" target="_blank" rel="noopener noreferrer">ANPD: direitos do titular de dados</a></li>
    <li><a href="https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte" target="_blank" rel="noopener noreferrer">ANPD: guia de segurança da informação</a></li>
   </ul>
   <p class="tw-muted"><strong>Importante:</strong> este texto é uma explicação inicial de transparência, não uma certificação de conformidade nem aconselhamento jurídico. O responsável pelo projeto deve confirmar o contato oficial, os prazos reais de retenção, as bases legais aplicáveis e as configurações efetivas dos fornecedores antes de considerar a política final.</p>
  `;
  page.appendChild(section);
 }

 function removeRetiredAds(){
  // Anúncios foram descontinuados. Limpa também elementos antigos que possam
  // permanecer no DOM por cache ou por scripts de versões anteriores.
  document.querySelectorAll('#rbAdsConsentDialog,#rbAdsConsentBanner,#rbOptionalAdSlot,#rbAdsPreferenceButton,[data-ads-preference],[data-ads-consent],[data-optional-ad]').forEach(el=>el.remove());
  document.querySelectorAll('button,a,[role="button"],label').forEach(el=>{
   const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
   if(/^(anúncios? opcionais|preferências de anúncios|aceitar anúncios|não quero anúncios|gerenciar anúncios)$/i.test(text))el.remove();
  });
 }


 // Localized greetings and lightweight UI language fallback.
 const rbLocaleText={
  pt:{welcome:['Bem-vindo de volta ao Rabbitech','Bom dia','Boa tarde','Boa noite'],bye:'Até mais! Obrigado por usar o Rabbitech. Volte sempre!',team:'Equipe',admin:'Admin',score:'Placar',history:'Histórico',ranking:'Ranking',strategy:'Estratégia',routes:'Rotas',rules:'Regras',tv:'Rabbitech TV',music:'Música',privacy:'Privacidade',refresh:'Atualizar',createTeam:'Criar equipe',joinTeam:'Entrar em equipe existente'},
  en:{welcome:['Welcome back to Rabbitech','Good morning','Good afternoon','Good evening'],bye:'See you soon! Thanks for using Rabbitech. Come back anytime!',team:'Team',admin:'Admin',score:'Scoreboard',history:'History',ranking:'Leaderboard',strategy:'Strategy',routes:'Routes',rules:'Rules',tv:'Rabbitech TV',music:'Music',privacy:'Privacy',refresh:'Refresh',createTeam:'Create team',joinTeam:'Join an existing team'},
  es:{welcome:['Te damos la bienvenida de nuevo a Rabbitech','Buenos días','Buenas tardes','Buenas noches'],bye:'¡Hasta luego! Gracias por usar Rabbitech. ¡Vuelve pronto!',team:'Equipo',admin:'Administración',score:'Marcador',history:'Historial',ranking:'Clasificación',strategy:'Estrategia',routes:'Rutas',rules:'Reglas',tv:'Rabbitech TV',music:'Música',privacy:'Privacidad',refresh:'Actualizar',createTeam:'Crear equipo',joinTeam:'Unirse a un equipo'},
  fr:{welcome:['Bon retour sur Rabbitech','Bonjour','Bon après-midi','Bonsoir'],bye:'À bientôt ! Merci d’utiliser Rabbitech. Revenez quand vous voulez !',team:'Équipe',admin:'Administration',score:'Score',history:'Historique',ranking:'Classement',strategy:'Stratégie',routes:'Itinéraires',rules:'Règles',tv:'Rabbitech TV',music:'Musique',privacy:'Confidentialité',refresh:'Actualiser',createTeam:'Créer une équipe',joinTeam:'Rejoindre une équipe'},
  de:{welcome:['Willkommen zurück bei Rabbitech','Guten Morgen','Guten Tag','Guten Abend'],bye:'Bis bald! Danke, dass du Rabbitech nutzt. Komm gerne wieder!',team:'Team',admin:'Administration',score:'Spielstand',history:'Verlauf',ranking:'Rangliste',strategy:'Strategie',routes:'Routen',rules:'Regeln',tv:'Rabbitech TV',music:'Musik',privacy:'Datenschutz',refresh:'Aktualisieren',createTeam:'Team erstellen',joinTeam:'Bestehendem Team beitreten'},
  it:{welcome:['Bentornato su Rabbitech','Buongiorno','Buon pomeriggio','Buonasera'],bye:'A presto! Grazie per usare Rabbitech. Torna quando vuoi!',team:'Squadra',admin:'Amministrazione',score:'Punteggio',history:'Cronologia',ranking:'Classifica',strategy:'Strategia',routes:'Percorsi',rules:'Regole',tv:'Rabbitech TV',music:'Musica',privacy:'Privacy',refresh:'Aggiorna',createTeam:'Crea squadra',joinTeam:'Unisciti a una squadra'},
  'zh-CN':{welcome:['欢迎回到 Rabbitech','早上好','下午好','晚上好'],bye:'再见！感谢使用 Rabbitech。期待下次见面！',team:'团队',admin:'管理',score:'记分板',history:'历史记录',ranking:'排行榜',strategy:'策略',routes:'路线',rules:'规则',tv:'Rabbitech TV',music:'音乐',privacy:'隐私',refresh:'刷新',createTeam:'创建团队',joinTeam:'加入现有团队'},
  ja:{welcome:['Rabbitech へようこそ','おはようございます','こんにちは','こんばんは'],bye:'またお会いしましょう。Rabbitech をご利用いただきありがとうございます！',team:'チーム',admin:'管理',score:'スコアボード',history:'履歴',ranking:'ランキング',strategy:'戦略',routes:'ルート',rules:'ルール',tv:'Rabbitech TV',music:'音楽',privacy:'プライバシー',refresh:'更新',createTeam:'チームを作成',joinTeam:'既存のチームに参加'},
  hi:{welcome:['Rabbitech में आपका फिर से स्वागत है','सुप्रभात','नमस्कार','शुभ संध्या'],bye:'फिर मिलेंगे! Rabbitech इस्तेमाल करने के लिए धन्यवाद।',team:'टीम',admin:'व्यवस्थापन',score:'स्कोरबोर्ड',history:'इतिहास',ranking:'रैंकिंग',strategy:'रणनीति',routes:'मार्ग',rules:'नियम',tv:'Rabbitech TV',music:'संगीत',privacy:'गोपनीयता',refresh:'रीफ़्रेश',createTeam:'टीम बनाएँ',joinTeam:'मौजूदा टीम से जुड़ें'}

 };
 function rbCurrentLocale(){
  let saved='';try{saved=localStorage.getItem('rbPreferredLanguage')||''}catch(_){}
  const selector=$('rbLanguageQuick')?.querySelector('select')||$('rbLanguageQuickSelect')||$('rbLanguageGateSelect')||$('rbConsentLanguage');
  const chosen=String(saved||selector?.value||'').trim().toLowerCase().replace('_','-');
  const raw=chosen||String(navigator.languages?.[0]||navigator.language||document.documentElement.lang||'pt-BR').trim().toLowerCase().replace('_','-');
  if(raw.startsWith('pt'))return 'pt';
  if(raw.startsWith('en'))return 'en';
  if(raw.startsWith('es'))return 'es';
  if(raw.startsWith('fr'))return 'fr';
  if(raw.startsWith('de'))return 'de';
  if(raw.startsWith('it'))return 'it';
  if(raw.startsWith('zh'))return 'zh-CN';
  if(raw.startsWith('ja'))return 'ja';
  if(raw.startsWith('hi')||raw.startsWith('in'))return 'hi';
  return 'pt';
 }
 const rbLogoutMessages={"pt":["Até logo! Que seu próximo round seja incrível.","Valeu por usar o Rabbitech. Até a próxima!","Boa sorte nos próximos desafios. Até mais!","Nos vemos na próxima missão!","Até breve, equipe! Continue evoluindo.","Obrigado pela visita. Volte quando quiser!","Fechando por aqui. Bons treinos!","Até a próxima rodada de ideias!","Que venham grandes descobertas. Até mais!","Valeu pela parceria. Até logo!","O Rabbitech fica por aqui. Bom descanso!","Até a próxima, e boas construções!","Missão encerrada por enquanto. Até mais!","Obrigado por treinar com a gente!","Até breve! Continue explorando e aprendendo.","Sua próxima ideia genial espera por você. Até logo!","Desconectando. Bons projetos!","Até a próxima aventura robótica!","Obrigado por fazer parte do Rabbitech.","Até mais! Que seu robô tenha um ótimo desempenho.","Pausa merecida. Até a próxima!","Nos encontramos no próximo desafio.","Valeu! Que a criatividade continue ligada.","Até logo! Hora de recarregar as baterias.","Obrigado pela visita. Sucesso na próxima rodada!","Até a próxima sessão de treino!","A equipe agradece a visita. Até breve!","Saindo do Rabbitech. Bons experimentos!","Até mais! Continue criando coisas incríveis.","Fim da sessão. O espírito de equipe continua!","Obrigado por passar por aqui!","Até logo, e não pare de testar ideias.","Que seu próximo round renda bons pontos. Até!","Até a próxima missão, piloto!","Valeu por hoje. Amanhã tem mais ideias!","Saída concluída. Bons estudos e bons treinos!","Nos vemos em breve no Rabbitech.","Até mais! Robôs prontos, ideias também.","Obrigado por usar nossas ferramentas.","Hora de encerrar. Que seu dia seja ótimo!","Até logo! Continue programando com curiosidade.","Valeu por compartilhar este tempo conosco.","Pronto por hoje. Até a próxima descoberta!","Saindo agora. Que tudo dê certo por aí!","Até breve! Sua próxima construção começa com uma ideia.","Obrigado pela confiança. Até mais!","A sessão terminou, mas a criatividade não.","Até logo! Bons testes e pouca gambiarra.","Valeu pela visita. Até o próximo round!","Até a próxima! Continue fazendo a tecnologia acontecer."],"en":["See you soon! May your next round be brilliant.","Thanks for using Rabbitech. Until next time!","Good luck with your next challenges. See you!","See you on the next mission!","Until soon, team. Keep improving!","Thanks for stopping by. Come back anytime!","Signing off for now. Happy practicing!","See you at the next round of ideas!","May great discoveries be ahead. Bye for now!","Thanks for being here. See you soon!","Rabbitech is signing off with you. Rest well!","Until next time, and happy building!","Mission paused for now. See you!","Thanks for practicing with us!","See you soon. Keep exploring and learning!","Your next brilliant idea is waiting. Bye!","Disconnecting. Happy building!","Until the next robotics adventure!","Thanks for being part of Rabbitech.","See you! May your robot perform brilliantly.","A well-earned break. See you next time!","Catch you at the next challenge.","Thanks! Keep your creativity switched on.","See you soon. Time to recharge your batteries.","Thanks for visiting. Best of luck next round!","Until the next practice session!","The team appreciates your visit. See you soon!","Leaving Rabbitech. Happy experimenting!","See you! Keep making amazing things.","Session complete. Team spirit stays on!","Thanks for dropping by!","See you soon, and keep testing ideas.","May your next round bring great scores. Bye!","Until the next mission, pilot!","Thanks for today. More ideas tomorrow!","Signed out. Happy studying and practicing!","See you soon on Rabbitech.","Bye! Robots ready, ideas ready too.","Thanks for using our tools.","Time to wrap up. Have a wonderful day!","See you! Keep coding with curiosity.","Thanks for sharing your time with us.","Done for today. Until the next discovery!","Signing off. Hope everything goes well!","See you soon. Every great build starts with an idea.","Thanks for your trust. Take care!","This session ends, but creativity doesn't.","See you! Great tests and fewer hacks.","Thanks for visiting. See you next round!","Until next time. Keep making technology happen."],"es":["¡Hasta pronto! Que tu próxima ronda sea brillante.","Gracias por usar Rabbitech. ¡Hasta la próxima!","¡Suerte en los próximos retos! Nos vemos.","¡Nos vemos en la próxima misión!","Hasta pronto, equipo. ¡Sigan mejorando!","Gracias por visitarnos. ¡Vuelve cuando quieras!","Cerramos por ahora. ¡A entrenar!","¡Hasta la próxima ronda de ideas!","Que lleguen grandes descubrimientos. ¡Hasta luego!","Gracias por estar aquí. ¡Nos vemos pronto!","Rabbitech se despide por ahora. ¡Descansa!","Hasta la próxima y buenas construcciones.","Misión pausada por ahora. ¡Hasta luego!","¡Gracias por entrenar con nosotros!","Hasta pronto. Sigue explorando y aprendiendo.","Tu próxima gran idea te espera. ¡Adiós!","Desconectando. ¡Buenos proyectos!","¡Hasta la próxima aventura robótica!","Gracias por formar parte de Rabbitech.","¡Hasta luego! Que tu robot rinda genial.","Un descanso merecido. ¡Hasta la próxima!","Nos vemos en el siguiente desafío.","¡Gracias! Mantén encendida la creatividad.","Hasta luego. Hora de recargar baterías.","Gracias por visitarnos. ¡Suerte en la próxima ronda!","¡Hasta la próxima sesión de práctica!","El equipo agradece tu visita. ¡Hasta pronto!","Sales de Rabbitech. ¡A experimentar!","¡Hasta luego! Sigue creando cosas increíbles.","Sesión terminada. ¡El espíritu de equipo sigue!","¡Gracias por pasar por aquí!","Hasta pronto y sigue probando ideas.","Que tu próxima ronda sume muchos puntos. ¡Adiós!","¡Hasta la próxima misión, piloto!","Gracias por hoy. ¡Mañana habrá más ideas!","Sesión cerrada. ¡Buenos estudios y entrenamientos!","Nos vemos pronto en Rabbitech.","¡Adiós! Robots listos, ideas también.","Gracias por utilizar nuestras herramientas.","Hora de terminar. ¡Que tengas un gran día!","Hasta luego. Sigue programando con curiosidad.","Gracias por compartir tu tiempo con nosotros.","Por hoy terminamos. ¡Hasta el próximo descubrimiento!","Me desconecto. ¡Que todo salga bien!","Hasta pronto. Toda construcción comienza con una idea.","Gracias por confiar en nosotros. ¡Cuídate!","La sesión termina, pero la creatividad sigue.","Hasta luego. Buenas pruebas y menos apaños.","Gracias por visitarnos. ¡Hasta la próxima ronda!","¡Hasta la próxima! Sigue haciendo realidad la tecnología."],"fr":["À bientôt ! Que votre prochain round soit excellent.","Merci d’utiliser Rabbitech. À la prochaine !","Bonne chance pour vos prochains défis. À bientôt !","Rendez-vous à la prochaine mission !","À bientôt, équipe. Continuez à progresser !","Merci de votre visite. Revenez quand vous voulez !","On s’arrête ici pour le moment. Bon entraînement !","À la prochaine session d’idées !","Que de belles découvertes vous attendent. À bientôt !","Merci d’être passé. À très vite !","Rabbitech se déconnecte avec vous. Reposez-vous bien !","À la prochaine et bonnes constructions !","Mission en pause pour le moment. À bientôt !","Merci de vous entraîner avec nous !","À bientôt. Continuez à explorer et à apprendre !","Votre prochaine idée géniale vous attend. À bientôt !","Déconnexion en cours. Bons projets !","À la prochaine aventure robotique !","Merci de faire partie de Rabbitech.","À bientôt ! Que votre robot soit performant.","Une pause bien méritée. À la prochaine !","On se retrouve au prochain défi.","Merci ! Gardez votre créativité allumée.","À bientôt. Il est temps de recharger les batteries.","Merci de votre visite. Bonne chance au prochain round !","À la prochaine séance d’entraînement !","L’équipe vous remercie de votre visite. À bientôt !","Vous quittez Rabbitech. Bonnes expérimentations !","À bientôt ! Continuez à créer des choses formidables.","Session terminée. L’esprit d’équipe reste actif !","Merci d’être passé par ici !","À bientôt, et continuez à tester vos idées.","Que votre prochain round rapporte de beaux points. À bientôt !","À la prochaine mission, pilote !","Merci pour aujourd’hui. D’autres idées demain !","Déconnexion terminée. Bonnes études et bons entraînements !","À bientôt sur Rabbitech.","À bientôt ! Robots prêts, idées aussi.","Merci d’utiliser nos outils.","C’est l’heure de conclure. Passez une excellente journée !","À bientôt ! Continuez à coder avec curiosité.","Merci d’avoir partagé ce moment avec nous.","C’est terminé pour aujourd’hui. À la prochaine découverte !","Je me déconnecte. Que tout se passe bien !","À bientôt. Toute construction commence par une idée.","Merci pour votre confiance. Prenez soin de vous !","La session se termine, pas la créativité.","À bientôt ! De bons tests et moins de bricolage.","Merci de votre visite. Au prochain round !","À la prochaine ! Continuez à faire avancer la technologie."],"de":["Bis bald! Möge deine nächste Runde großartig werden.","Danke, dass du Rabbitech nutzt. Bis zum nächsten Mal!","Viel Erfolg bei den nächsten Herausforderungen. Tschüss!","Bis zur nächsten Mission!","Bis bald, Team. Bleibt dran und verbessert euch!","Danke für deinen Besuch. Komm jederzeit wieder!","Für jetzt ist Schluss. Viel Spaß beim Trainieren!","Bis zur nächsten Runde voller Ideen!","Mögen große Entdeckungen auf dich warten. Bis bald!","Danke, dass du da warst. Bis bald!","Rabbitech verabschiedet sich mit dir. Gute Erholung!","Bis zum nächsten Mal und viel Spaß beim Bauen!","Mission vorerst pausiert. Bis dann!","Danke fürs Training mit uns!","Bis bald. Weiter entdecken und lernen!","Deine nächste geniale Idee wartet schon. Tschüss!","Verbindung wird getrennt. Viel Erfolg bei deinen Projekten!","Bis zum nächsten Robotik-Abenteuer!","Danke, dass du Teil von Rabbitech bist.","Bis bald! Möge dein Roboter großartig laufen.","Eine wohlverdiente Pause. Bis zum nächsten Mal!","Wir sehen uns bei der nächsten Herausforderung.","Danke! Lass deiner Kreativität freien Lauf.","Bis bald. Zeit, die Akkus aufzuladen.","Danke für deinen Besuch. Viel Erfolg in der nächsten Runde!","Bis zur nächsten Trainingseinheit!","Das Team freut sich über deinen Besuch. Bis bald!","Du verlässt Rabbitech. Viel Spaß beim Experimentieren!","Bis dann! Erschaffe weiter großartige Dinge.","Sitzung beendet. Teamgeist bleibt aktiv!","Danke fürs Vorbeischauen!","Bis bald und teste weiter deine Ideen.","Möge deine nächste Runde viele Punkte bringen. Tschüss!","Bis zur nächsten Mission, Pilot!","Danke für heute. Morgen warten neue Ideen!","Abgemeldet. Viel Erfolg beim Lernen und Trainieren!","Bis bald bei Rabbitech.","Tschüss! Roboter bereit, Ideen auch.","Danke, dass du unsere Werkzeuge nutzt.","Zeit aufzuhören. Hab einen schönen Tag!","Bis bald! Programmiere weiter mit Neugier.","Danke, dass du deine Zeit mit uns geteilt hast.","Für heute fertig. Bis zur nächsten Entdeckung!","Ich melde mich ab. Hoffentlich läuft alles gut!","Bis bald. Jeder gute Bau beginnt mit einer Idee.","Danke für dein Vertrauen. Mach's gut!","Diese Sitzung endet, die Kreativität nicht.","Bis bald! Gute Tests und weniger Gebastel.","Danke für deinen Besuch. Bis zur nächsten Runde!","Bis zum nächsten Mal! Gestalte weiter die Technik."],"it":["A presto! Che il tuo prossimo round sia fantastico.","Grazie per usare Rabbitech. Alla prossima!","Buona fortuna con le prossime sfide. A presto!","Ci vediamo alla prossima missione!","A presto, squadra. Continuate a migliorare!","Grazie per la visita. Torna quando vuoi!","Per ora chiudiamo qui. Buon allenamento!","Alla prossima tornata di idee!","Ti aspettano grandi scoperte. A presto!","Grazie di essere passato. A presto!","Rabbitech si congeda con te. Riposati bene!","Alla prossima e buone costruzioni!","Missione in pausa per ora. A presto!","Grazie per allenarti con noi!","A presto. Continua a esplorare e imparare!","La tua prossima idea geniale ti aspetta. Ciao!","Disconnessione in corso. Buoni progetti!","Alla prossima avventura robotica!","Grazie per far parte di Rabbitech.","A presto! Che il tuo robot funzioni alla grande.","Una pausa meritata. Alla prossima!","Ci vediamo alla prossima sfida.","Grazie! Tieni accesa la creatività.","A presto. È ora di ricaricare le batterie.","Grazie per la visita. In bocca al lupo al prossimo round!","Alla prossima sessione di allenamento!","La squadra ti ringrazia per la visita. A presto!","Stai lasciando Rabbitech. Buoni esperimenti!","A presto! Continua a creare cose incredibili.","Sessione conclusa. Lo spirito di squadra resta!","Grazie per essere passato!","A presto, e continua a mettere alla prova le idee.","Che il prossimo round porti tanti punti. Ciao!","Alla prossima missione, pilota!","Grazie per oggi. Domani altre idee!","Disconnessione completata. Buono studio e allenamento!","Ci vediamo presto su Rabbitech.","Ciao! Robot pronti, idee anche.","Grazie per usare i nostri strumenti.","È ora di chiudere. Buona giornata!","A presto! Continua a programmare con curiosità.","Grazie per aver condiviso il tuo tempo con noi.","Per oggi è tutto. Alla prossima scoperta!","Mi disconnetto. Che vada tutto bene!","A presto. Ogni costruzione inizia da un'idea.","Grazie per la fiducia. Stammi bene!","La sessione finisce, la creatività no.","A presto! Buoni test e meno improvvisazioni.","Grazie della visita. Al prossimo round!","Alla prossima! Continua a dare forma alla tecnologia."],"zh-CN":[],"ja":[],"hi":[]};
// Generate 50 distinct localized sign-out messages for each added language (10 openings × 5 closings).
const rbLogoutParts={
 'zh-CN':{starts:['再见！期待下次与你相见。','本次训练先到这里！','任务暂时结束！','感谢你今天来到 Rabbitech！','先休息一下吧！','祝你下一轮发挥出色！','科技探索之旅还会继续！','今天的团队协作很棒！','现在安全退出！','下一次挑战再见！'],ends:['感谢使用 Rabbitech。','祝你训练顺利。','愿你继续保持创造力。','祝下次任务一切顺利。','期待看到你的新创意！']},
 ja:{starts:['また会いましょう！次回も楽しみにしています。','今日の練習はここまでです！','ミッションはいったん終了です！','今日は Rabbitech に来てくれてありがとう！','少し休憩しましょう！','次のラウンドも頑張ってください！','テクノロジーの探求はまだ続きます！','今日のチームワークは素晴らしかったです！','安全にログアウトしました！','次のチャレンジで会いましょう！'],ends:['Rabbitech をご利用いただきありがとうございます。','次の練習も順調に進みますように。','創造力を大切にしてください。','次のミッションの成功を祈っています。','新しいアイデアを楽しみにしています！']},
 hi:{starts:['फिर मिलेंगे! अगली बार भी आपका स्वागत होगा।','आज का अभ्यास यहीं तक!','मिशन अभी के लिए पूरा हुआ!','आज Rabbitech पर आने के लिए धन्यवाद!','थोड़ा आराम कर लें!','अगले राउंड के लिए शुभकामनाएँ!','तकनीक की खोज जारी रहेगी!','आज टीमवर्क शानदार रहा!','आप सुरक्षित रूप से साइन आउट हो गए!','अगली चुनौती में मिलते हैं!'],ends:['Rabbitech इस्तेमाल करने के लिए धन्यवाद।','अगला अभ्यास अच्छा हो।','अपनी रचनात्मकता बनाए रखें।','अगले मिशन के लिए शुभकामनाएँ।','आपके नए विचारों का इंतज़ार रहेगा!']}
};
for(const [locale,parts] of Object.entries(rbLogoutParts)){
 rbLogoutMessages[locale]=parts.starts.flatMap(start=>parts.ends.map(end=>start+' '+end));
}

 let rbLastLogoutIndex=-1;
 function rbGreetingKey(){
  const now=new Date(),minutes=now.getHours()*60+now.getMinutes();
  // Night is 18:00 through 03:00; morning begins at 03:01 and runs to 11:59.
  if(minutes>=18*60||minutes<=3*60)return 3;
  if(minutes<12*60)return 1;
  return 2;
 }
 function rbToast(message){
  let toast=$('rbGreetingToast');
  if(!toast){
   toast=document.createElement('div');toast.id='rbGreetingToast';
   toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
   toast.style.cssText='position:fixed;z-index:2147483000;left:50%;top:max(14px,env(safe-area-inset-top));transform:translateX(-50%);max-width:min(92vw,520px);padding:12px 18px;border:1px solid #71956d;border-radius:14px;background:rgba(7,24,14,.96);color:#f2ffe9;box-shadow:0 8px 28px #0006;font-weight:700;text-align:center;opacity:0;transition:opacity .2s;pointer-events:none';
   document.body.append(toast);
  }
  toast.textContent=message;toast.style.opacity='1';
  clearTimeout(toast._rbHideTimer);toast._rbHideTimer=setTimeout(()=>{toast.style.opacity='0'},3600);
 }
 function rbGreeting(user,kind){
  if(!user)return;
  const locale=rbCurrentLocale(),dict=rbLocaleText[locale]||rbLocaleText.pt;
  const rawName=String(user.user_metadata?.full_name||user.user_metadata?.name||user.email||'').split('@')[0].trim();
  const firstName=rawName.split(/\\s+/)[0]||'';
  const name=firstName?firstName.charAt(0).toLocaleUpperCase()+firstName.slice(1).toLocaleLowerCase():'';
  let message='';
  if(kind==='bye'){
   const pool=rbLogoutMessages[locale]||rbLogoutMessages.pt;
   let index=pool.length>1?Math.floor(Math.random()*pool.length):0;
   if(pool.length>1&&index===rbLastLogoutIndex)index=(index+1+Math.floor(Math.random()*(pool.length-1)))%pool.length;
   rbLastLogoutIndex=index;
   message=pool[index]||dict.bye;
  }else{
   const timeGreeting=dict.welcome[rbGreetingKey()]||dict.welcome[1];
   message=timeGreeting+(name?', '+name:'')+'! '+dict.welcome[0]+'!';
  }
  rbToast(message);
 }
 function rbApplyLanguageFallback(){
  const locale=rbCurrentLocale(),dict=rbLocaleText[locale]||rbLocaleText.pt;
  const nav=document.querySelector('nav.rb-samsung-dock');
  if(nav){
   const labels={score:dict.score,history:dict.history,leaderboard:dict.ranking,strategy:dict.strategy,routes:dict.routes,rules:dict.rules,youtube:dict.tv,music:dict.music,privacy:dict.privacy,'team-workspace':dict.team,admin:dict.admin};
   nav.querySelectorAll('button[data-page]').forEach(button=>{
    const key=button.dataset.page, label=labels[key], node=button.querySelector('.dock-label');
    if(label&&node){
     // This function is called by a body-wide MutationObserver. Only write text
     // when it actually changes, otherwise textContent triggers the observer again
     // and creates an endless mutation/retranslation loop on mobile browsers.
     if(node.textContent!==label)node.textContent=label;
     if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
     if(button.title!==label)button.title=label;
    }
   });
  }
  const teamButton=$('rbTeamWorkspaceNav');
  if(teamButton){
   const label=dict.team,node=teamButton.querySelector('.dock-label');
   if(node&&node.textContent!==label)node.textContent=label;
   if(teamButton.title!==label)teamButton.title=label;
   if(teamButton.getAttribute('aria-label')!==label)teamButton.setAttribute('aria-label',label);
  }
 }
 function initLocalizedGreetings(){
  let lastUserId=currentUser()?.id||null;
  const language=$('rbLanguageQuick')?.querySelector('select')||$('rbLanguageQuickSelect')||$('rbConsentLanguage')||document.querySelector('select[id*="language" i],select[name*="language" i]');
  // The site's existing i18n controller owns rbPreferredLanguage. Do not overwrite
  // a manually selected language with the device language on every page load.
  language?.addEventListener('change',()=>setTimeout(rbApplyLanguageFallback,0));
  rbApplyLanguageFallback();
  window.addEventListener('rb-auth-state-changed',()=>{
   const user=currentUser(),id=user?.id||null;
   if(id&&id!==lastUserId)rbGreeting(user,'welcome');
   lastUserId=id;
  });
  // The logout handler dispatches this only after Supabase confirms sign-out.
  window.addEventListener('rb-auth-logout-complete',event=>{
   const user=event.detail?.user||null;
   if(user)rbGreeting(user,'bye');
  });
 }
 function loadExtendedSiteI18n(){
  if($('rbCompleteI18nScript'))return;
  const script=document.createElement('script');
  script.id='rbCompleteI18nScript';
  script.src='assets/js/site-i18n-complete.js?v=20261029-i18n-coverage-4';
  script.async=true;
  script.onerror=()=>console.warn('Rabbitech multilingual UI package could not be loaded.');
  document.head.appendChild(script);
 }
 function init(){
  loadExtendedSiteI18n();
  removeRetiredAds();setupDock();placeLanguageButton();syncAdmin();loadPublicSettings();initTeamWorkspace();initLocalizedGreetings();ensurePrivacyDisclosure();initFirstVisitTour();
  const observer=new MutationObserver(()=>{
   removeRetiredAds();setupDock();placeLanguageButton();syncAdmin();syncTeamWorkspace();rbApplyLanguageFallback();ensurePrivacyDisclosure();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  let previous='';
  setInterval(()=>{
   const user=currentUser(),key=user?String(user.id||'')+':'+String(adminAllowed()):'out';
   if(key!==previous){previous=key;syncAdmin()}
  },700);
  window.addEventListener('rb-auth-state-changed',()=>{
   syncAdmin();setupSiteSettingsRealtime();loadPublicSettings();
   // initTeamWorkspace owns team auth changes. Do not start a second concurrent
   // renderTeamWorkspace() here: duplicate auth listeners rebuilt the visible UI twice.
  });
  window.addEventListener('rb-site-settings-updated',loadPublicSettings);
  setupSiteSettingsRealtime();
  // Realtime is primary; this low-frequency fallback also retries channel setup.
  setInterval(()=>{setupSiteSettingsRealtime();loadPublicSettings()},60000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();