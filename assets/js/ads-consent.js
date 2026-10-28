/* Rabbitech optional-ad consent. No third-party ad code is loaded by this file. */
(()=>{'use strict';
 const KEY='rabbitech_ads_consent_v1';
 const $=(tag,attrs={},text='')=>{const el=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='style')el.style.cssText=v;else if(k==='class')el.className=v;else el.setAttribute(k,v)}if(text)el.textContent=text;return el};
 const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return x&&x.version===1&&['accepted','rejected'].includes(x.choice)?x:null}catch(_){return null}};
 const save=choice=>{const value={version:1,choice,updatedAt:new Date().toISOString()};try{localStorage.setItem(KEY,JSON.stringify(value))}catch(_){/* Session still works if storage is blocked. */}apply(value);return value};
 let banner,settingsButton,adArea;
 function dispatch(value){window.rbAdsConsent=value;window.dispatchEvent(new CustomEvent('rb-ads-consent-changed',{detail:{choice:value?.choice||'unset',accepted:value?.choice==='accepted'}}))}
 function apply(value){
  document.documentElement.dataset.rbAdsConsent=value?.choice||'unset';
  if(adArea)adArea.hidden=true;
  if(banner)banner.hidden=!!value;
  if(settingsButton)settingsButton.hidden=false;
  dispatch(value);
  renderAds();
 }
  function renderAds(){
  const slot=adArea?.querySelector('.rb-ad-slot');
  const provider=window.rbAdsProvider;
  const accepted=read()?.choice==='accepted';
  if(!slot)return;
  if(!accepted||!provider||typeof provider.render!=='function'){
   if(provider&&typeof provider.clear==='function'){try{provider.clear(slot)}catch(_){}}
   slot.replaceChildren();
   delete slot.dataset.rbRendered;
   if(adArea)adArea.hidden=true;
   return;
  }
  if(slot.dataset.rbRendered==='true')return;
  if(adArea)adArea.hidden=false;
  try{
   const result=provider.render(slot,{consent:window.rbAdsConsent});
   slot.dataset.rbRendered='true';
   if(result&&typeof result.catch==='function')result.catch(error=>{
    delete slot.dataset.rbRendered;
    if(adArea)adArea.hidden=true;
    console.warn('Não foi possível carregar o anúncio opcional.',error);
   });
  }catch(error){
   delete slot.dataset.rbRendered;
   if(adArea)adArea.hidden=true;
   console.warn('Não foi possível carregar o anúncio opcional.',error);
  }
 }
function openConsent(){if(banner){banner.hidden=false;if(settingsButton)settingsButton.hidden=true;banner.querySelector('[data-ads-accept]')?.focus({preventScroll:true})}}
 function mount(){
  if(document.getElementById('rbAdsConsentBanner'))return;
  const style=$('style',{},`
   #rbAdsConsentBanner{position:fixed;z-index:120;left:12px;right:12px;bottom:calc(148px + env(safe-area-inset-bottom));max-width:620px;margin-left:auto;padding:14px;border:1px solid #49684b;border-radius:16px;background:rgba(8,22,13,.97);color:#f4fff5;box-shadow:0 12px 34px #0008;backdrop-filter:blur(14px);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
   #rbAdsConsentBanner[hidden],#rbAdsSettings[hidden],#rbOptionalAdArea[hidden]{display:none!important}
   #rbAdsConsentBanner p{margin:6px 0 12px;color:#c4d9c8}
   #rbAdsConsentBanner .rb-ads-actions{display:flex;flex-wrap:wrap;gap:8px}
   #rbAdsConsentBanner button,#rbAdsSettings{font:700 13px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;border:1px solid #49684b;border-radius:999px;padding:10px 13px;min-height:40px;cursor:pointer}
   #rbAdsConsentBanner [data-ads-accept]{background:#d0f477;color:#17220e;border-color:#d0f477}
   #rbAdsConsentBanner [data-ads-reject],#rbAdsConsentBanner [data-ads-manage]{background:#14291b;color:#f4fff5}
   #rbAdsSettings{position:fixed;z-index:110;right:12px;bottom:calc(148px + env(safe-area-inset-bottom));background:#14291b;color:#eaf7e8;box-shadow:0 4px 18px #0005}
   #rbOptionalAdArea{max-width:1100px;margin:16px auto;padding:0 14px}
   #rbOptionalAdArea .rb-ad-slot{min-height:0;border:1px dashed #49684b;border-radius:12px;padding:8px;color:#adc4b2;font-size:11px;text-align:center}
   @media(min-width:760px){#rbAdsConsentBanner{bottom:18px}#rbAdsSettings{bottom:16px}}
   @media(prefers-reduced-motion:reduce){#rbAdsConsentBanner{scroll-behavior:auto}}
  `);
  document.head.append(style);
  banner=$('section',{id:'rbAdsConsentBanner','role':'region','aria-label':'Preferências de anúncios','aria-live':'polite'});
  banner.append($('strong',{},'Anúncios opcionais'),$('p',{},'O Rabbitech pode exibir anúncios discretos para ajudar a manter o site. Você escolhe. A recusa não limita nenhuma função e sua escolha fica salva neste navegador.'));
  const actions=$('div',{class:'rb-ads-actions'});
  const accept=$('button',{'type':'button','data-ads-accept':''},'Aceitar anúncios opcionais');
  const reject=$('button',{'type':'button','data-ads-reject':''},'Recusar');
  const manage=$('button',{'type':'button','data-ads-manage':''},'Decidir depois');
  accept.addEventListener('click',()=>save('accepted'));
  reject.addEventListener('click',()=>save('rejected'));
  manage.addEventListener('click',()=>{banner.hidden=true;if(settingsButton)settingsButton.hidden=false;});
  actions.append(accept,reject,manage);banner.append(actions);
  settingsButton=$('button',{id:'rbAdsSettings',type:'button','aria-label':'Alterar preferências de anúncios'},'Preferências de anúncios');
  settingsButton.addEventListener('click',openConsent);
  adArea=$('section',{id:'rbOptionalAdArea','aria-label':'Anúncios opcionais',hidden:''});
  const label=$('div',{class:'rb-ad-label'},'Anúncio opcional');
  const slot=$('div',{class:'rb-ad-slot','data-rb-ad-slot':'main'});
  adArea.append(label,slot);
  // Insert below main content, never over the scoreboard or navigation.
  const main=document.querySelector('main');
  if(main&&main.parentNode)main.insertAdjacentElement('afterend',adArea);else document.body.append(adArea);
  document.body.append(banner,settingsButton);
  const saved=read();
  if(saved)apply(saved);else{banner.hidden=false;settingsButton.hidden=true;document.documentElement.dataset.rbAdsConsent='unset';dispatch(null)}
  renderAds();
  // Ads remain hidden unless the user opted in and an actual provider is configured.
  window.addEventListener('rb-ads-provider-ready',renderAds);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();