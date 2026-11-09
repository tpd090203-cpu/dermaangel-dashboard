import {summarize,known,estimateCommission} from './model.js';
export function planSummary(data,scenarioId='base',shipping=15000){
 const sc=data.forecast.scenarios.find(x=>x.id===scenarioId)||data.forecast.scenarios[0],actual=summarize(data),a=data.forecast.assumptions;
 const futureBoxes=sc.lines.reduce((n,r)=>n+r.boxes,0),futureSales=sc.lines.reduce((n,r)=>n+r.salesVnd,0),futureOrders=sc.lines.length;
 const totals={boxes:actual.boxes+futureBoxes,sales:actual.salesVnd+futureSales,orders:actual.orderCount+futureOrders};
 const wholes=sc.lines.filter(r=>r.type==='wholesale'),retail=sc.lines.filter(r=>r.type==='retail'),shippingActual=actual.shippingActualVnd;
 const paidRetailOrders=Math.ceil(retail.length*(1-(a.retailNoShippingRate??0))-1e-9);
 const plannedShipments=wholes.length+paidRetailOrders;
 const preorderShipping=known(shippingActual)?shippingActual:actual.orderCount*shipping;
 const futureShipping=plannedShipments*shipping,totalShipping=preorderShipping+futureShipping;
 const backupShipping=preorderShipping+futureOrders*shipping;
 const packaging=a.printingPackagingBudgetVnd,reserve=Math.round((totalShipping+packaging)*a.contingencyRate);
 const whole=estimateCommission(data,totals.sales,'whole'),marginal=estimateCommission(data,totals.sales,'marginal');
 const byDate=Array.from({length:27},(_,k)=>{const day=k+4,date=`2026-11-${String(day).padStart(2,'0')}`,lines=sc.lines.filter(r=>r.date===date);return {date,day,boxes:lines.reduce((n,r)=>n+r.boxes,0),orders:lines.length,sales:lines.reduce((n,r)=>n+r.salesVnd,0)}});
 let cboxes=actual.boxes,csales=actual.salesVnd;
 for(const row of byDate){cboxes+=row.boxes;csales+=row.sales;row.cumulativeBoxes=cboxes;row.cumulativeSales=csales;row.plannedStock=(row.day>=11?500:100)-cboxes;}
 return {sc,actual,a,futureBoxes,futureSales,futureOrders,totals,totalShipping,futureShipping,backupShipping,paidRetailOrders,packaging,reserve,backupOperatingCash:Math.round((backupShipping+packaging)*(1+a.contingencyRate)),operatingCash:totalShipping+packaging+reserve,whole,marginal,
 teamBalanceWhole:whole-totalShipping-packaging,teamBalanceMarginal:marginal-totalShipping-packaging,
 wholesaleOrders:wholes.length,retailOrders:retail.length,wholesaleBoxes:wholes.reduce((n,r)=>n+r.boxes,0),retailBoxes:retail.reduce((n,r)=>n+r.boxes,0),
 prospectsNeeded:Math.ceil(wholes.length/a.wholesaleConversion),conversationsNeeded:Math.ceil(retail.filter(r=>r.channel==='offline').length/a.retailConversion),
 remainingStock:500-totals.boxes,byDate,
 channels:data.channels.map(c=>({id:c.id,name:c.name,boxes:sc.lines.filter(r=>r.channel===c.id).reduce((n,r)=>n+r.boxes,0),sales:sc.lines.filter(r=>r.channel===c.id).reduce((n,r)=>n+r.salesVnd,0),orders:sc.lines.filter(r=>r.channel===c.id).length})),
 sku:data.catalog.map(k=>({id:k.id,name:k.name,b1:data.receipts[0].skuQuantities[k.id],b2:data.receipts[1].skuQuantities[k.id],plannedSales:sc.skuAllocation[k.id],remaining:data.receipts[1].skuQuantities[k.id]-sc.skuAllocation[k.id]}))};
}
