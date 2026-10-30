/* Rabbitech Team Workspace: member-only Kanban board, backed by Supabase RLS/RPCs. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'');
 let workspace=null, tasks=[], members=[], events=[], goals=[], notes=[], roundLogs=[], messages=[], loading=false, scriptReady=false;
 const STATUS=[['todo','A fazer'],['in_progress','Em andamento'],['done','Concluída']];
 const PRIORITY=[['low','Baixa'],['normal','Normal'],['high','Alta']];
 function client(){try{if(typeof rbClient!=='undefined'&&rbClient)return rbClient}catch(_){}return window.rbClient||window.supabaseClient||null}
 function user(){try{return (typeof rbCloudUser!=='undefined'&&rbCloudUser)||window.rbCloudUser||null}catch(_){return window.rbCloudUser||null}}
 function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el}
 function button(text,cls,action){const b=node('button',cls||'rb-team-btn',text);b.type='button';if(action)b.addEventListener('click',action);return b}
 function input(labelText,type,value,placeholder){const wrap=node('label','rb-team-label',labelText);const el=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')el.type=type||'text';if(value!==undefined)el.value=value;if(placeholder)el.placeholder=placeholder;wrap.appendChild(el);return {wrap,el}}
 function select(labelText,options,value){const wrap=node('label','rb-team-label',labelText),el=node('select');options.forEach(([v,t])=>{const o=node('option','',t);o.value=v;el.appendChild(o)});if(value!==undefined)el.value=value;wrap.appendChild(el);return {wrap,el}}
 function addStyles(){if($('rbTeamWorkspaceStyles'))return;const style=node('style');style.id='rbTeamWorkspaceStyles';style.textContent=`
  #page-team-workspace{max-width:1200px;margin:0 auto;padding:clamp(12px,3vw,26px);color:var(--text,#edf7ed)}
  .rb-team-panel{border:1px solid var(--line,rgba(208,244,119,.22));border-radius:16px;padding:16px;background:var(--panel,rgba(7,19,12,.88));margin:12px 0;min-width:0}
  .rb-team-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .rb-team-muted{color:var(--muted,#a9b9ad);font-size:13px;line-height:1.5}
  .rb-team-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  .rb-team-stat{padding:12px;border:1px solid var(--line,rgba(208,244,119,.2));border-radius:12px;min-width:0}
  .rb-team-stat strong{display:block;font-size:24px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
  .rb-team-stat span{font-size:12px;color:var(--muted,#a9b9ad)}
  .rb-team-kanban{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}
  .rb-team-column{min-width:0;padding:10px;border:1px solid var(--line,rgba(208,244,119,.18));border-radius:14px;background:rgba(0,0,0,.12)}
  .rb-team-column h3{font-size:15px;margin:3px 0 12px}
  .rb-team-task{padding:12px;margin:9px 0;border:1px solid var(--line,rgba(208,244,119,.18));border-radius:12px;background:var(--panel,#07140d);overflow-wrap:anywhere}
  .rb-team-task h4{margin:0 0 7px;font-size:15px}
  .rb-team-task p{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}
  .rb-team-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .rb-team-label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--muted,#a9b9ad);min-width:0}
  .rb-team-label input,.rb-team-label textarea,.rb-team-label select{box-sizing:border-box;width:100%;min-width:0;border:1px solid var(--line,#49684b);border-radius:9px;padding:10px;background:var(--panel2,#07140d);color:var(--text,#edf7ed);font:inherit}
  .rb-team-label textarea{resize:vertical;min-height:80px}
  .rb-team-btn{border:1px solid var(--line,#49684b);border-radius:10px;padding:9px 12px;min-height:38px;background:rgba(208,244,119,.1);color:inherit;font:inherit;font-weight:700;cursor:pointer}
  .rb-team-btn:disabled{opacity:.5;cursor:wait}
  .rb-team-badge{display:inline-block;border:1px solid var(--line,#49684b);border-radius:99px;padding:3px 8px;font-size:11px;margin:2px 4px 2px 0}
  .rb-team-notice{padding:10px 12px;border-radius:10px;background:rgba(208,244,119,.08);overflow-wrap:anywhere}
  .rb-team-member-row{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--line,rgba(208,244,119,.12))}
  @media(max-width:760px){.rb-team-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rb-team-kanban{grid-template-columns:minmax(0,1fr)}.rb-team-fields{grid-template-columns:minmax(0,1fr)}}
  @media(prefers-reduced-motion:reduce){#page-team-workspace *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
 `;document.head.appendChild(style)}
 function makePage(){let page=$('page-team-workspace');if(!page){const main=document.querySelector('main');if(!main)return null;page=node('section','page');page.id='page-team-workspace';page.hidden=true;page.setAttribute('aria-labelledby','rbTeamTitle');main.appendChild(page)}return page}
 function makeNav(){const nav=document.querySelector('nav button[data-page]')?.closest('nav');if(!nav)return null;let b=nav.querySelector('button[data-page="team-workspace"]');if(!b){b=button('Equipe','',()=>openBoard());b.dataset.page='team-workspace';b.setAttribute('aria-label','Espaço da equipe');b.title='Tarefas e acompanhamento da equipe';const admin=nav.querySelector('#rbAdminNav,button[data-page="admin"]');if(admin)nav.insertBefore(b,admin);else nav.appendChild(b)}return b}
 function removeNav(){const b=document.querySelector('nav button[data-page="team-workspace"]');if(b)b.remove();const page=$('page-team-workspace');if(page){page.hidden=true;page.classList.remove('active')}}
 function goToPage(){const page=makePage();if(!page)return;document.querySelectorAll('main .page').forEach(p=>{p.classList.remove('active');p.hidden=true});page.hidden=false;page.classList.add('active');document.querySelectorAll('nav button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page==='team-workspace'));if(!page.dataset.rbInitialNavigationDone){page.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});page.dataset.rbInitialNavigationDone='true'}}
 function showJoinCard(){if(!$('rbTeamJoinCard'))return;const card=$('rbTeamJoinCard');card.hidden=false;setEntryMode('join')}
 function showEntryMessage(message){const status=$('rbTeamJoinStatus');if(status)status.textContent=message;const card=$('rbTeamJoinCard');if(card)card.hidden=false;const join=$('rbTeamJoinName'),code=$('rbTeamJoinCode'),createName=$('rbTeamCreateName'),display=$('rbTeamCreateDisplayName');const signedIn=!!user();[join,code,createName,display].forEach(el=>{if(el){el.disabled=!signedIn;const label=el.closest('label');if(label)label.style.opacity=signedIn?'1':'.55'}});const joinButton=$('rbTeamJoinCard')?.querySelector('button[data-action="join-team"]');if(joinButton)joinButton.disabled=!signedIn;const createButton=$('rbTeamCreateCard')?.querySelector('button[data-action="create-team"]');if(createButton)createButton.disabled=!signedIn;}
 function setEntryMode(mode){const join=$('rbTeamJoinCard'),create=$('rbTeamCreateCard');if(join){const fields=join.querySelector('.rb-team-fields:not(#rbTeamEntryTabs)');const status=$('rbTeamJoinStatus');if(fields)fields.hidden=mode!=='join';if(status)status.hidden=mode!=='join'}if(create)create.hidden=mode!=='create';const jt=$('rbTeamJoinTab'),ct=$('rbTeamCreateTab');if(jt)jt.setAttribute('aria-pressed',String(mode==='join'));if(ct)ct.setAttribute('aria-pressed',String(mode==='create'));}
 function hideJoinCard(){const card=$('rbTeamJoinCard');if(card)card.remove()}
 function ensureJoinCard(){
  if(!$('rbTeamJoinCard')){const host=$('page-score')||document.querySelector('main');if(!host)return;const card=node('section','rb-team-panel');card.id='rbTeamJoinCard';card.hidden=true;card.append(node('h3','','Entrar no espaço da equipe'));card.append(node('p','rb-team-muted','Entre com sua conta Google no Rabbitech. Crie uma equipe como responsável ou use o código de convite para entrar em uma equipe existente.'));const tabs=node('div','rb-team-fields');tabs.id='rbTeamEntryTabs';const createTab=button('Criar equipe','rb-team-btn',()=>setEntryMode('create'));createTab.id='rbTeamCreateTab';const joinTab=button('Entrar em equipe existente','rb-team-btn',()=>setEntryMode('join'));joinTab.id='rbTeamJoinTab';tabs.append(createTab,joinTab);card.append(tabs);const fields=node('div','rb-team-fields');const name=input('Nome que aparecerá para a equipe','text','','Seu nome');name.el.maxLength=80;name.el.autocomplete='name';name.el.id='rbTeamJoinName';const code=input('Código de convite','text','','Cole o código da liderança');code.el.maxLength=100;code.el.autocomplete='off';code.el.id='rbTeamJoinCode';fields.append(name.wrap,code.wrap);card.append(fields);const status=node('p','rb-team-muted','');status.id='rbTeamJoinStatus';const joinBtn=button('Entrar na equipe','rb-team-btn',joinTeam);joinBtn.dataset.action='join-team';card.append(status,joinBtn);host.appendChild(card)}
  showJoinCard()
 }
 async function loadWorkspace(){
  const sb=client(),u=user();
  if(!sb||typeof sb.rpc!=='function'){workspace=null;makeNav();ensureJoinCard();ensureCreateTeamCard();showEntryMessage('Conecte sua conta Google para criar uma equipe ou aceitar um convite.');return}
  if(!u){workspace=null;makeNav();ensureJoinCard();ensureCreateTeamCard();showEntryMessage('Entre com sua conta Google para criar uma equipe ou aceitar um convite.');return}
  try{const {data,error}=await sb.rpc('get_my_team_workspace');if(error)throw error;workspace=data||null;
   if(workspace?.member&&workspace?.team_id){hideJoinCard();makeNav();makePage();return}
   makeNav();ensureJoinCard();ensureCreateTeamCard();
  }catch(e){console.warn('Rabbitech team workspace could not load',e);makeNav();ensureJoinCard();showEntryMessage(e?.message||'Não foi possível carregar os dados da equipe.')}
 }
 function ensureCreateTeamCard(){
  if($('rbTeamCreateCard'))return;const host=$('rbTeamJoinCard');if(!host)return;
  const card=node('section','rb-team-panel');card.id='rbTeamCreateCard';card.hidden=true;card.append(node('h3','','Criar equipe como mentor/responsável'),node('p','rb-team-muted','Crie o espaço da sua equipe e depois gere convites para os alunos entrarem com suas próprias contas.'));
  const fields=node('div','rb-team-fields'),name=input('Nome da equipe','text','','Ex.: Techscorpions'),display=input('Seu nome','text','','Nome do mentor');name.el.maxLength=80;display.el.maxLength=80;name.el.id='rbTeamCreateName';display.el.id='rbTeamCreateDisplayName';fields.append(name.wrap,display.wrap);card.append(fields);
  const status=node('p','rb-team-muted','');status.id='rbTeamCreateStatus';const createBtn=button('Criar equipe','rb-team-btn',createTeamWorkspace);createBtn.dataset.action='create-team';card.append(status,createBtn);host.append(card)
 }
 async function createTeamWorkspace(){
  const name=$('rbTeamCreateName')?.value.trim(),display=$('rbTeamCreateDisplayName')?.value.trim(),status=$('rbTeamCreateStatus'),b=$('rbTeamCreateCard')?.querySelector('button');
  if(!name||!display){if(status)status.textContent='Preencha o nome da equipe e seu nome.';return}if(b)b.disabled=true;
  try{const {data,error}=await client().rpc('create_team_workspace',{p_name:name,p_display_name:display});if(error)throw error;if(status)status.textContent='Equipe criada: '+(data?.team_name||name);await loadWorkspace();if(workspace?.member)await openBoard()}
  catch(e){if(status)status.textContent=e?.message||'Não foi possível criar a equipe.'}finally{if(b)b.disabled=false}
 }
 async function joinTeam(){
  const sb=client(),name=$('rbTeamJoinName')?.value.trim(),code=$('rbTeamJoinCode')?.value.trim(),status=$('rbTeamJoinStatus');
  if(!sb||!name||!code){if(status)status.textContent='Preencha seu nome e o código de convite.';return}
  const b=$('rbTeamJoinCard')?.querySelector('button');if(b)b.disabled=true;if(status)status.textContent='Validando convite…';
  try{const {data,error}=await sb.rpc('join_team_with_code',{p_code:code,p_display_name:name});if(error)throw error;if(status)status.textContent='Conta vinculada à equipe '+(data?.team_name||'')+'.';await loadWorkspace();if(workspace?.member)await openBoard()}
  catch(e){if(status)status.textContent=e?.message||'Não foi possível entrar. Confira o código com a liderança.'}
  finally{if(b)b.disabled=false}
 }
 function setMessage(id,text){const el=$(id);if(el)el.textContent=text}
 function addStat(host,value,label){const s=node('div','rb-team-stat');s.append(node('strong','',String(value)),node('span','',label));host.appendChild(s)}
 function dateText(v){if(!v)return 'Sem prazo';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('pt-BR')}
 function taskStatusName(v){return STATUS.find(x=>x[0]===v)?.[1]||v}
 function priorityName(v){return PRIORITY.find(x=>x[0]===v)?.[1]||v}
 async function loadBoardData(){
  const sb=client();if(!sb||!workspace?.team_id)return;
  const [t,m,e,g,n,r,chat]=await Promise.all([
   sb.from('team_tasks').select('id,team_id,title,description,status,priority,due_date,assigned_to,created_by,completed_at,created_at,updated_at').eq('team_id',workspace.team_id).order('created_at',{ascending:false}),
   sb.from('team_memberships').select('user_id,display_name,role,created_at').eq('team_id',workspace.team_id).order('created_at',{ascending:true}),
   sb.from('team_task_events').select('id,task_id,actor_user_id,old_status,new_status,note,created_at').eq('team_id',workspace.team_id).order('created_at',{ascending:false}).limit(20),
   sb.from('team_goals').select('*').eq('team_id',workspace.team_id).order('created_at',{ascending:false}),
   sb.from('team_notes').select('*').eq('team_id',workspace.team_id).order('updated_at',{ascending:false}).limit(50),
   sb.from('team_round_logs').select('*').eq('team_id',workspace.team_id).order('performed_at',{ascending:false}).limit(100),
   sb.from('team_messages').select('*').eq('team_id',workspace.team_id).order('created_at',{ascending:false}).limit(100)
  ]);
  if(t.error)throw t.error;if(m.error)throw m.error;if(e.error)throw e.error;if(g.error)throw g.error;if(n.error)throw n.error;if(r.error)throw r.error;if(chat.error)throw chat.error;
  tasks=t.data||[];members=m.data||[];events=e.data||[];goals=g.data||[];notes=n.data||[];roundLogs=r.data||[];messages=(chat.data||[]).reverse();
 }
 function renderBoard(){
  const page=makePage();if(!page)return;page.replaceChildren();addStyles();
  const head=node('div','rb-team-panel rb-team-head');const intro=node('div');intro.append(node('h2','','📋 Espaço da equipe'));intro.append(node('p','rb-team-muted',(workspace?.team_name||'Equipe')+' · Quadro de tarefas e acompanhamento'));head.append(intro);
  const actions=node('div','');actions.style.display='flex';actions.style.flexWrap='wrap';actions.style.gap='8px';actions.append(button('Atualizar dados em segundo plano','rb-team-btn',()=>refreshBoardInBackground()),button('Gerar convite','rb-team-btn',createInvite));head.append(actions);page.append(head);
  const summary=node('section','rb-team-panel');summary.append(node('h3','','Resumo de progresso'));const stats=node('div','rb-team-grid');const done=tasks.filter(t=>t.status==='done').length,active=tasks.filter(t=>t.status==='in_progress').length,total=tasks.length,percent=total?Math.round(done/total*100):0;const memberDone=tasks.filter(t=>t.status==='done'&&t.assigned_to===user()?.id).length;const average=members.length?Math.round(members.reduce((sum,m)=>sum+tasks.filter(t=>t.status==='done'&&t.assigned_to===m.user_id).length,0)/members.length*10)/10:0;
  addStat(stats,percent+'%','Tarefas concluídas na equipe');addStat(stats,done+'/'+total,'Concluídas');addStat(stats,active,'Em andamento');addStat(stats,memberDone,'Concluídas por você');summary.append(stats,node('p','rb-team-muted','Média da equipe: '+average+' tarefas concluídas por membro atribuído. Tarefas sem responsável entram no total da equipe, mas não na média individual.'));page.append(summary);
  if(workspace?.is_manager)page.append(createTaskForm());
  const board=node('section','rb-team-panel');board.append(node('h3','','Quadro Kanban'));const kanban=node('div','rb-team-kanban');
  STATUS.forEach(([status,label])=>{const col=node('div','rb-team-column');const inCol=tasks.filter(t=>t.status===status);col.append(node('h3','',label+' · '+inCol.length));inCol.forEach(t=>col.append(createTaskCard(t)));if(!inCol.length)col.append(node('p','rb-team-muted','Nenhuma tarefa aqui.'));kanban.append(col)});board.append(kanban);page.append(board);
  const people=node('section','rb-team-panel');people.append(node('h3','','Membros e médias'));const rows=node('div');if(!members.length)rows.append(node('p','rb-team-muted','Ainda não há membros cadastrados além da liderança.'));members.forEach(m=>{const mine=tasks.filter(t=>t.assigned_to===m.user_id),completed=mine.filter(t=>t.status==='done').length,pct=mine.length?Math.round(completed/mine.length*100):0;const row=node('div','rb-team-member-row');const left=node('div');left.append(node('strong','',m.display_name+(m.role==='leader'?' · liderança':'')),node('div','rb-team-muted',completed+' de '+mine.length+' tarefas atribuídas concluídas'));const right=node('strong','',pct+'%');row.append(left,right);rows.append(row)});people.append(rows);page.append(people);
  if(workspace?.is_manager)page.append(createInvitePanel());
  const activity=node('section','rb-team-panel');activity.append(node('h3','','Atividade recente'));
  if(!events.length)activity.append(node('p','rb-team-muted','Ainda não há alterações registradas. Quando alguém mover uma tarefa, o histórico aparecerá aqui.'));
  else{
   const taskById=new Map(tasks.map(t=>[t.id,t]));
   events.slice(0,12).forEach(ev=>{
    const task=taskById.get(ev.task_id),member=members.find(m=>m.user_id===ev.actor_user_id);
    const row=node('div','rb-team-member-row');const left=node('div');
    left.append(node('strong','',(member?.display_name||'Integrante')+' · '+(task?.title||'Tarefa')));
    left.append(node('div','rb-team-muted',(ev.old_status?taskStatusName(ev.old_status)+' → ':'')+taskStatusName(ev.new_status)+(ev.note?' · '+ev.note:'')));
    row.append(left,node('small','rb-team-muted',new Date(ev.created_at).toLocaleString('pt-BR')));activity.append(row);
   });
  }
  page.append(activity);page.append(renderGoals(),renderRounds(),renderNotes(),renderChat());
 }
 function renderGoals(){
  const panel=node('section','rb-team-panel');panel.append(node('h3','','🎯 Metas da equipe'));
  if(workspace?.is_manager){const title=input('Meta','text','','Ex.: 12 rounds de treino');title.el.maxLength=120;title.el.id='rbGoalTitle';const tasksGoal=input('Tarefas desejadas','number','10');tasksGoal.el.min=0;tasksGoal.el.id='rbGoalTasks';const roundsGoal=input('Rounds desejados','number','5');roundsGoal.el.min=0;roundsGoal.el.id='rbGoalRounds';const scoreGoal=input('Média de pontos desejada','number','0');scoreGoal.el.min=0;scoreGoal.el.id='rbGoalScore';const due=input('Prazo','date');due.el.id='rbGoalDue';const desc=input('Descrição','textarea','','Critério para concluir a meta');desc.el.maxLength=1000;desc.el.id='rbGoalDesc';const fields=node('div','rb-team-fields');fields.append(title.wrap,tasksGoal.wrap,roundsGoal.wrap,scoreGoal.wrap,due.wrap,desc.wrap);panel.append(fields,button('Salvar meta','rb-team-btn',async()=>{const t=$('rbGoalTitle').value.trim();if(!t)return;const {error}=await client().from('team_goals').insert({team_id:workspace.team_id,title:t,description:$('rbGoalDesc').value.trim(),target_tasks:Number($('rbGoalTasks').value||0),target_rounds:Number($('rbGoalRounds').value||0),target_average_score:Number($('rbGoalScore').value||0),due_date:$('rbGoalDue').value||null,created_by:user().id});if(error)alert(error.message);else openBoard()}))}
  if(!goals.length)panel.append(node('p','rb-team-muted','Nenhuma meta definida ainda.'));
  goals.forEach(g=>{const box=node('article','rb-team-task');box.append(node('h4','',g.title),node('p','',g.description||''));const completed=tasks.filter(t=>t.status==='done').length,avg=roundLogs.length?roundLogs.reduce((s,r)=>s+Number(r.score||0),0)/roundLogs.length:0;[['Tarefas',completed,g.target_tasks],['Rounds',roundLogs.length,g.target_rounds],['Média de pontos',avg,g.target_average_score]].forEach(([label,val,target])=>{const pct=Number(target)>0?Math.min(100,Math.round(Number(val)/Number(target)*100)):0;box.append(node('small','rb-team-muted',label+': '+(Number(val)%1?Number(val).toFixed(1):val)+' / '+target));const bar=node('div','rb-team-progress'),fill=node('span');fill.style.width=pct+'%';bar.append(fill);box.append(bar)});panel.append(box)});return panel
 }
 function renderRounds(){
  const panel=node('section','rb-team-panel');panel.append(node('h3','','🤖 Rounds e desempenho'));const fields=node('div','rb-team-fields');const num=input('Número do round','number',String(roundLogs.length+1)),score=input('Pontuação','number','0'),start=input('Posição inicial','text','','Ex.: canto sudoeste'),mission=input('Missões tentadas','textarea','','Missões e resultado'),note=input('O que melhorar?','textarea','','Observações');num.el.min=1;num.el.id='rbRoundNum';score.el.min=0;score.el.max=10000;score.el.id='rbRoundPts';start.el.maxLength=120;start.el.id='rbRoundStart';mission.el.maxLength=2000;mission.el.id='rbRoundMission';note.el.maxLength=2000;note.el.id='rbRoundNote';fields.append(num.wrap,score.wrap,start.wrap,mission.wrap,note.wrap);panel.append(fields,button('Registrar round','rb-team-btn',async()=>{const n=Number($('rbRoundNum').value),s=Number($('rbRoundPts').value||0);if(!Number.isInteger(n)||n<1||s<0||s>10000){alert('Confira número e pontuação do round.');return}const {error}=await client().from('team_round_logs').insert({team_id:workspace.team_id,created_by:user().id,round_number:n,score:Math.round(s),start_position:$('rbRoundStart').value.trim(),missions:$('rbRoundMission').value.trim(),notes:$('rbRoundNote').value.trim()});if(error)alert(error.message);else openBoard()}));
  const avg=roundLogs.length?roundLogs.reduce((s,r)=>s+Number(r.score||0),0)/roundLogs.length:0;const stats=node('div','rb-team-grid');addStat(stats,roundLogs.length,'Rounds registrados');addStat(stats,avg.toFixed(1),'Média de pontos');addStat(stats,roundLogs.length?Math.max(...roundLogs.map(r=>Number(r.score||0))):0,'Melhor pontuação');panel.append(stats);roundLogs.slice(0,10).forEach(r=>panel.append(node('div','rb-team-member-row','Round '+r.round_number+' · '+r.score+' pontos · '+new Date(r.performed_at).toLocaleDateString('pt-BR'))));return panel
 }
 function renderNotes(){
  const panel=node('section','rb-team-panel');panel.append(node('h3','','📝 Anotações salvas'));const fields=node('div','rb-team-fields');const title=input('Título','text','','Decisão ou ideia'),body=input('Anotação','textarea','','Escreva aqui as observações da equipe');title.el.maxLength=120;title.el.id='rbNoteTitle';body.el.maxLength=8000;body.el.id='rbNoteBody';fields.append(title.wrap,body.wrap);panel.append(fields,button('Salvar anotação','rb-team-btn',async()=>{const t=$('rbNoteTitle').value.trim(),b=$('rbNoteBody').value.trim();if(!t||!b)return alert('Preencha título e anotação.');const {error}=await client().from('team_notes').insert({team_id:workspace.team_id,author_user_id:user().id,title:t,body:b});if(error)alert(error.message);else openBoard()}));notes.forEach(n=>{const card=node('article','rb-team-task');card.append(node('h4','',n.title),node('p','',n.body),node('small','rb-team-muted',new Date(n.updated_at).toLocaleString('pt-BR')));panel.append(card)});return panel
 }
 function createMessageNode(m){
  const card=node('article','rb-team-chat-msg');card.dataset.messageId=m.id||'';
  card.style.cssText='padding:10px 12px;border:1px solid var(--line,rgba(208,244,119,.18));border-radius:12px;overflow-wrap:anywhere';
  const member=members.find(x=>x.user_id===m.author_user_id);
  card.append(node('strong','',(member?.display_name||'Membro')+' · '+new Date(m.created_at).toLocaleString('pt-BR')));
  if(m.body)card.append(node('p','',m.body));
  if(m.media_path)loadChatMedia(m,card);
  return card;
 }
 async function loadChatMedia(message,card){
  if(card.dataset.mediaLoaded==='true')return;card.dataset.mediaLoaded='true';
  try{
   const {data,error}=await client().storage.from('rabbitech-team-chat').createSignedUrl(message.media_path,3600);
   if(error)throw error;
   if(!data?.signedUrl)throw new Error('URL de mídia indisponível');
   const media=node(message.media_type==='video'?'video':'audio','');
   media.controls=true;media.preload='metadata';media.src=data.signedUrl;
   media.style.cssText='display:block;width:100%;max-width:520px;max-height:320px;margin-top:8px;border-radius:10px';
   if(message.media_type==='video')media.playsInline=true;
   card.append(media);
   if(message.media_name)card.append(node('small','rb-team-muted',message.media_name));
  }catch(error){card.append(node('small','rb-team-muted','Não foi possível carregar esta mídia. '+String(error?.message||'').slice(0,100)))}
 }
 async function sendChatText(){
  const field=$('rbTeamMessage'),body=field?.value.trim();if(!body)return;
  const send=$('rbTeamSendText');if(send)send.disabled=true;
  try{
   const {data,error}=await client().from('team_messages').insert({team_id:workspace.team_id,author_user_id:user().id,body}).select('*').single();
   if(error)throw error;if(field)field.value='';if(data)addMessageOnce(data);
  }catch(error){alert(error?.message||'Não foi possível enviar a mensagem.')}
  finally{if(send)send.disabled=false}
 }
 async function sendChatMedia(file,mediaType){
  if(!file||!workspace?.team_id||!user())return;
  const maxBytes=25*1024*1024;
  if(file.size>maxBytes){alert('O arquivo ultrapassa o limite de 25 MB.');return}
  const allowed=mediaType==='audio'?file.type.startsWith('audio/'):(file.type.startsWith('video/'));
  if(!allowed){alert('Formato de mídia não compatível.');return}
  const status=$('rbTeamMediaStatus'),send=$('rbTeamSendMedia');
  if(send)send.disabled=true;if(status)status.textContent='Enviando mídia…';
  const extension=(file.name.split('.').pop()|| (mediaType==='audio'?'webm':'mp4')).replace(/[^a-z0-9]/gi,'').toLowerCase().slice(0,8)||'bin';
  const path=workspace.team_id+'/'+user().id+'/'+crypto.randomUUID()+'.'+extension;
  try{
   const {error:uploadError}=await client().storage.from('rabbitech-team-chat').upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError)throw uploadError;
   const {data,error}=await client().from('team_messages').insert({
    team_id:workspace.team_id,author_user_id:user().id,body:'',
    media_type:mediaType,media_path:path,media_name:file.name.slice(0,180),
    media_mime:file.type,media_size:file.size
   }).select('*').single();
   if(error){await client().storage.from('rabbitech-team-chat').remove([path]);throw error}
   if(data)addMessageOnce(data);
   if(status)status.textContent='Mídia enviada.';
   const picker=$('rbTeam'+(mediaType==='audio'?'AudioFile':'VideoFile'));if(picker)picker.value='';
  }catch(error){if(status)status.textContent=error?.message||'Falha ao enviar mídia.'}
  finally{if(send)send.disabled=false}
 }
 function addMessageOnce(m){
  if(!m)return;
  if(m.id&&document.querySelector('#rbTeamChatMessages [data-message-id="'+CSS.escape(String(m.id))+'"]'))return;
  messages.push(m);messages.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const list=$('rbTeamChatMessages');if(!list)return;
  const empty=list.querySelector(':scope > .rb-team-muted');if(empty)empty.remove();
  list.append(createMessageNode(m));list.scrollTop=list.scrollHeight;
 }
 function startTeamRealtime(){
  const sb=client();if(!sb||!workspace?.team_id||typeof sb.channel!=='function')return;
  if(window.rbTeamRealtimeChannel){try{sb.removeChannel(window.rbTeamRealtimeChannel)}catch(_){}}
  const teamId=workspace.team_id;
  let refreshQueued=false;
  const refreshWithoutRebuild=()=>{
   if(refreshQueued)return;
   refreshQueued=true;
   queueMicrotask(async()=>{refreshQueued=false;await refreshBoardInBackground()});
  };
  window.rbTeamRealtimeChannel=sb.channel('rabbitech-team-'+teamId)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'team_messages',filter:'team_id=eq.'+teamId},payload=>addMessageOnce(payload.new))
   .on('postgres_changes',{event:'*',schema:'public',table:'team_tasks',filter:'team_id=eq.'+teamId},refreshWithoutRebuild)
   .on('postgres_changes',{event:'*',schema:'public',table:'team_goals',filter:'team_id=eq.'+teamId},refreshWithoutRebuild)
   .on('postgres_changes',{event:'*',schema:'public',table:'team_notes',filter:'team_id=eq.'+teamId},refreshWithoutRebuild)
   .on('postgres_changes',{event:'*',schema:'public',table:'team_round_logs',filter:'team_id=eq.'+teamId},refreshWithoutRebuild)
   .on('postgres_changes',{event:'*',schema:'public',table:'team_memberships',filter:'team_id=eq.'+teamId},refreshWithoutRebuild)
   .subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('Rabbitech team Realtime connection:',status)});
 }
 function renderChat(){
  const panel=node('section','rb-team-panel');panel.append(node('h3','','💬 Chat da equipe'),node('p','rb-team-muted','Mensagens de texto, áudios gravados e vídeos. O conteúdo fica privado para os membros da equipe.'));
  const list=node('div','rb-team-chat');list.id='rbTeamChatMessages';list.setAttribute('aria-live','polite');list.style.cssText='display:flex;flex-direction:column;gap:8px;max-height:420px;overflow:auto;padding:8px 2px;overscroll-behavior:contain';
  messages.forEach(m=>list.append(createMessageNode(m)));if(!messages.length)list.append(node('p','rb-team-muted','Nenhuma mensagem ainda.'));panel.append(list);
  const field=input('Mensagem','textarea','','Escreva uma mensagem…');field.el.maxLength=2000;field.el.id='rbTeamMessage';panel.append(field.wrap);
  const actions=node('div','rb-team-fields');
  const send=button('Enviar texto','rb-team-btn',sendChatText);send.id='rbTeamSendText';actions.append(send);
  const audio=input('Enviar áudio','file');audio.el.id='rbTeamAudioFile';audio.el.accept='audio/*';audio.el.addEventListener('change',()=>sendChatMedia(audio.el.files?.[0],'audio'));actions.append(audio.wrap);
  const video=input('Enviar vídeo','file');video.el.id='rbTeamVideoFile';video.el.accept='video/*';video.el.setAttribute('capture','environment');video.el.addEventListener('change',()=>sendChatMedia(video.el.files?.[0],'video'));actions.append(video.wrap);
  const recorderControls=node('div','');recorderControls.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:8px';
  const record=button('🎙️ Gravar áudio','rb-team-btn');record.id='rbTeamRecordAudio';
  const stop=button('Parar e enviar','rb-team-btn');stop.id='rbTeamStopAudio';stop.disabled=true;
  const status=node('p','rb-team-muted','');status.id='rbTeamMediaStatus';
  let recorder=null,recordedChunks=[];
  record.addEventListener('click',async()=>{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){status.textContent='Este navegador não oferece gravação de áudio. Use o seletor de arquivo.';return}
   try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
    recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);recordedChunks=[];
    recorder.ondataavailable=event=>{if(event.data?.size)recordedChunks.push(event.data)};
    recorder.onstop=async()=>{
     stream.getTracks().forEach(track=>track.stop());
     const blob=new Blob(recordedChunks,{type:recorder.mimeType||'audio/webm'});
     const ext=blob.type.includes('mp4')?'m4a':'webm';
     await sendChatMedia(new File([blob],'audio-equipe-'+Date.now()+'.'+ext,{type:blob.type}),'audio');
     record.disabled=false;stop.disabled=true;status.textContent='Gravação enviada.';
    };
    recorder.start();record.disabled=true;stop.disabled=false;status.textContent='Gravando áudio…';
   }catch(error){status.textContent='Não foi possível acessar o microfone: '+String(error?.message||error)}
  });
  stop.addEventListener('click',()=>{if(recorder&&recorder.state==='recording'){stop.disabled=true;recorder.stop()}});
  recorderControls.append(record,stop);panel.append(actions,recorderControls,status);
  return panel
 }
 function createTaskForm(){
  const panel=node('section','rb-team-panel');panel.append(node('h3','','Nova tarefa'));panel.append(node('p','rb-team-muted','Crie uma tarefa, defina prioridade e, se quiser, atribua a um membro.'));const fields=node('div','rb-team-fields');
  const title=input('Tarefa','text','','Ex.: testar sensor de cor');title.el.maxLength=120;title.el.id='rbNewTaskTitle';
  const due=input('Prazo','date');due.el.id='rbNewTaskDue';
  const priority=select('Prioridade',PRIORITY,'normal');priority.el.id='rbNewTaskPriority';
  const assigned=select('Responsável',[['','Sem responsável'],...members.map(m=>[m.user_id,m.display_name])],'');assigned.el.id='rbNewTaskAssigned';
  const desc=input('Descrição','textarea','','Detalhes, critério de conclusão…');desc.el.maxLength=2000;desc.el.id='rbNewTaskDescription';
  fields.append(title.wrap,due.wrap,priority.wrap,assigned.wrap,desc.wrap);panel.append(fields);const status=node('p','rb-team-muted','');status.id='rbNewTaskStatus';const create=button('Criar tarefa','rb-team-btn',createTask);create.id='rbCreateTeamTaskBtn';panel.append(status,create);return panel;
 }
 function createTaskCard(task){
  const card=node('article','rb-team-task');const title=node('h4','',task.title);card.append(title);if(task.description)card.append(node('p','',task.description));
  const assignee=members.find(m=>m.user_id===task.assigned_to);const meta=node('div','');meta.append(node('span','rb-team-badge',priorityName(task.priority)),node('span','rb-team-badge',assignee?assignee.display_name:'Sem responsável'),node('span','rb-team-badge','Prazo: '+dateText(task.due_date)));card.append(meta);
  const status=select('Mover para',STATUS,task.status);status.el.setAttribute('aria-label','Status da tarefa '+task.title);status.el.addEventListener('change',async()=>{const next=status.el.value;status.el.disabled=true;try{const {error}=await client().rpc('set_team_task_status',{p_task_id:task.id,p_status:next,p_note:''});if(error)throw error;await openBoard()}catch(e){status.el.value=task.status;status.el.disabled=false;alert(e?.message||'Não foi possível atualizar a tarefa.')}});card.append(status.wrap);
  if(workspace?.is_manager)card.append(button('Excluir tarefa','rb-team-btn',async()=>{if(!confirm('Excluir a tarefa “'+task.title+'”?'))return;const {error}=await client().from('team_tasks').delete().eq('id',task.id).eq('team_id',workspace.team_id);if(error){alert(error.message);return}await openBoard()}));
  return card;
 }
 async function createTask(){
  const sb=client(),title=$('rbNewTaskTitle')?.value.trim(),status=$('rbNewTaskStatus');if(!title){setMessage('rbNewTaskStatus','Escreva o título da tarefa.');return}
  const b=$('rbCreateTeamTaskBtn');if(b)b.disabled=true;
  try{const payload={team_id:workspace.team_id,title,description:$('rbNewTaskDescription')?.value.trim()||'',priority:$('rbNewTaskPriority')?.value||'normal',due_date:$('rbNewTaskDue')?.value||null,assigned_to:$('rbNewTaskAssigned')?.value||null,created_by:user().id};const {error}=await sb.from('team_tasks').insert(payload);if(error)throw error;await openBoard()}
  catch(e){if(status)status.textContent=e?.message||'Não foi possível criar a tarefa.'}
  finally{if(b)b.disabled=false}
 }
 function createInvitePanel(){const panel=node('section','rb-team-panel');panel.append(node('h3','','Convidar membros'));panel.append(node('p','rb-team-muted','Gere um código de uso limitado. Envie-o apenas aos membros que devem entrar nesta equipe.'));const controls=node('div','rb-team-fields');const days=select('Validade',['1','3','7','14','30'].map(v=>[v,v+' dias']),'7');days.el.id='rbInviteDays';const uses=select('Quantidade de usos',[['1','1 pessoa'],['5','5 pessoas'],['10','10 pessoas'],['20','20 pessoas'],['50','50 pessoas'],['100','100 pessoas']],'20');uses.el.id='rbInviteUses';controls.append(days.wrap,uses.wrap);panel.append(controls);const out=node('div','rb-team-notice');out.id='rbInviteOutput';out.hidden=true;panel.append(out);return panel}
 async function createInvite(){const sb=client();if(!workspace?.is_manager)return;try{const {data,error}=await sb.rpc('create_team_invite',{p_team_id:workspace.team_id,p_expires_days:Number($('rbInviteDays')?.value||7),p_max_uses:Number($('rbInviteUses')?.value||20)});if(error)throw error;const out=$('rbInviteOutput');if(out){out.hidden=false;out.replaceChildren(node('strong','','Código de convite'),node('p','',data.code),node('p','rb-team-muted','Expira em '+new Date(data.expires_at).toLocaleString('pt-BR')+' · limite '+data.max_uses+' usos'));const status=node('p','rb-team-muted','');status.id='rbInviteStatus';out.append(status,button('Copiar código','rb-team-btn',()=>{if(navigator.clipboard?.writeText)navigator.clipboard.writeText(data.code).then(()=>setMessage('rbInviteStatus','Código copiado.')).catch(()=>setMessage('rbInviteStatus','Copie manualmente: '+data.code));else setMessage('rbInviteStatus','Copie manualmente: '+data.code)}))}}catch(e){alert(e?.message||'Não foi possível gerar o convite.')}}
 async function updateBoardSummaryInBackground(){
  // Keep the visible board and scroll position stable. Chat arrives incrementally through Realtime.
  const stats=document.querySelector('#page-team-workspace .rb-team-grid');
  if(stats){const done=tasks.filter(t=>t.status==='done').length,total=tasks.length,active=tasks.filter(t=>t.status==='in_progress').length;const values=stats.querySelectorAll('.rb-team-stat strong');if(values.length>=4){values[0].textContent=(total?Math.round(done/total*100):0)+'%';values[1].textContent=done+'/'+total;values[2].textContent=active;values[3].textContent=tasks.filter(t=>t.status==='done'&&t.assigned_to===user()?.id).length}}
 }
 async function refreshBoardInBackground(){
  if(loading||!workspace?.member||!workspace?.team_id)return;
  loading=true;
  const page=$('page-team-workspace');
  const scrollY=window.scrollY;
  const active=document.activeElement;
  const activeId=active&&page?.contains(active)?active.id:'';
  const values={};
  if(page)page.querySelectorAll('input[id],textarea[id],select[id]').forEach(el=>{values[el.id]=el.value});
  try{
   await loadBoardData();
   // Do not rebuild the whole page during a background refresh: that destroys the
   // focused controls and can send mobile users back to the top of the document.
   updateBoardSummaryInBackground();
   const chatList=$('rbTeamChatMessages');
   if(chatList){
    const seen=new Set([...chatList.querySelectorAll('[data-message-id]')].map(el=>el.dataset.messageId));
    messages.forEach(message=>{if(!message.id||!seen.has(String(message.id)))addMessageOnce(message)});
   }
   // Refresh the task cards in place, retaining scroll, chat input and open form fields.
   const cards=[...document.querySelectorAll('#page-team-workspace .rb-team-task')];
   tasks.forEach(task=>{
    const card=cards.find(el=>el.querySelector('h4')?.textContent===task.title);
    if(!card)return;
    const statusSelect=card.querySelector('select');
    if(statusSelect&&document.activeElement!==statusSelect)statusSelect.value=task.status;
   });
   Object.entries(values).forEach(([id,value])=>{const el=$(id);if(el&&document.activeElement!==el)el.value=value});
   if(activeId&&$(activeId)&&document.activeElement!==$(activeId))$(activeId).focus({preventScroll:true});
   requestAnimationFrame(()=>window.scrollTo({top:scrollY,behavior:'auto'}));
  }catch(e){console.warn('Rabbitech background refresh failed',e)}
  finally{loading=false}
 }
 async function openBoard(){
  if(loading)return;
  if(!user()){makeNav();ensureJoinCard();ensureCreateTeamCard();showEntryMessage('Entre com sua conta Google para criar uma equipe ou aceitar um convite.');const entry=$('rbTeamJoinCard');entry?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});return}
  if($('page-team-workspace')?.dataset.rbBoardRendered==='true'&&workspace?.member){
   const page=$('page-team-workspace');
   const alreadyVisible=page&&!page.hidden&&page.classList.contains('active');
   if(!alreadyVisible)goToPage();
   await refreshBoardInBackground();
   return;
  }
  loading=true;
  try{
   await loadWorkspace();
   if(!workspace?.member||!workspace?.team_id){removeNav();return}
   makeNav();makePage();
   const page=$('page-team-workspace');
   if(page&&!page.dataset.rbBoardRendered)page.replaceChildren(node('p','rb-team-muted','Carregando o espaço da equipe…'));
   await loadBoardData();
   renderBoard();
   page.dataset.rbBoardRendered='true';
   startTeamRealtime();
  }catch(e){
   const page=makePage();
   if(page){page.replaceChildren(node('section','rb-team-panel'),node('p','rb-team-muted',e?.message||'Falha ao carregar o quadro. Verifique sua conexão e tente novamente.'));page.hidden=false}
  }finally{loading=false}
 }
 function init(){if(scriptReady)return;scriptReady=true;loadWorkspace();window.addEventListener('rb-auth-state-changed',()=>{loadWorkspace()});document.addEventListener('click',e=>{const b=e.target.closest('nav button[data-page]');if(!b)return;if(b.dataset.page==='team-workspace'){e.preventDefault();e.stopPropagation();openBoard()}else{const page=$('page-team-workspace');if(page){page.hidden=true;page.classList.remove('active')}}},true);window.addEventListener('rb-team-workspace-refresh',loadWorkspace)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();