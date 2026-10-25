/* Rabbitech mobile dock and admin navigation controller. */
(()=>{'use strict';
 const OWNER_ID='7e799691-ba7e-42ea-ab6f-71ad11ca32ff';
 const $=id=>document.getElementById(id);
 function currentUser(){try{return (typeof rbCloudUser!=='undefined'&&rbCloudUser)||window.rbCloudUser||null}catch(_){return window.rbCloudUser||null}}
 function adminAllowed(){
  const user=currentUser(); if(!user)return false;
  const owner=String(user.id||'')===OWNER_ID;
  let flag=false; try{flag=(typeof rbIsAdmin!=='undefined'&&rbIsAdmin===true)||window.rbIsAdmin===true}catch(_){}
  return owner||flag;
 }
 function syncAdmin(){
  const allowed=adminAllowed(),button=$('rbAdminNav'),page=$('page-admin');
  if(button)button.hidden=!allowed;
  if(page){if(!allowed){page.hidden=true;page.classList.remove('active')}else if(page.classList.contains('active'))page.hidden=false}
 }
 function setupDock(){
  const nav=document.querySelector('nav button[data-page]')?.closest('nav'); if(!nav)return;
  nav.classList.add('rb-samsung-dock');
  nav.querySelectorAll('#rbDockMore,#rbDockExpand,#rbDockExpandOne,#rbFinalDockMore').forEach(el=>el.remove());
  const more=document.createElement('button');more.id='rbDockExpandOne';more.type='button';more.textContent='+';
  more.title='Mostrar mais abas';more.setAttribute('aria-label','Mostrar mais abas');more.setAttribute('aria-expanded','false');
  more.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const open=nav.classList.toggle('rb-dock-expanded');more.textContent=open?'−':'+';more.title=open?'Recolher abas':'Mostrar mais abas';more.setAttribute('aria-label',more.title);more.setAttribute('aria-expanded',String(open))});
  nav.appendChild(more);
  nav.querySelectorAll('button[data-page="admin"]').forEach(btn=>{if(btn.id!=='rbAdminNav')btn.id='rbAdminNav'});
 }
 function placeLanguageButton(){
  const btn=$('rbLanguageReopen'),header=document.querySelector('body>header'); if(!btn||!header)return;
  const row=header.firstElementChild;
  if(row&&btn.parentElement!==row){row.appendChild(btn)}
 }
 function init(){
  setupDock();placeLanguageButton();syncAdmin();
  document.addEventListener('click',e=>{
   const btn=e.target?.closest?.('nav button[data-page="admin"]');if(!btn)return;
   if(!adminAllowed()){e.preventDefault();e.stopImmediatePropagation();syncAdmin()}
  },true);
  const observer=new MutationObserver(()=>{setupDock();placeLanguageButton();syncAdmin()});
  observer.observe(document.body,{childList:true,subtree:true});
  let prev='';
  setInterval(()=>{const u=currentUser();const key=u?String(u.id)+':'+String(adminAllowed()):'out';if(key!==prev){prev=key;syncAdmin()}},800);
  window.addEventListener('rb-auth-state-changed',syncAdmin);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();