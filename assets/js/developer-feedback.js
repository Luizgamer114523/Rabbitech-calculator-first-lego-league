/* Rabbitech developer feedback: authenticated submissions + admin inbox. */
(()=>{
 'use strict';
 if(window.__rbDeveloperFeedbackLoaded)return;
 window.__rbDeveloperFeedbackLoaded=true;
 const OWNER_ID='7e799691-ba7e-42ea-ab6f-71ad11ca32ff';
 const $=id=>document.getElementById(id);
 const client=()=>{
  try{if(typeof rbClient!=='undefined'&&rbClient)return rbClient}catch(_){}
  return window.rbClient||window.supabaseClient||null;
 };
 async function currentUser(){
  let cached=null;
  try{cached=(typeof rbCloudUser!=='undefined'&&rbCloudUser)||window.rbCloudUser||null}catch(_){cached=window.rbCloudUser||null}
  if(cached?.id)return cached;
  try{const r=await client()?.auth?.getUser?.();return r?.data?.user||null}catch(_){return null}
 }
 async function isAdmin(user){
  if(!user?.id)return false;
  try{const r=await client()?.rpc?.('is_rabbitech_admin');return !r?.error&&r?.data===true}catch(_){return false}
 }
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const statuses={new:'Novo',reviewing:'Em análise',planned:'Planejado',done:'Concluído',declined:'Não será implementado'};
 let feedbackChannel=null,adminUserId=null;
 function ensurePage(){
  const main=document.querySelector('main')||document.body;
  let page=$('page-developer-feedback');
  if(!page){
   page=document.createElement('section');
   page.id='page-developer-feedback';page.className='page';page.hidden=true;
   page.innerHTML='<div id="rbDeveloperFeedbackRoot"></div>';
   main.append(page);
  }
  return page;
 }
 function ensureNav(user){
  const nav=document.querySelector('nav.rb-samsung-dock')||document.querySelector('nav button[data-page]')?.closest('nav');
  if(!nav)return;
  let button=$('rbDeveloperFeedbackNav');
  if(!user){
   if(button){button.hidden=true;button.setAttribute('aria-hidden','true')}
   return;
  }
  if(!button){
   const template=nav.querySelector('button[data-page="privacy"],button[data-page="rules"]');
   button=template?template.cloneNode(false):document.createElement('button');
   button.id='rbDeveloperFeedbackNav';button.type='button';button.dataset.page='developer-feedback';
   button.innerHTML='<span class="dock-icon" aria-hidden="true">💡</span><span class="dock-label">Feedback</span>';
   button.title='Enviar feedback ao desenvolvedor';button.setAttribute('aria-label','Enviar feedback');
   button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();openPage()},true);
   const anchor=nav.querySelector('button[data-page="team-workspace"]')||nav.querySelector('button[data-page="privacy"]');
   if(anchor)anchor.insertAdjacentElement('afterend',button);else nav.append(button);
  }
  button.hidden=false;button.removeAttribute('aria-hidden');button.style.removeProperty('display');
 }
 function shell(){
  const page=ensurePage();
  if($('rbDeveloperFeedbackStyles'))return page;
  const style=document.createElement('style');style.id='rbDeveloperFeedbackStyles';
  style.textContent=
   '#rbDeveloperFeedbackRoot{max-width:900px;margin:0 auto;padding:18px 14px 120px;color:var(--text,#eff8ed)}'+
   '#rbDeveloperFeedbackRoot .rbfb-card{border:1px solid #34543a;border-radius:16px;padding:16px;margin:12px 0;background:rgba(12,29,18,.94)}'+
   '#rbDeveloperFeedbackRoot .rbfb-field{display:block;box-sizing:border-box;width:100%;padding:11px;margin:7px 0;border:1px solid #49684b;border-radius:9px;background:#07120b;color:#f1faef;font:inherit}'+
   '#rbDeveloperFeedbackRoot .rbfb-btn{padding:10px 14px;border:1px solid #789b5b;border-radius:10px;background:#1a3521;color:#f4ffe9;font:inherit;font-weight:700}'+
   '#rbDeveloperFeedbackRoot .rbfb-item{padding:12px 0;border-top:1px solid #34543a;overflow-wrap:anywhere}'+
   '#rbDeveloperFeedbackRoot .rbfb-muted{font-size:12px;opacity:.75}';
  document.head.append(style);return page;
 }
 function setActivePage(page,button){
  document.querySelectorAll('main .page').forEach(item=>{item.classList.remove('active');item.hidden=true;item.style.removeProperty('display')});
  page.hidden=false;page.classList.add('active');page.setAttribute('aria-hidden','false');
  document.querySelectorAll('nav button[data-page]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);if(active)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current')});
 }
 async function loadOwnFeedback(){
  const c=client(),user=await currentUser(),list=$('rbfbOwnList');
  if(!list||!c||!user?.id)return;
  list.textContent='Carregando seus envios…';
  const r=await c.from('rabbitech_developer_feedback').select('id,category,message,status,admin_reply,created_at').eq('author_user_id',user.id).order('created_at',{ascending:false}).limit(20);
  if(r.error){list.textContent='Não foi possível carregar seu histórico: '+r.error.message;return}
  if(!r.data?.length){list.textContent='Você ainda não enviou feedback.';return}
  list.innerHTML=r.data.map(item=>'<article class="rbfb-item"><strong>'+({suggestion:'Sugestão',bug:'Problema/bug',other:'Outro'}[item.category]||'Feedback')+'</strong><p>'+esc(item.message)+'</p><div class="rbfb-muted">'+esc(new Date(item.created_at).toLocaleString())+' · '+esc(statuses[item.status]||item.status)+'</div>'+(item.admin_reply?'<p><strong>Resposta da equipe:</strong> '+esc(item.admin_reply)+'</p>':'')+'</article>').join('');
 }
 async function submitFeedback(event){
  event.preventDefault();
  const c=client(),user=await currentUser(),button=$('rbfbSubmit'),message=$('rbfbMessage')?.value.trim(),category=$('rbfbCategory')?.value||'suggestion';
  const status=$('rbfbStatus');
  if(!user?.id){if(status)status.textContent='Entre na sua conta para enviar feedback.';return}
  if(!message||message.length<10){if(status)status.textContent='Escreva pelo menos 10 caracteres para explicar sua ideia.';return}
  if(button)button.disabled=true;if(status)status.textContent='Enviando feedback…';
  try{
   const activePage=document.querySelector('main .page.active')?.id||'site';
   const r=await c.from('rabbitech_developer_feedback').insert({author_user_id:user.id,category,message,page:activePage.slice(0,120)}).select('id').single();
   if(r.error)throw r.error;
   $('rbfbMessage').value='';
   if(status)status.textContent='Feedback enviado. Obrigado por ajudar a melhorar o Rabbitech!';
   await loadOwnFeedback();
  }catch(error){if(status)status.textContent='Não foi possível enviar: '+String(error?.message||error)}
  finally{if(button)button.disabled=false}
 }
 async function openPage(){
  const user=await currentUser();if(!user?.id){window.alert('Entre na sua conta do Rabbitech para enviar feedback.');return}
  const page=shell(),button=$('rbDeveloperFeedbackNav');
  const root=$('rbDeveloperFeedbackRoot');
  if(!root.dataset.rendered){
   root.innerHTML='<section class="rbfb-card"><h2>💡 Feedback para o desenvolvedor</h2><p>Conte o que está funcionando, o que está dando problema ou o que seria útil adicionar.</p><form id="rbfbForm"><label for="rbfbCategory">Tipo de feedback</label><select id="rbfbCategory" class="rbfb-field"><option value="suggestion">Sugestão de melhoria ou nova função</option><option value="bug">Problema ou erro encontrado</option><option value="other">Outro comentário</option></select><label for="rbfbMessage">Sua mensagem</label><textarea id="rbfbMessage" class="rbfb-field" rows="5" maxlength="2500" placeholder="Explique sua ideia ou o problema. Inclua os passos para reproduzir quando for um bug." required></textarea><button class="rbfb-btn" id="rbfbSubmit" type="submit">Enviar feedback</button><p id="rbfbStatus" role="status" aria-live="polite"></p></form></section><section class="rbfb-card"><h3>Meus feedbacks</h3><p class="rbfb-muted">Aqui você acompanha o status e uma possível resposta do desenvolvedor.</p><div id="rbfbOwnList">Carregando…</div><button class="rbfb-btn" type="button" id="rbfbRefresh">Atualizar histórico</button></section>';
   $('rbfbForm').addEventListener('submit',submitFeedback);
   $('rbfbRefresh').addEventListener('click',loadOwnFeedback);
   root.dataset.rendered='true';
  }
  setActivePage(page,button);await loadOwnFeedback();
  requestAnimationFrame(()=>window.scrollTo({top:Math.max(0,window.scrollY+page.getBoundingClientRect().top-10),behavior:'auto'}));
 }
 async function loadAdminFeedback(){
  const c=client(),host=$('rbfbAdminList');
  if(!c||!host)return;
  host.textContent='Carregando feedbacks…';
  const r=await c.from('rabbitech_developer_feedback').select('id,author_user_id,category,message,page,status,admin_reply,created_at').order('created_at',{ascending:false}).limit(60);
  if(r.error){host.textContent='Falha ao carregar: '+r.error.message;return}
  if(!r.data?.length){host.textContent='Nenhum feedback recebido ainda.';return}
  host.replaceChildren();
  r.data.forEach(item=>{
   const article=document.createElement('article');article.className='rbfb-item';
   const title=document.createElement('strong');title.textContent=({suggestion:'Sugestão',bug:'Problema/bug',other:'Outro'}[item.category]||'Feedback')+' · '+new Date(item.created_at).toLocaleString();
   const detail=document.createElement('p');detail.textContent=item.message;
   const meta=document.createElement('small');meta.className='rbfb-muted';meta.textContent='Usuário '+String(item.author_user_id).slice(0,8)+' · página '+item.page;
   const status=document.createElement('select');status.className='rbfb-field';
   Object.entries(statuses).forEach(([key,label])=>{const option=document.createElement('option');option.value=key;option.textContent=label;option.selected=item.status===key;status.append(option)});
   const reply=document.createElement('textarea');reply.className='rbfb-field';reply.rows=2;reply.maxLength=2000;reply.placeholder='Resposta opcional ao usuário';reply.value=item.admin_reply||'';
   const save=document.createElement('button');save.className='rbfb-btn';save.type='button';save.textContent='Salvar análise';
   save.addEventListener('click',async()=>{
    save.disabled=true;
    try{
     const user=await currentUser();
     const result=await c.from('rabbitech_developer_feedback').update({status:status.value,admin_reply:reply.value.trim()||null,reviewed_by:user?.id||null,updated_at:new Date().toISOString()}).eq('id',item.id).select('id').single();
     if(result.error)throw result.error;
     save.textContent='Salvo';if(window.rbNotify)window.rbNotify('Feedback atualizado','O status do feedback foi salvo.');
    }catch(error){save.textContent='Erro ao salvar';console.error('Feedback update failed',error)}
    finally{save.disabled=false}
   });
   article.append(title,detail,meta,status,reply,save);host.append(article);
  });
 }
 async function ensureAdminPanel(){
  const panel=$('page-admin');if(!panel||$('rbDeveloperFeedbackAdmin'))return;
  const card=document.createElement('section');card.id='rbDeveloperFeedbackAdmin';card.className='rbfb-card';
  card.innerHTML='<h3>📥 Feedback dos usuários</h3><p class="rbfb-muted">Sugestões e problemas enviados pelo site. Somente administradores podem ver todos os registros.</p><div id="rbfbAdminList">Carregando…</div><button class="rbfb-btn" type="button" id="rbfbAdminRefresh">Atualizar feedbacks</button>';
  panel.append(card);$('rbfbAdminRefresh').addEventListener('click',loadAdminFeedback);
 }
 async function sync(){
  const user=await currentUser(),allowed=await isAdmin(user);
  ensureNav(user);
  if(allowed){
   await ensureAdminPanel();
   if(adminUserId!==user.id){
    adminUserId=user.id;
    if(feedbackChannel){try{client().removeChannel(feedbackChannel)}catch(_){}}
    feedbackChannel=client().channel('rb-developer-feedback-admin-'+user.id)
     .on('postgres_changes',{event:'*',schema:'public',table:'rabbitech_developer_feedback'},async payload=>{
      await loadAdminFeedback();
      if(payload?.eventType==='INSERT'&&window.rbNotify)window.rbNotify('Novo feedback recebido',String(payload.new?.message||'Um usuário enviou feedback.').slice(0,160));
     })
     .subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('Realtime do feedback administrativo indisponível.')});
   }
   await loadAdminFeedback();
  }else{
   adminUserId=null;
   if(feedbackChannel){try{client()?.removeChannel(feedbackChannel)}catch(_){}feedbackChannel=null}
  }
 }
 function init(){
  ensurePage();
  sync();
  window.addEventListener('rb-auth-state-changed',sync);
  const observer=new MutationObserver(()=>{if($('page-admin')&&!$('rbDeveloperFeedbackAdmin'))sync()});
  observer.observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();