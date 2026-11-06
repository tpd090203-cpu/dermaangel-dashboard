// Display interactions only. Financial inputs and actual orders are unchanged.
export const themes=[
 {id:'alexandrite',name:'Alexandrite',color:'#397e73',ink:'#285e56'},
 {id:'marina',name:'Marina',color:'#5c98bd',ink:'#356985'},
 {id:'dusty-rose',name:'Dusty Rose',color:'#b78588',ink:'#85585f'},
 {id:'acacia',name:'Acacia',color:'#c9c256',ink:'#787220'},
 {id:'muskmelon',name:'Muskmelon',color:'#e8ae86',ink:'#9a623f'},
 {id:'lava-falls',name:'Lava Falls',color:'#b64d49',ink:'#8a3636'},
 {id:'tea-rose',name:'Tea Rose',color:'#d89f9c',ink:'#995f63'},
 {id:'amaranth',name:'Amaranth',color:'#98618e',ink:'#75456c'},
 {id:'burnished-lilac',name:'Burnished Lilac',color:'#b09aaf',ink:'#786477'},
 {id:'burnt-sienna',name:'Burnt Sienna',color:'#ae6850',ink:'#7e4b3a'}
];
let returnFocus=null;
export function applyTheme(id){const t=themes.find(x=>x.id===id)||themes[0];document.documentElement.style.setProperty('--accent',t.color);document.documentElement.style.setProperty('--accent-ink',t.ink);document.documentElement.dataset.theme=t.id;try{localStorage.setItem('dnt-display-theme',t.id)}catch{}document.querySelectorAll('[data-theme-choice]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.themeChoice===t.id)));const title=document.querySelector('#themeName');if(title)title.textContent=t.name;}
export function closeInspector(){document.querySelector('#chartInspector').hidden=true;document.querySelector('#inspectorBackdrop').hidden=true;if(returnFocus?.isConnected)returnFocus.focus();}
export function showInspector(title,html){returnFocus=document.activeElement;const pane=document.querySelector('#chartInspector');document.querySelector('#inspectorTitle').textContent=title;document.querySelector('#inspectorBody').innerHTML=html;pane.hidden=false;document.querySelector('#inspectorBackdrop').hidden=false;document.querySelector('#closeInspector').focus();}
export function initDisplay(){
 const themePanel=document.querySelector('#themePanel');themePanel.innerHTML=`<strong>Bảng màu giao diện</strong><p>Sắc độ màn hình lấy cảm hứng từ bảng màu bạn chọn.</p><div class="theme-options">${themes.map(t=>`<button type="button" data-theme-choice="${t.id}" aria-label="${t.name}" aria-pressed="false" style="--swatch:${t.color}"><i></i>${t.name}<span>✓</span></button>`).join('')}</div><small>Nền Cloud Dancer · giữ nguyên số liệu khi đổi màu</small>`;
 let saved;try{saved=localStorage.getItem('dnt-display-theme')}catch{}applyTheme(saved||'alexandrite');
 document.querySelector('#themeToggle').onclick=()=>{themePanel.hidden=!themePanel.hidden;document.querySelector('#themeToggle').setAttribute('aria-expanded',String(!themePanel.hidden))};
 themePanel.addEventListener('click',e=>{const b=e.target.closest('[data-theme-choice]');if(b)applyTheme(b.dataset.themeChoice)});
 document.addEventListener('click',e=>{if(!e.target.closest('.theme-picker')){themePanel.hidden=true;document.querySelector('#themeToggle').setAttribute('aria-expanded','false')}});
 document.querySelector('#closeInspector').onclick=closeInspector;document.querySelector('#inspectorBackdrop').onclick=closeInspector;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!document.querySelector('#chartInspector').hidden)closeInspector();themePanel.hidden=true;document.querySelector('#tooltip').hidden=true}});
 const pane=document.querySelector('#chartInspector');pane.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const els=[...pane.querySelectorAll('button,a,input,select,[tabindex="0"]')].filter(el=>!el.hidden);if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus()}});
}
export function enhanceCharts(onAction){
 const tip=document.querySelector('#tooltip');tip.hidden=true;document.querySelectorAll('#content svg').forEach(svg=>svg.setAttribute('role','group'));
 document.querySelectorAll('#content svg rect,#content svg circle,#content svg polyline').forEach(el=>{
  const title=el.querySelector('title');const label=el.dataset.tip||title?.textContent;if(!label)return;
  el.dataset.tip=label;if(title)title.remove();el.classList.add('chart-hit');el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',label+(el.dataset.action?' · Bấm để tương tác':' · Xem chi tiết'));
  const move=e=>{tip.textContent=label;tip.hidden=false;tip.classList.add('visible');const r=el.getBoundingClientRect();const x=e.clientX??r.x+r.width/2,y=e.clientY??r.y;tip.style.left=Math.max(10,Math.min(window.innerWidth-tip.offsetWidth-12,x+16))+'px';tip.style.top=Math.max(10,Math.min(window.innerHeight-tip.offsetHeight-12,y+16))+'px'};
  const hide=()=>{tip.hidden=true;tip.classList.remove('visible')};el.addEventListener('pointerenter',move);el.addEventListener('pointermove',move);el.addEventListener('pointerleave',hide);el.addEventListener('focus',move);el.addEventListener('blur',hide);
  const activate=()=>{hide();onAction(el.dataset.action||'detail',el.dataset.value||'',label,el)};el.addEventListener('click',activate);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}});
 });
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('.kpi .value').forEach(el=>el.animate([{opacity:.25,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:380,easing:'ease-out'}));}
}
