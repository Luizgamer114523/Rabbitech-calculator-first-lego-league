/* Rabbitech competition tools. Local-only; no network calls or database writes. */
(()=>{'use strict';
 const STORAGE_KEY='rbStrategyLab.v1';
 const $=id=>document.getElementById(id);
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
 const asNumber=(v,fallback=0)=>{const n=Number(v);return Number.isFinite(n)?n:fallback};
 function make(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
 function addStyles(){
  if($('rbCompetitionToolsStyles'))return;
  const style=make('style');style.id='rbCompetitionToolsStyles';
  style.textContent=`
   .rb-tools-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0}
   .rb-tool-card{min-width:0;padding:16px;border:1px solid var(--line,rgba(208,244,119,.25));border-radius:16px;background:var(--panel,rgba(7,19,12,.85));color:var(--text,#edf7ed)}
   .rb-tool-card h3{margin:0 0 6px;font-size:18px}
   .rb-tool-subtitle{margin:0 0 14px;font-size:12px;color:var(--muted,#a9b9ad);line-height:1.45}
   .rb-tool-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
   .rb-tool-fields label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--muted,#a9b9ad)}
   .rb-tool-fields input{box-sizing:border-box;width:100%;min-width:0;padding:10px;border-radius:9px;border:1px solid var(--line,#49684b);background:var(--panel2,#07140d);color:var(--text,#edf7ed);font:inherit}
   .rb-tool-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
   .rb-tool-button{min-height:40px;padding:9px 12px;border:1px solid var(--line,#49684b);border-radius:10px;background:rgba(208,244,119,.1);color:inherit;font:inherit;font-weight:700;cursor:pointer}
   .rb-tool-button:disabled{opacity:.45;cursor:not-allowed}
   .rb-tool-status{min-height:1.3em;margin:10px 0 0;font-size:12px;color:var(--muted,#a9b9ad)}
   .rb-strategy-list{display:grid;gap:8px;margin-top:12px}
   .rb-strategy-item{padding:12px;border:1px solid var(--line,rgba(208,244,119,.2));border-radius:12px;background:rgba(255,255,255,.025)}
   .rb-strategy-item-head{display:flex;justify-content:space-between;align-items:start;gap:8px}
   .rb-strategy-item-title{font-weight:800;overflow-wrap:anywhere}
   .rb-strategy-rank{flex:0 0 auto;font-size:11px;color:var(--lime,#d0f477);font-weight:800}
   .rb-strategy-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
   .rb-strategy-metric small{display:block;font-size:10px;color:var(--muted,#a9b9ad)}
   .rb-strategy-metric strong{font-size:14px;font-variant-numeric:tabular-nums}
   .rb-strategy-delete{font-size:11px;min-height:32px;padding:6px 9px;margin-top:9px}
   @media(max-width:760px){.rb-tools-grid{grid-template-columns:minmax(0,1fr)}.rb-tool-card{padding:13px}.rb-strategy-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}}
   @media(prefers-reduced-motion:reduce){.rb-tool-card *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
  `;
  document.head.appendChild(style);
 }
 function createStrategyCard(){
  const card=make('section','rb-tool-card');card.id='rbStrategyCompare';card.setAttribute('aria-labelledby','rbStrategyCompareTitle');
  const title=make('h3','','🧭 Comparador de estratégias');title.id='rbStrategyCompareTitle';card.appendChild(title);
  card.appendChild(make('p','rb-tool-subtitle','Compare planos de forma transparente. Pontuação esperada = pontos potenciais × confiabilidade estimada. São estimativas da equipe, não uma validação das regras oficiais.'));
  const fields=make('div','rb-tool-fields');
  const setup=[
   ['Nome do plano','rbStrategyName','text','Plano A',''],
   ['Pontos potenciais estimados','rbStrategyPoints','number','120','0'],
   ['Confiabilidade estimada (%)','rbStrategyConfidence','number','75','0'],
   ['Tempo da sequência (segundos)','rbStrategyTime','number','120','10']
  ];
  setup.forEach(([labelText,id,type,value,min])=>{
   const label=make('label','',labelText);const input=make('input');input.id=id;input.type=type;input.value=value;
   if(type==='number'){input.min=min;input.max=id==='rbStrategyPoints'?'500':id==='rbStrategyConfidence'?'100':'150';input.step=id==='rbStrategyConfidence'?'5':'5';input.inputMode='numeric';}
   if(id==='rbStrategyName')input.maxLength=40;
   label.appendChild(input);fields.appendChild(label);
  });
  card.appendChild(fields);
  const actions=make('div','rb-tool-actions');const save=make('button','rb-tool-button','Salvar para comparar');save.id='rbStrategySave';save.type='button';actions.appendChild(save);card.appendChild(actions);
  const status=make('p','rb-tool-status','Planos salvos somente neste dispositivo.');status.id='rbStrategyStatus';status.setAttribute('role','status');card.appendChild(status);
  const list=make('div','rb-strategy-list');list.id='rbStrategyList';list.setAttribute('aria-live','polite');card.appendChild(list);
  return card;
 }
 function formatTime(seconds){const n=Math.max(0,Math.ceil(seconds));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
 function readStrategies(){
  try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(parsed)?parsed.filter(p=>p&&typeof p.name==='string'&&Number.isFinite(Number(p.points))&&Number.isFinite(Number(p.confidence))&&Number.isFinite(Number(p.time))):[];}
  catch(_){return [];}
 }
 function writeStrategies(items){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items));return true;}catch(_){return false;}}
 function expected(plan){return Number(plan.points)*Number(plan.confidence)/100;}
 function sorted(items){return items.slice().sort((a,b)=>expected(b)-expected(a)||expected(b)/(Number(b.time)||1)-expected(a)/(Number(a.time)||1)||a.name.localeCompare(b.name));}
 function renderStrategies(){
  const host=$('rbStrategyList'),status=$('rbStrategyStatus');if(!host||!status)return;
  const items=sorted(readStrategies());host.replaceChildren();
  if(!items.length){host.appendChild(make('p','rb-tool-status','Nenhuma estratégia salva. Registre pelo menos dois planos para compará-los lado a lado.'));return;}
  items.forEach((plan,index)=>{
   const item=make('article','rb-strategy-item');const head=make('div','rb-strategy-item-head');head.append(make('div','rb-strategy-item-title',plan.name),make('div','rb-strategy-rank','#'+(index+1)));item.appendChild(head);
   const metrics=make('div','rb-strategy-metrics');
   [['Esperado',expected(plan).toFixed(1)],['Potencial',String(Number(plan.points))],['Confiança',String(Number(plan.confidence))+'%'],['Tempo',formatTime(Number(plan.time))],['Pontos/min',((expected(plan)/(Number(plan.time)||1))*60).toFixed(1)],['Objetivo',plan.goal||'Personalizado']].forEach(([label,value])=>{const cell=make('div','rb-strategy-metric');cell.append(make('small','',label),make('strong','',value));metrics.appendChild(cell);});
   item.appendChild(metrics);
   const remove=make('button','rb-tool-button rb-strategy-delete','Remover plano');remove.type='button';remove.addEventListener('click',()=>{const remaining=readStrategies().filter(entry=>entry.id!==plan.id);if(!writeStrategies(remaining)){status.textContent='O navegador bloqueou o armazenamento. Nenhuma mudança foi salva.';return;}status.textContent='Plano removido.';renderStrategies();});item.appendChild(remove);
   host.appendChild(item);
  });
  status.textContent=items.length+' plano(s) salvo(s) neste dispositivo. A classificação usa a pontuação esperada estimada; não é a pontuação oficial da partida.';
 }
 function wireStrategies(){
  const save=$('rbStrategySave'),status=$('rbStrategyStatus');
  save.addEventListener('click',()=>{
   const name=$('rbStrategyName').value.trim().slice(0,40)||'Plano sem nome';
   const points=clamp(asNumber($('rbStrategyPoints').value,0),0,500);
   const confidence=clamp(asNumber($('rbStrategyConfidence').value,75),0,100);
   const time=clamp(asNumber($('rbStrategyTime').value,120),10,150);
   const goal=$('goal')?.value||'Personalizado';
   const list=readStrategies();
   const old=list.find(entry=>entry.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'));
   const item={id:old?.id||String(Date.now()),name,points,confidence,time,goal,savedAt:new Date().toISOString()};
   const next=old?list.map(entry=>entry.id===old.id?item:entry):[...list,item];
   if(next.length>8){status.textContent='Limite de oito planos. Remova um plano antes de salvar outro.';return;}
   if(!writeStrategies(next)){status.textContent='O navegador bloqueou o armazenamento local. Libere o armazenamento para salvar os planos.';return;}
   status.textContent=(old?'Plano atualizado.':'Plano salvo.')+' Pontuação esperada: '+expected(item).toFixed(1)+' pontos.';
   renderStrategies();
  });
  renderStrategies();
 }
 function init(){
  const page=$('page-strategy');if(!page||$('rbCompetitionTools'))return;
  addStyles();
  const header=page.querySelector('.section-title');
  if(!header)return;
  const grid=make('div','rb-tools-grid');grid.id='rbCompetitionTools';grid.append(createStrategyCard());
  const priorities=[...page.querySelectorAll('.section-title')].find(el=>el.textContent.includes('Prioridades para a competição'));
  if(priorities)page.insertBefore(grid,priorities);else header.insertAdjacentElement('afterend',grid);
  wireStrategies();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
