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
   lastFeatureFlags=flags;lastNoticeActive=settings.notice_active===true;
   applyFeatureFlags(flags,lastNoticeActive);
  }catch(error){console.warn('Rabbitech feature flags could not be refreshed',error)}
 }
 function applyFeatureFlags(flags,noticeActive){
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
   if(!noticesEnabled)element.setAttribute('aria-hidden','true');
   else element.removeAttribute('aria-hidden');
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
 let teamState={profile:null,team:null,loading:false,refreshing:false,inviteCode:'',timer:null};
 const teamEsc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const teamClient=()=>getSupabaseClient();
 function ensureTeamPage(){
  let nav=document.querySelector('nav button[data-page]')?.closest('nav');
  if(!nav)return null;
  let button=nav.querySelector('button[data-page="team-workspace"]');
  if(!button){
   button=document.createElement('button');button.type='button';button.dataset.page='team-workspace';button.textContent='Equipe';button.setAttribute('aria-label','Área da equipe');nav.append(button);
   button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openTeamPage()});
  }
  let page=$('page-team-workspace');
  if(!page){
   const main=document.querySelector('main')||document.body;
   page=document.createElement('section');page.id='page-team-workspace';page.className='page';page.hidden=true;
   page.style.cssText='max-width:1100px;margin:0 auto;padding:18px 14px 110px;color:var(--text,#eef7eb)';
   page.innerHTML='<div id="rbTeamWorkspaceRoot"></div>';
   main.append(page);
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
  document.querySelectorAll('main .page').forEach(p=>{p.classList.remove('active');p.hidden=true});
  refs.page.hidden=false;refs.page.classList.add('active');
  document.querySelectorAll('nav button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page==='team-workspace'));
  await renderTeamWorkspace();
 }
 function teamShell(body){
  const root=$('rbTeamWorkspaceRoot');if(!root)return;
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
 }
 function teamFormField(id,label,placeholder,type='text',attrs=''){
  return '<label style="display:block;margin:7px 0">'+teamEsc(label)+'<input class="tw-field" id="'+id+'" type="'+type+'" placeholder="'+teamEsc(placeholder)+'" '+attrs+'></label>';
 }
 async function renderTeamWorkspace(){
  const root=$('rbTeamWorkspaceRoot');if(!root)return;
  const c=teamClient(),user=await teamAuthUser();
  if(!c||!user){
   teamShell('<div class="tw-card"><h2>👥 Espaço da equipe</h2><p>Entre na sua conta do Rabbitech para criar uma equipe ou aceitar um convite.</p></div>');return;
  }
  teamShell('<div class="tw-card"><h2>👥 Espaço da equipe</h2><p>Carregando sua equipe com segurança…</p></div>');
  let result;
  try{result=await c.rpc('get_my_team_workspace')}catch(e){teamShell('<div class="tw-card"><h2>Espaço da equipe</h2><p>Não foi possível consultar sua equipe: '+teamEsc(e.message||e)+'</p><button class="tw-btn" id="twRetry">Tentar novamente</button></div>');$('twRetry')?.addEventListener('click',renderTeamWorkspace);return}
  if(result?.error){teamShell('<div class="tw-card"><h2>Espaço da equipe</h2><p>O Supabase recusou a consulta. Verifique sua sessão e as permissões do projeto.</p><p class="tw-muted">'+teamEsc(result.error.message)+'</p><button class="tw-btn" id="twRetry">Tentar novamente</button></div>');$('twRetry')?.addEventListener('click',renderTeamWorkspace);return}
  const profile=Array.isArray(result.data)?result.data[0]:result.data;
  teamState.profile=profile||null;teamState.team=profile?.member?profile:null;
  if(!profile?.member){
   teamShell('<div class="tw-card"><h2>Monte o espaço da sua equipe</h2><p>O mentor cria a equipe; depois compartilha o convite com os alunos. Cada pessoa entra usando a própria conta do Rabbitech.</p><div class="tw-grid"><section><h3>Criar equipe</h3>'+teamFormField('twTeamName','Nome da equipe','Ex.: Techscorpions')+teamFormField('twLeaderName','Seu nome','Nome do mentor')+'<button class="tw-btn" id="twCreate">Criar equipe</button></section><section><h3>Aceitar convite</h3>'+teamFormField('twInviteInput','Código de convite','Cole o código recebido')+teamFormField('twMemberName','Seu nome na equipe','Nome para os colegas')+'<button class="tw-btn" id="twJoin">Entrar na equipe</button></section></div><p class="tw-muted">Uma conta só pode pertencer a uma equipe por vez. O acesso aos dados é protegido no banco, não apenas por esconder botões.</p><div id="twMessage" aria-live="polite"></div></div>');
   $('twCreate')?.addEventListener('click',createTeamWorkspace);$('twJoin')?.addEventListener('click',joinTeamWorkspace);return;
  }
  const teamId=profile.team_id;
  let tasks=[],goals=[],notes=[],rounds=[],messages=[],members=[];
  const query=async(table,columns='*',order='created_at')=>{const r=await c.from(table).select(columns).eq('team_id',teamId).order(order,{ascending:true}).limit(250);if(r.error)throw r.error;return r.data||[]};
  try{
   [tasks,goals,notes,rounds,messages,members]=await Promise.all([
    query('team_tasks','*','created_at'),query('team_goals','*','created_at'),query('team_notes','*','created_at'),
    query('team_round_logs','*','performed_at'),query('team_messages','*','created_at'),query('team_memberships','id,team_id,user_id,display_name,role,created_at','created_at')
   ]);
  }catch(e){teamShell('<div class="tw-card"><h2>'+teamEsc(profile.team_name)+'</h2><p>Não foi possível carregar todos os dados da equipe. Confira as políticas RLS.</p><p class="tw-muted">'+teamEsc(e.message||e)+'</p><button class="tw-btn" id="twRetry">Recarregar</button></div>');$('twRetry')?.addEventListener('click',renderTeamWorkspace);return}
  const done=tasks.filter(t=>t.status==='done').length,progress=tasks.length?Math.round(done/tasks.length*100):0;
  const avg=rounds.length?Math.round(rounds.reduce((sum,r)=>sum+Number(r.score||0),0)/rounds.length):0;
  const recent=rounds.slice(-5),previous=rounds.slice(-10,-5);
  const avgOf=arr=>arr.length?arr.reduce((s,r)=>s+Number(r.score||0),0)/arr.length:0;
  const trend=recent.length&&previous.length?(avgOf(recent)-avgOf(previous)):null;
  const trendText=trend===null?'Ainda sem dados suficientes':trend>0?'Melhorando +' + Math.round(trend)+' pts':trend<0?'Caindo '+Math.round(trend)+' pts':'Estável';
  const manager=profile.is_manager===true||profile.role==='leader';
  const statusTasks=state=>tasks.filter(t=>t.status===state);
  const taskCard=t=>'<article class="tw-task"><strong>'+teamEsc(t.title)+'</strong><p>'+teamEsc(t.description||'')+'</p><p class="tw-muted">Prioridade: '+teamEsc(t.priority)+' · '+(t.due_date?'Prazo '+teamEsc(t.due_date):'Sem prazo')+'</p><p class="tw-muted">Responsável: '+teamEsc(members.find(m=>m.user_id===t.assigned_to)?.display_name||'Equipe toda')+'</p><label class="tw-muted">Status <select class="tw-field" data-task-status="'+teamEsc(t.id)+'">'+TEAM_STATES.map(s=>'<option value="'+s+'" '+(t.status===s?'selected':'')+'>'+TEAM_LABELS[s]+'</option>').join('')+'</select></label></article>';
  const taskColumns=TEAM_STATES.map(s=>'<section class="tw-card"><h3>'+TEAM_LABELS[s]+' ('+statusTasks(s).length+')</h3>'+statusTasks(s).map(taskCard).join('')+'</section>').join('');
  const memberOptions='<option value="">Equipe toda</option>'+members.map(m=>'<option value="'+teamEsc(m.user_id)+'">'+teamEsc(m.display_name)+(m.role==='leader'?' · mentor':'')+'</option>').join('');
  const goalHtml=goals.map(g=>{const taskPct=g.target_tasks?Math.min(100,Math.round(done/g.target_tasks*100)):0;const roundPct=g.target_rounds?Math.min(100,Math.round(rounds.length/g.target_rounds*100)):0;return '<div class="tw-task"><strong>'+teamEsc(g.title)+'</strong><p>'+teamEsc(g.description||'')+'</p><p>Tarefas: '+done+'/'+g.target_tasks+' ('+taskPct+'%)</p><progress max="100" value="'+taskPct+'" style="width:100%"></progress><p>Rounds registrados: '+rounds.length+'/'+g.target_rounds+' ('+roundPct+'%)</p><progress max="100" value="'+roundPct+'" style="width:100%"></progress><p>Meta de média: '+Number(g.target_average_score||0)+' pts · '+teamEsc(g.due_date||'Sem prazo')+'</p></div>'}).join('');
  const chart=recent.length?'<div style="display:flex;align-items:end;gap:8px;height:140px;padding:8px 0">'+recent.map((r,i)=>'<div style="flex:1;min-width:24px;text-align:center"><div title="'+Number(r.score||0)+' pontos" style="height:'+Math.max(5,Math.round(Number(r.score||0)/Math.max(1,...recent.map(x=>Number(x.score||0)))*105))+'px;background:#9dcc65;border-radius:6px 6px 0 0"></div><small>'+teamEsc('R'+r.round_number)+'</small><br><strong>'+Number(r.score||0)+'</strong></div>').join('')+'</div>':'<p class="tw-muted">Registre os rounds abaixo para começar o gráfico de desempenho.</p>';
  teamShell('<div class="tw-card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><p class="tw-muted">ESPAÇO DA EQUIPE</p><h2>'+teamEsc(profile.team_name)+'</h2><p>Olá, '+teamEsc(profile.display_name)+' · '+(manager?'Mentor / responsável':'Membro')+'</p></div><button class="tw-btn" id="twRefresh">Atualizar</button></div><div class="tw-grid"><div class="tw-card"><div class="tw-stat">'+tasks.length+'</div><div>Tarefas criadas</div></div><div class="tw-card"><div class="tw-stat">'+done+'</div><div>Tarefas concluídas</div></div><div class="tw-card"><div class="tw-stat">'+progress+'%</div><div>Progresso das tarefas</div></div><div class="tw-card"><div class="tw-stat">'+avg+'</div><div>Média dos rounds · '+rounds.length+' registros</div></div></div><p><strong>Tendência:</strong> '+teamEsc(trendText)+'</p></div>'+
   (manager?'<div class="tw-card"><h3>Convidar membros</h3><p>Gere um código para compartilhar com os alunos. O código expira em 7 dias.</p><button class="tw-btn" id="twMakeInvite">Gerar convite</button><div id="twInviteResult" aria-live="polite"></div></div>':'')+
   (manager?'<div class="tw-card"><h3>Nova tarefa</h3><div class="tw-grid">'+teamFormField('twTaskTitle','Tarefa','Ex.: testar missão')+teamFormField('twTaskDue','Prazo','', 'date')+'</div><textarea class="tw-field" id="twTaskDescription" rows="2" maxlength="2000" placeholder="O que precisa ser feito?"></textarea><div class="tw-grid"><label>Prioridade<select class="tw-field" id="twTaskPriority"><option value="normal">Normal</option><option value="high">Alta</option><option value="low">Baixa</option></select></label><label>Atribuir a<select class="tw-field" id="twTaskAssignee">'+memberOptions+'</select></label></div><button class="tw-btn" id="twAddTask">Adicionar tarefa</button></div>':'')+
   '<div class="tw-card"><h3>Quadro Kanban</h3><p class="tw-muted">Mova tarefas entre A fazer, Em andamento e Concluído. O histórico de alterações fica salvo.</p><div class="tw-board">'+taskColumns+'</div></div>'+
   (manager?'<div class="tw-card"><h3>Metas da equipe</h3>'+teamFormField('twGoalTitle','Meta','Ex.: 10 rounds confiáveis')+teamFormField('twGoalDue','Prazo','', 'date')+'<div class="tw-grid"><label>Meta de tarefas<input class="tw-field" id="twGoalTasks" type="number" min="0" max="10000" value="0"></label><label>Meta de rounds<input class="tw-field" id="twGoalRounds" type="number" min="0" max="10000" value="0"></label><label>Média de pontos alvo<input class="tw-field" id="twGoalAverage" type="number" min="0" max="10000" value="0"></label></div><textarea class="tw-field" id="twGoalDescription" rows="2" maxlength="1000" placeholder="Descrição da meta"></textarea><button class="tw-btn" id="twAddGoal">Salvar meta</button></div>':'')+
   '<div class="tw-card"><h3>Metas e progresso</h3>'+(goalHtml||'<p class="tw-muted">O mentor ainda não cadastrou metas.</p>')+'</div>'+
   '<div class="tw-grid"><section class="tw-card"><h3>Registrar round de treino</h3>'+teamFormField('twRoundNumber','Número do round','1','number','min="1" max="10000"')+teamFormField('twRoundScore','Pontuação','0','number','min="0" max="10000"')+teamFormField('twRoundStart','Onde começou','Ex.: base / lado esquerdo')+'<textarea class="tw-field" id="twRoundMissions" rows="2" maxlength="2000" placeholder="Missões tentadas"></textarea><textarea class="tw-field" id="twRoundNotes" rows="2" maxlength="2000" placeholder="Observações do round"></textarea><button class="tw-btn" id="twAddRound">Salvar round</button></section><section class="tw-card"><h3>Desempenho dos rounds</h3><p>Média atual: <strong>'+avg+' pontos</strong></p>'+chart+'<p class="tw-muted">'+rounds.length+' rounds de treino registrados.</p></section></div>'+
   '<div class="tw-grid"><section class="tw-card"><h3>Notas compartilhadas</h3>'+teamFormField('twNoteTitle','Título da nota','Ideias da reunião')+'<textarea class="tw-field" id="twNoteBody" rows="4" maxlength="8000" placeholder="Planejamento, decisões, o que testar..."></textarea><button class="tw-btn" id="twAddNote">Salvar anotação</button><div>'+(notes.slice().reverse().map(n=>'<article class="tw-task"><strong>'+teamEsc(n.title)+'</strong><p style="white-space:pre-wrap">'+teamEsc(n.body)+'</p><small class="tw-muted">'+teamEsc(new Date(n.created_at).toLocaleString())+' · '+teamEsc(members.find(m=>m.user_id===n.author_user_id)?.display_name||'Membro')+'</small></article>').join('')||'<p class="tw-muted">Nenhuma anotação ainda.</p>')+'</div></section>'+
   '<section class="tw-card"><h3>Chat da equipe</h3><p class="tw-muted">Mensagens de texto compartilhadas entre membros. Sem chamadas.</p><div id="twMessages" style="max-height:300px;overflow:auto">'+messages.slice(-60).map(m=>'<div class="tw-bubble"><strong>'+teamEsc(members.find(x=>x.user_id===m.author_user_id)?.display_name||'Membro')+'</strong><p style="white-space:pre-wrap;margin:4px 0">'+teamEsc(m.body)+'</p><small class="tw-muted">'+teamEsc(new Date(m.created_at).toLocaleString())+'</small></div>').join('')+'</div><textarea class="tw-field" id="twMessageBody" rows="2" maxlength="2000" placeholder="Escreva para a equipe..."></textarea><button class="tw-btn" id="twSendMessage">Enviar mensagem</button></section></div>'+
   '<div id="twFeedback" aria-live="polite"></div>');
  $('twRefresh')?.addEventListener('click',renderTeamWorkspace);
  $('twMakeInvite')?.addEventListener('click',createTeamInvite);
  $('twAddTask')?.addEventListener('click',createTeamTask);
  $('twAddGoal')?.addEventListener('click',createTeamGoal);
  $('twAddRound')?.addEventListener('click',createTeamRound);
  $('twAddNote')?.addEventListener('click',createTeamNote);
  $('twSendMessage')?.addEventListener('click',sendTeamMessage);
  document.querySelectorAll('#rbTeamWorkspaceRoot [data-task-status]').forEach(sel=>sel.addEventListener('change',()=>changeTeamTaskStatus(sel.dataset.taskStatus,sel.value)));
 }
 function teamFeedback(message,error=false){
  const el=$('twFeedback')||$('twMessage');if(el)el.innerHTML='<p style="color:'+(error?'#ffb4a9':'#d0f477')+'">'+teamEsc(message)+'</p>';
 }
 async function teamWrite(operation){
  const c=teamClient();if(!c){teamFeedback('A conexão com o Supabase não está disponível.',true);return null}
  try{const r=await operation(c);if(r?.error)throw r.error;teamFeedback('Salvo com sucesso.');await renderTeamWorkspace();return r?.data??r}
  catch(e){teamFeedback(e?.message||'Não foi possível salvar. Confira a conexão e as permissões.',true);return null}
 }
 async function createTeamWorkspace(){
  const name=$('twTeamName')?.value.trim(),display=$('twLeaderName')?.value.trim();if(!name||!display){teamFeedback('Preencha o nome da equipe e o seu nome.',true);return}
  await teamWrite(c=>c.rpc('create_team_workspace',{p_name:name,p_display_name:display}));
 }
 async function joinTeamWorkspace(){
  const code=$('twInviteInput')?.value.trim(),display=$('twMemberName')?.value.trim();if(!code||!display){teamFeedback('Informe o código do convite e seu nome.',true);return}
  await teamWrite(c=>c.rpc('join_team_with_code',{p_code:code,p_display_name:display}));
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
  const c=teamClient();try{const r=await c.rpc('set_team_task_status',{p_task_id:id,p_status:status,p_note:''});if(r.error)throw r.error;await renderTeamWorkspace()}catch(e){teamFeedback(e.message||'Não foi possível atualizar a tarefa.',true);await renderTeamWorkspace()}
 }
 async function createTeamGoal(){
  const t=teamState.team,p=teamState.profile;const title=$('twGoalTitle')?.value.trim();if(!title){teamFeedback('Informe o nome da meta.',true);return}
  await teamWrite(c=>c.from('team_goals').insert({team_id:t.team_id,title,description:$('twGoalDescription')?.value.trim()||'',target_tasks:Number($('twGoalTasks')?.value||0),target_rounds:Number($('twGoalRounds')?.value||0),target_average_score:Number($('twGoalAverage')?.value||0),due_date:$('twGoalDue')?.value||null,created_by:p.user_id}));
 }
 async function createTeamRound(){
  const t=teamState.team,p=teamState.profile,roundNumber=Number($('twRoundNumber')?.value),score=Number($('twRoundScore')?.value||0);if(!Number.isInteger(roundNumber)||roundNumber<1||score<0){teamFeedback('Confira o número do round e a pontuação.',true);return}
  await teamWrite(c=>c.from('team_round_logs').insert({team_id:t.team_id,created_by:p.user_id,round_number:roundNumber,score,start_position:$('twRoundStart')?.value.trim()||'',missions:$('twRoundMissions')?.value.trim()||'',notes:$('twRoundNotes')?.value.trim()||''}));
 }
 async function createTeamNote(){
  const t=teamState.team,p=teamState.profile,title=$('twNoteTitle')?.value.trim(),body=$('twNoteBody')?.value.trim();if(!title||!body){teamFeedback('Preencha o título e o conteúdo da anotação.',true);return}
  await teamWrite(c=>c.from('team_notes').insert({team_id:t.team_id,author_user_id:p.user_id,title,body}));
 }
 async function sendTeamMessage(){
  const t=teamState.team,p=teamState.profile,body=$('twMessageBody')?.value.trim();if(!body)return;
  await teamWrite(c=>c.from('team_messages').insert({team_id:t.team_id,author_user_id:p.user_id,body}));
 }
 function syncTeamWorkspace(){
  const refs=ensureTeamPage();if(!refs)return;
  const user=teamClientUser();refs.button.hidden=!user;
 }
 function initTeamWorkspace(){
  syncTeamWorkspace();
  window.addEventListener('rb-auth-state-changed',()=>{syncTeamWorkspace();if($('page-team-workspace')?.classList.contains('active'))renderTeamWorkspace()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('page-team-workspace')?.classList.contains('active'))renderTeamWorkspace()});
  setInterval(()=>{if(!document.hidden&&$('page-team-workspace')?.classList.contains('active'))renderTeamWorkspace()},15000);
 }

 function init(){
  setupDock();placeLanguageButton();syncAdmin();loadPublicSettings();initTeamWorkspace();
  const observer=new MutationObserver(()=>{
   setupDock();placeLanguageButton();syncAdmin();syncTeamWorkspace();
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