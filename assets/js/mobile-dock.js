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
   teamShell('<div class="tw-card"><h2>Monte o espaço da sua equipe</h2><p>O mentor cria a equipe; depois compartilha o convite com os alunos. Cada pessoa entra usando a própria conta do Rabbitech.</p><div class="tw-grid"><section><h3>Criar equipe</h3>'+teamFormField('twTeamName','Nome da equipe','Ex.: Techscorpions')+teamFormField('twLeaderName','Seu nome','Nome do mentor')+'<button class="tw-btn" id="twCreate">Criar equipe</button></section><section><h3>Aceitar convite</h3>'+teamFormField('twInviteInput','Código de convite','Cole o código recebido')+teamFormField('twMemberName','Seu nome na equipe','Nome para os colegas')+'<button class="tw-btn" id="twJoin">Entrar na equipe</button></section></div><p class="tw-muted">Uma conta só pode pertencer a uma equipe por vez. O acesso aos dados é protegido no banco, não apenas por esconder botões.</p><div id="twFeedback" aria-live="polite"></div></div>');
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
  teamShell('<div class="tw-card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><p class="tw-muted">ESPAÇO DA EQUIPE</p><h2>'+teamEsc(profile.team_name)+'</h2><p>Olá, '+teamEsc(profile.display_name)+' · '+(manager?'Mentor / responsável':'Membro')+'</p></div><div><button class="tw-btn" id="twRefresh">Atualizar</button><button class="tw-btn" id="twEnableNotifications">Ativar notificações</button></div></div><div class="tw-grid"><div class="tw-card"><div class="tw-stat">'+tasks.length+'</div><div>Tarefas criadas</div></div><div class="tw-card"><div class="tw-stat">'+done+'</div><div>Tarefas concluídas</div></div><div class="tw-card"><div class="tw-stat">'+progress+'%</div><div>Progresso das tarefas</div></div><div class="tw-card"><div class="tw-stat">'+avg+'</div><div>Média dos rounds · '+rounds.length+' registros</div></div></div><p><strong>Tendência:</strong> '+teamEsc(trendText)+'</p></div>'+
   (manager?'<div class="tw-card"><h3>Convidar membros</h3><p>Gere um código para compartilhar com os alunos. O código expira em 7 dias.</p><button class="tw-btn" id="twMakeInvite">Gerar convite</button><div id="twInviteResult" aria-live="polite"></div></div>':'')+
   (manager?'<div class="tw-card"><h3>Nova tarefa</h3><div class="tw-grid">'+teamFormField('twTaskTitle','Tarefa','Ex.: testar missão')+teamFormField('twTaskDue','Prazo','', 'date')+'</div><textarea class="tw-field" id="twTaskDescription" rows="2" maxlength="2000" placeholder="O que precisa ser feito?"></textarea><div class="tw-grid"><label>Prioridade<select class="tw-field" id="twTaskPriority"><option value="normal">Normal</option><option value="high">Alta</option><option value="low">Baixa</option></select></label><label>Atribuir a<select class="tw-field" id="twTaskAssignee">'+memberOptions+'</select></label></div><button class="tw-btn" id="twAddTask">Adicionar tarefa</button></div>':'')+
   '<div class="tw-card"><h3>Quadro Kanban</h3><p class="tw-muted">Mova tarefas entre A fazer, Em andamento e Concluído. O histórico de alterações fica salvo.</p><div class="tw-board">'+taskColumns+'</div></div>'+
   (manager?'<div class="tw-card"><h3>Metas da equipe</h3>'+teamFormField('twGoalTitle','Meta','Ex.: 10 rounds confiáveis')+teamFormField('twGoalDue','Prazo','', 'date')+'<div class="tw-grid"><label>Meta de tarefas<input class="tw-field" id="twGoalTasks" type="number" min="0" max="10000" value="0"></label><label>Meta de rounds<input class="tw-field" id="twGoalRounds" type="number" min="0" max="10000" value="0"></label><label>Média de pontos alvo<input class="tw-field" id="twGoalAverage" type="number" min="0" max="10000" value="0"></label></div><textarea class="tw-field" id="twGoalDescription" rows="2" maxlength="1000" placeholder="Descrição da meta"></textarea><button class="tw-btn" id="twAddGoal">Salvar meta</button></div>':'')+
   '<div class="tw-card"><h3>Metas e progresso</h3><div id="twGoalsList">'+(goalHtml||'<p class="tw-muted">O mentor ainda não cadastrou metas.</p>')+'</div></div>'+
   '<div class="tw-grid"><section class="tw-card"><h3>Registrar round de treino</h3>'+teamFormField('twRoundNumber','Número do round','1','number','min="1" max="10000"')+teamFormField('twRoundScore','Pontuação','0','number','min="0" max="10000"')+'<label style="display:block;margin:7px 0">Onde começou<select class="tw-field" id="twRoundStart"><option value="Base esquerda">Base esquerda</option><option value="Base direita">Base direita</option></select></label>'+teamMissionPicker()+'<textarea class="tw-field" id="twRoundNotes" rows="2" maxlength="2000" placeholder="Observações do round"></textarea><button class="tw-btn" id="twAddRound">Salvar round</button></section><section class="tw-card"><h3>Desempenho dos rounds</h3><p>Média atual: <strong id="twRoundsAverage">'+avg+' pontos</strong></p><div id="twRoundChart">'+chart+'</div><div style="margin-top:10px"><h4>Histórico de rounds</h4><div id="twRoundList">'+(rounds.slice().reverse().map(r=>'<article class="tw-task" data-round-id="'+teamEsc(r.id)+'"><strong>Round '+teamEsc(r.round_number)+'</strong><p>'+Number(r.score||0)+' pontos · '+teamEsc(r.start_position||'Início não informado')+'</p><p class="tw-muted">'+teamEsc(r.notes||'')+'</p>'+((manager||r.created_by===profile.user_id)?'<button class="tw-btn" data-team-delete="team_round_logs" data-record-id="'+teamEsc(r.id)+'">Excluir round</button>':'')+'</article>').join('')||'<p class="tw-muted">Nenhum round registrado.</p>')+'</div></div><p id="twRoundCountFooter" class="tw-muted">'+rounds.length+' rounds de treino registrados.</p></section></div>'+
   '<div class="tw-grid"><section class="tw-card"><h3>Notas compartilhadas</h3>'+teamFormField('twNoteTitle','Título da nota','Ideias da reunião')+'<textarea class="tw-field" id="twNoteBody" rows="4" maxlength="8000" placeholder="Planejamento, decisões, o que testar..."></textarea><button class="tw-btn" id="twAddNote">Salvar anotação</button><div id="twNotesList">'+(notes.slice().reverse().map(n=>'<article class="tw-task" data-team-note-id="'+teamEsc(n.id)+'"><strong>'+teamEsc(n.title)+'</strong><p style="white-space:pre-wrap">'+teamEsc(n.body)+'</p><small class="tw-muted">'+teamEsc(new Date(n.created_at).toLocaleString())+' · '+teamEsc(members.find(m=>m.user_id===n.author_user_id)?.display_name||'Membro')+'</small>'+((manager||n.author_user_id===profile.user_id)?'<button class="tw-btn" data-team-delete="team_notes" data-record-id="'+teamEsc(n.id)+'">Excluir anotação</button>':'')+'</article>').join('')||'<p class="tw-muted">Nenhuma anotação ainda.</p>')+'</div></section>'+
   '<section class="tw-card"><h3>Chat da equipe</h3><p class="tw-muted">Mensagens de texto compartilhadas entre membros. Sem chamadas.</p><div id="twMessages" style="max-height:300px;overflow:auto">'+messages.slice(-60).map(m=>'<div class="tw-bubble" data-message-id="'+teamEsc(m.id)+'" data-created-at="'+teamEsc(m.created_at)+'"><strong>'+teamEsc(members.find(x=>x.user_id===m.author_user_id)?.display_name||'Membro')+'</strong><p style="white-space:pre-wrap;margin:4px 0">'+teamEsc(m.body)+'</p><small class="tw-muted">'+teamEsc(new Date(m.created_at).toLocaleString())+'</small>'+((manager||m.author_user_id===profile.user_id)?'<button class="tw-btn" data-team-delete="team_messages" data-record-id="'+teamEsc(m.id)+'">Apagar mensagem</button>':'')+'</div>').join('')+'</div><textarea class="tw-field" id="twMessageBody" rows="2" maxlength="2000" placeholder="Escreva para a equipe..."></textarea><button class="tw-btn" id="twSendMessage">Enviar mensagem</button></section></div>'+
   '<div id="twFeedback" aria-live="polite"></div>');
  $('twRefresh')?.addEventListener('click',()=>{refreshTeamBackground();teamFeedback('Atualizando os dados em segundo plano…')});
  $('twEnableNotifications')?.addEventListener('click',requestTeamNotifications);
  $('twMakeInvite')?.addEventListener('click',createTeamInvite);
  $('twAddTask')?.addEventListener('click',createTeamTask);
  $('twAddGoal')?.addEventListener('click',createTeamGoal);
  $('twAddRound')?.addEventListener('click',createTeamRound);
  $('twAddNote')?.addEventListener('click',createTeamNote);
  $('twSendMessage')?.addEventListener('click',sendTeamMessage);
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
 async function createTeamInvite(){
  const t=teamState.team;if(!t?.team_id)return;
  const c=teamClient();try{const r=await c.rpc('create_team_invite',{p_team_id:t.team_id,p_expires_days:7,p_max_uses:20});if(r.error)throw r.error;const data=Array.isArray(r.data)?r.data[0]:r.data;teamState.inviteCode=data.code;const out=$('twInviteResult');if(out)out.innerHTML='<p>Convite criado. Compartilhe este código com os membros:</p><code style="overflow-wrap:anywhere">'+teamEsc(data.code)+'</code><p class="tw-muted">Expira em '+teamEsc(new Date(data.expires_at).toLocaleString())+'</p><button class="tw-btn" id="twCopyInvite">Copiar código</button>'; $('twCopyInvite')?.addEventListener('click',()=>{try{navigator.clipboard.writeText(data.code);$('twCopyInvite').textContent='Copiado'}catch(_){teamFeedback('Selecione e copie o código manualmente.')}})}catch(e){teamFeedback(e.message||'Não foi possível gerar o convite.',true)}
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
  const box=$('twMessages');if(!box)return;
  const cachedName=teamState.members?.find(m=>String(m.user_id)===String(message.author_user_id))?.display_name;
  const name=cachedName&&String(cachedName).trim()?String(cachedName).trim():(message.author_user_id===teamState.profile?.user_id?(teamState.profile?.display_name||'Membro'):'Membro');
  const bubble=document.createElement('div');bubble.className='tw-bubble';if(pending)bubble.dataset.pendingMessage='true';
  const strong=document.createElement('strong');strong.textContent=name;
  if(!pending&&name==='Membro'&&message.author_user_id){resolveTeamMemberName(message.author_user_id,message.team_id).then(resolved=>{if(bubble.isConnected&&resolved&&resolved!=='Membro')strong.textContent=resolved})}
  const body=document.createElement('p');body.style.cssText='white-space:pre-wrap;margin:4px 0';body.textContent=message.body;
  const time=document.createElement('small');time.className='tw-muted';time.textContent=pending?'Enviando…':new Date(message.created_at).toLocaleString();
  bubble.append(strong,body,time);
  if(!pending&&(teamState.profile?.is_manager===true||teamState.profile?.role==='leader'||message.author_user_id===teamState.profile?.user_id)){
   const del=document.createElement('button');del.type='button';del.className='tw-btn';del.dataset.teamDelete='team_messages';del.dataset.recordId=String(message.id);del.textContent='Apagar mensagem';bubble.append(del);
  }
  box.appendChild(bubble);box.scrollTop=box.scrollHeight;
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
    client.from('team_messages').select('id,author_user_id,body,created_at').eq('team_id',teamId).order('created_at',{ascending:true}).limit(60),
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
     const h=bubble.querySelector('strong'),p=bubble.querySelector('p'),meta=bubble.querySelector('small');
     const knownName=teamState.members?.find(m=>String(m.user_id)===String(message.author_user_id))?.display_name;
     if(h)h.textContent=knownName&&String(knownName).trim()?String(knownName).trim():(message.author_user_id===teamState.profile?.user_id?(teamState.profile?.display_name||'Membro'):'Membro');
     if(h&&h.textContent==='Membro'&&message.author_user_id)resolveTeamMemberName(message.author_user_id,message.team_id).then(resolved=>{if(h.isConnected&&resolved&&resolved!=='Membro')h.textContent=resolved});
     if(p&&p.textContent!==String(message.body||''))p.textContent=message.body||'';
     const time=new Date(message.created_at).toLocaleString();if(meta&&meta.textContent!==time)meta.textContent=time;
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
  it:{welcome:['Bentornato su Rabbitech','Buongiorno','Buon pomeriggio','Buonasera'],bye:'A presto! Grazie per usare Rabbitech. Torna quando vuoi!',team:'Squadra',admin:'Amministrazione',score:'Punteggio',history:'Cronologia',ranking:'Classifica',strategy:'Strategia',routes:'Percorsi',rules:'Regole',tv:'Rabbitech TV',music:'Musica',privacy:'Privacy',refresh:'Aggiorna',createTeam:'Crea squadra',joinTeam:'Unisciti a una squadra'}
 };
 function rbCurrentLocale(){
  let saved='';
  try{saved=localStorage.getItem('rbPreferredLanguage')||''}catch(_){}
  const selector=$('rbLanguageQuick')?.querySelector('select')||$('rbLanguageQuickSelect')||$('rbLanguageGateSelect')||$('rbConsentLanguage');
  const chosen=String(saved||selector?.value||'').trim().toLowerCase().replace('_','-');
  const raw=chosen||String(navigator.languages?.[0]||navigator.language||document.documentElement.lang||'pt-BR').trim().toLowerCase().replace('_','-');
  if(raw.startsWith('pt'))return 'pt';
  if(raw.startsWith('en'))return 'en';
  if(raw.startsWith('es'))return 'es';
  if(raw.startsWith('fr'))return 'fr';
  if(raw.startsWith('de'))return 'de';
  if(raw.startsWith('it'))return 'it';
  return 'pt';
 }
 function rbGreetingKey(){
  const hour=new Date().getHours();
  return hour<12?1:hour<18?2:3;
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
  const name=String(user.user_metadata?.full_name||user.user_metadata?.name||user.email||'').split('@')[0].trim();
  const greeting=kind==='bye'
   ?dict.bye
   :dict.welcome[0]+(name?', '+name:'')+'! '+dict.welcome[rbGreetingKey()]+'!';
  rbToast(greeting);
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
 function init(){
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