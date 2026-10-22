export const CHANNELS=['Shopee','TikTok Shop','Sociolla online','Sociolla cửa hàng','Retailer chọn lọc'];
export const SKUS=['Hologram','Glitter','Cute Paws','Kitties','Panda'];
export const SCENARIOS={1:'Thử nhỏ',2:'Mở rộng có điều kiện',3:'Điều kiện đạt đề'};
export const MIX=[.25,.2,.2,.2,.15];
export const sum=a=>a.reduce((x,y)=>x+y,0);
export function round(x){return Math.sign(x)*Math.floor(Math.abs(x)+.50000000001)}
export function buildModel(data,scenario=2,sim={}){
 const S=data.sheets, g=S.Gia_dinh,k=S.Gia_dinh_kenh;
 const price=sim.price??g.C6-9000,cost=sim.cost??g.C7,cpaFactor=sim.cpa??1,cvrFactor=sim.cvr??1,volume=sim.volume??1,returns=sim.returns??0;
 const monthly=[];
 for(let c=0;c<5;c++)for(let m=0;m<3;m++){
  const r=7+c*12+m*4+(scenario-1),at=x=>Number(k[x+r]??0),days=[30,31,31][m],online=c<3;
  const netOrdersInput=at('E')*days,boxesInput=online?round(netOrdersInput*at('F')):round(days*at('G')*at('H'));
  const baseOrders=online?netOrdersInput:Math.ceil(boxesInput/at('F'));
  const preOrders=online?baseOrders*volume*cvrFactor:baseOrders*volume;
  const boxes=online?round(preOrders*at('F')*(1-returns)):round(boxesInput*volume);
  const orders=online?preOrders*(1-returns):Math.ceil(boxes/at('F'));
  const preBoxes=online?preOrders*at('F'):boxes;
  const gsv=boxes*g.C6,sales=boxes*price,discount=gsv-sales,retail=sales*at('P'),revenue=sales-retail;
  const cogs=boxes*cost,fees=sales*at('J')+preOrders*at('K'),affiliate=sales*at('L')*at('M');
  const ads=preOrders*at('N')*at('O')*cpaFactor,handling=(returns?preBoxes:boxes)*3000;
  monthly.push({channel:CHANNELS[c],ci:c,month:m+1,days,boxes,orders,preOrders,gsv,sales,discount,retail,revenue,cogs,fees,affiliate,ads,handling,cm:revenue-cogs-fees-affiliate-ads-handling,basket:at('F'),cvr:at('Q'),sessions:online?preOrders/(at('Q')||1):null,stores:at('G'),velocity:at('H'),feeRate:at('J'),fixedFee:at('K'),affShare:at('L'),affRate:at('M'),paidShare:at('N'),cpa:at('O')*cpaFactor,returnExtra:online?preOrders*returns:0});
 }
 const fixed=[1,2,3].map(m=>g[['D','E','F'][m-1]+(scenario===1?40:scenario===2?41:42)]);
 const staff=[1,2,3].map(m=>g[['D','E','F'][m-1]+(scenario===1?45:scenario===2?46:47)]);
 const opening=[5000,12000,20000][scenario-1],ending=[1,2,3].map(m=>g[['D','E','F'][m-1]+(scenario===1?60:scenario===2?61:62)]);
 const delay=[.45,.3,.25][scenario-1],apShare=.3,fund=g.C10;
 const months=[];let cash=fund-opening*cost,prevAR=0,prevAP=0,inventory=opening,cumulative=0;
 for(let m=1;m<=3;m++){
  const rs=monthly.filter(x=>x.month===m),get=f=>sum(rs.map(x=>x[f]));
  const o={month:m};for(const f of ['boxes','orders','gsv','sales','discount','retail','revenue','cogs','fees','affiliate','ads','handling','cm','preOrders'])o[f]=get(f);
  o.fixed=fixed[m-1];o.staff=staff[m-1];o.profit=o.cm-o.fixed-o.staff;o.promo=o.discount+o.retail+o.affiliate+o.ads+o.fixed;
  o.purchases=Math.max(0,o.boxes+ending[m-1]-inventory);o.actualEnding=inventory+o.purchases-o.boxes;o.purchaseCost=o.purchases*cost;o.receipts=o.revenue*(1-delay)+prevAR;o.payments=o.purchaseCost*(1-apShare)+prevAP;
  o.opex=o.fees+o.affiliate+o.ads+o.handling+o.fixed+o.staff;o.netCash=o.receipts-o.payments-o.opex;cash+=o.netCash;o.cash=cash;o.ar=o.revenue*delay;o.ap=o.purchaseCost*apShare;o.inventory=o.actualEnding;o.inventoryValue=o.actualEnding*cost;cumulative+=o.profit;o.cumulative=cumulative;
  o.balance=cash+o.ar+o.inventoryValue-(fund+cumulative+o.ap);prevAR=o.ar;prevAP=o.ap;inventory=o.inventory;months.push(o);
 }
 const total={};for(const f of ['boxes','orders','gsv','sales','discount','retail','revenue','cogs','fees','affiliate','ads','handling','cm','fixed','staff','profit','promo','purchases'])total[f]=sum(months.map(x=>x[f]));
 total.ratio=total.promo/total.gsv;total.margin=total.profit/total.revenue;total.cash=cash;total.gap=g.C8-total.boxes;total.attainment=total.boxes/g.C8;total.breakEven=total.cm>0?Math.ceil((total.fixed+total.staff)/(total.cm/total.boxes)):null;
 const daily=[];
 for(let m=1;m<=3;m++){
  const ws=data.weights.filter(x=>x.month===m),wtotal=sum(ws.map(x=>x.weight)),mb=months[m-1].boxes;let cum=0,prior=0;
  for(const w of ws){cum+=w.weight;const next=round(cum/wtotal*mb),boxes=next-prior;prior=next;const frac=mb?boxes/mb:0;daily.push({date:w.date,month:m,week:Math.floor((daily.length)/7)+1,boxes,weight:w.weight,frac,ads:months[m-1].ads*w.weight/wtotal});}
 }
 return {scenario,monthly,months,total,daily,opening,ending,price,cost,fund,fixed,staff,delay};
}
export function filtered(model,channel='all',period='all'){
 const rows=model.monthly.filter(x=>(channel==='all'||x.channel===channel)&&(period==='all'||x.month===Number(period)));
 const total={};for(const f of ['boxes','orders','gsv','sales','discount','retail','revenue','cogs','fees','affiliate','ads','handling','cm'])total[f]=sum(rows.map(x=>x[f]));
 const ms=model.months.filter(x=>period==='all'||x.month===Number(period));total.profit=channel==='all'?sum(ms.map(x=>x.profit)):null;total.fixed=channel==='all'?sum(ms.map(x=>x.fixed)):null;
 return {rows,total,months:ms};
}
export function skuBoxes(total){let acc=0;return SKUS.map((sku,i)=>{const boxes=i===4?total-acc:round(total*MIX[i]);acc+=boxes;return {sku,boxes,mix:MIX[i]}})}
export function cohorts(model){return [0,1].flatMap(c=>{const x=model.monthly.find(r=>r.ci===c),retention=1-x.returnExtra/Math.max(1,x.preOrders),revenue=model.price*x.basket*retention,cost=x.basket*model.cost*retention,fee=revenue*x.feeRate+x.fixedFee,handling=x.basket*3000,pre=revenue-cost-fee-handling;return [{channel:x.channel,group:'Không quảng cáo · không tiếp thị liên kết',cm:pre,ceiling:pre},{channel:x.channel,group:'Chỉ quảng cáo',cm:pre-x.cpa,ceiling:pre},{channel:x.channel,group:'Chỉ tiếp thị liên kết',cm:pre-revenue*x.affRate,ceiling:pre-revenue*x.affRate},{channel:x.channel,group:'Quảng cáo + tiếp thị liên kết',cm:pre-revenue*x.affRate-x.cpa,ceiling:pre-revenue*x.affRate}]})}
