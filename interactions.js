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
function mixColor(a,b,weight){
 const rgb=hex=>hex.slice(1).match(/../g).map(value=>parseInt(value,16));
 const left=rgb(a),right=rgb(b);
 return '#'+left.map((value,i)=>Math.round(value*(1-weight)+right[i]*weight).toString(16).padStart(2,'0')).join('');
}
export function applyTheme(id){
 const t=themes.find(x=>x.id===id)||themes[0],root=document.documentElement;
 const tokens={
  '--accent':t.color,'--accent-ink':t.ink,
  '--nav-top':mixColor(t.ink,'#111923',.40),
  '--nav-middle':mixColor(t.ink,'#111923',.20),
  '--nav-bottom':mixColor(t.color,'#111923',.48),
  '--nav-glow':mixColor(t.color,'#ffffff',.12),
  '--nav-detail':mixColor(t.color,'#ffffff',.78),
  '--nav-active':mixColor(t.color,'#ffffff',.55),
  '--theme-soft':mixColor(t.color,'#fffefa',.91),
  '--theme-wash':mixColor(t.color,'#f5f3ef',.85),
  '--theme-line':mixColor(t.color,'#e8e7e2',.75),
  '--theme-text':mixColor(t.ink,'#28343b',.40),
  '--theme-muted':mixColor(t.ink,'#747c7e',.70),
  '--chart-secondary':mixColor(t.color,'#5c98bd',.58),
  '--chart-tertiary':mixColor(t.color,'#e8ae86',.72),
  '--chart-quaternary':mixColor(t.color,'#b78588',.68)
 };
 Object.entries(tokens).forEach(([name,value])=>root.style.setProperty(name,value));
 root.dataset.theme=t.id;
 try{localStorage.setItem('dnt-display-theme',t.id)}catch{}
 document.querySelectorAll('[data-theme-choice]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.themeChoice===t.id)));
 const title=document.querySelector('#themeName');if(title)title.textContent=t.name;
}
export function closeInspector(){document.querySelector('#chartInspector').hidden=true;document.querySelector('#inspectorBackdrop').hidden=true;if(returnFocus?.isConnected)returnFocus.focus();}
export function showInspector(title,html){returnFocus=document.activeElement;const pane=document.querySelector('#chartInspector');document.querySelector('#inspectorTitle').textContent=title;document.querySelector('#inspectorBody').innerHTML=html;pane.hidden=false;document.querySelector('#inspectorBackdrop').hidden=false;document.querySelector('#closeInspector').focus();}
export function initDisplay(){
 const themePanel=document.querySelector('#themePanel');themePanel.innerHTML=`<strong>Bảng màu giao diện</strong><p>Đồng bộ màu dashboard và thanh điều khiển.</p><div class="theme-options">${themes.map(t=>`<button type="button" data-theme-choice="${t.id}" aria-label="${t.name}" aria-pressed="false" style="--swatch:${t.color}"><i></i>${t.name}<span>✓</span></button>`).join('')}</div><small>Nền Cloud Dancer · Ombre theo tông màu đã chọn</small>`;
 let saved;try{saved=localStorage.getItem('dnt-display-theme')}catch{}applyTheme(saved||'alexandrite');
 document.querySelector('#themeToggle').onclick=()=>{themePanel.hidden=!themePanel.hidden;document.querySelector('#themeToggle').setAttribute('aria-expanded',String(!themePanel.hidden))};
 themePanel.addEventListener('click',e=>{const b=e.target.closest('[data-theme-choice]');if(b)applyTheme(b.dataset.themeChoice)});
 document.addEventListener('click',e=>{if(!e.target.closest('.theme-picker')){themePanel.hidden=true;document.querySelector('#themeToggle').setAttribute('aria-expanded','false')}});
 document.querySelector('#closeInspector').onclick=closeInspector;document.querySelector('#inspectorBackdrop').onclick=closeInspector;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!document.querySelector('#chartInspector').hidden)closeInspector();themePanel.hidden=true;document.querySelector('#tooltip').hidden=true}});
 const pane=document.querySelector('#chartInspector');pane.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const els=[...pane.querySelectorAll('button,a,input,select,[tabindex="0"]')].filter(el=>!el.hidden);if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus()}});
}
let gradientSequence=0;
export function applyChartOmbre(){
 const ns='http://www.w3.org/2000/svg';
 document.querySelectorAll('#content svg').forEach(svg=>{
  if(svg.querySelector('[data-chart-ombre]'))return;
  const defs=document.createElementNS(ns,'defs');defs.dataset.chartOmbre='true';
  svg.prepend(defs);
  const horizontal=!!svg.closest('.horizontal,.gantt-scroll'),gradients=new Map();
  const gradient=(paint,kind)=>{
   const key=kind+paint;if(gradients.has(key))return gradients.get(key);
   const id='dnt-ombre-'+(++gradientSequence),g=document.createElementNS(ns,'linearGradient');
   g.id=id;
   if(kind==='stroke'){
    const box=svg.viewBox.baseVal;g.setAttribute('gradientUnits','userSpaceOnUse');
    g.setAttribute('x1',String(box.x));g.setAttribute('x2',String(box.x+box.width));
    g.setAttribute('y1',String(box.y));g.setAttribute('y2',String(box.y+box.height));
   }else{
    g.setAttribute('x1','0%');g.setAttribute('y1','0%');
    g.setAttribute('x2',horizontal?'100%':'15%');g.setAttribute('y2',horizontal?'15%':'100%');
   }
   const stops=kind==='area'
    ?[['0%',paint,'.26'],['100%',paint,'0']]
    :[['0%',`color-mix(in srgb, ${paint} 62%, white)`,'1'],['48%',paint,'1'],['100%',`color-mix(in srgb, ${paint} 84%, var(--accent-ink))`,'1']];
   stops.forEach(([offset,color,opacity])=>{const stop=document.createElementNS(ns,'stop');stop.setAttribute('offset',offset);stop.style.stopColor=color;stop.setAttribute('stop-opacity',opacity);g.append(stop)});
   defs.append(g);const url=`url(#${id})`;gradients.set(key,url);return url;
  };
  const paintable=paint=>paint&&!/^(none|transparent|white|#fff(?:fff)?|url\()/i.test(paint)&&paint!=='var(--plot-bg)'&&paint!=='var(--acacia-ink)';
  svg.querySelectorAll('rect,circle,polyline,path,polygon').forEach(shape=>{
   for(const attr of ['fill','stroke']){
    const paint=shape.getAttribute(attr);
    if(paintable(paint))shape.setAttribute(attr,gradient(paint,shape.tagName.toLowerCase()==='polygon'?'area':attr));
   }
  });
  const line=svg.querySelector('.chart-line');
  if(line){
   const points=line.getAttribute('points').trim().split(/\s+/).map(p=>p.split(',').map(Number));
   if(points.length>1&&points.every(p=>p.length===2&&p.every(Number.isFinite))){
    const area=document.createElementNS(ns,'polygon'),baseline=svg.viewBox.baseVal.height-56;
    area.setAttribute('points',`${points[0][0]},${baseline} ${line.getAttribute('points')} ${points.at(-1)[0]},${baseline}`);
    area.setAttribute('fill',gradient('var(--accent)','area'));area.setAttribute('class','chart-ombre-area');
    area.setAttribute('aria-hidden','true');line.before(area);
   }
  }
 });
}
export function enhanceCharts(onAction){
 applyChartOmbre();
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
