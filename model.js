// V3.1: pure calculations from data.json. No workbook drivers or legacy SKU mix.
export const sum = xs => xs.reduce((a, b) => a + b, 0);
export const known = v => typeof v === 'number' && Number.isFinite(v);
const completeSum = (rows, field) => rows.length && rows.every(r => known(r[field])) ? sum(rows.map(r => r[field])) : null;
export function validateData(data) {
 if (data.schemaVersion !== '3.1') throw Error('Chỉ hỗ trợ nguồn V3.1; không đọc workbook cũ.');
 const positiveInt = v => Number.isInteger(v) && v > 0;
 if (!positiveInt(data.project.targetBoxes)) throw Error('Mục tiêu hộp không hợp lệ.');
 if (!Array.isArray(data.orders) || !Array.isArray(data.catalog) || !Array.isArray(data.channels)) throw Error('Thiếu bảng đơn, SKU hoặc kênh.');
 const ids = new Set(), skuIds = new Set(data.catalog.map(s => s.id)), channels = new Set(data.channels.map(c => c.id));
 for (const o of data.orders) {
  if (!o.id || ids.has(o.id)) throw Error('Mã đơn thiếu hoặc trùng.');
  ids.add(o.id);
  if (!positiveInt(o.boxes) || !known(o.salesVnd) || o.salesVnd < 0) throw Error('Số hộp hoặc tiền hàng không hợp lệ: ' + o.id);
  if (!['retail','wholesale'].includes(o.type)) throw Error('Loại giao dịch không hợp lệ.');
  if (o.channel !== null && !channels.has(o.channel)) throw Error('Kênh chưa có trong danh mục.');
  if (o.skuId !== null && !skuIds.has(o.skuId)) throw Error('SKU chưa có trong danh mục.');
  for (const f of ['shippingActualVnd','deliveredBoxes','returnedBoxes','cashReceivedVnd']) {
   if (o[f] !== null && (!known(o[f]) || o[f] < 0)) throw Error('Trường actual phải là số hợp lệ hoặc null: ' + f);
  }
  if (known(o.deliveredBoxes) && o.deliveredBoxes > o.boxes) throw Error('Giao vượt số hộp của đơn.');
 }
 if (sum(data.receipts.map(r => r.boxes)) !== data.project.targetBoxes) throw Error('Tổng lượng nhập phải khớp mục tiêu chiến dịch.');
 for(const r of data.receipts){if(r.skuQuantities && sum(Object.values(r.skuQuantities))!==r.boxes)throw Error('Cơ cấu SKU không khớp đợt '+r.id);}
 if (data.costs.shippingScenariosVnd.some(v => !known(v) || v < 0)) throw Error('Kịch bản vận chuyển không hợp lệ.');
 return data;
}
export function selectOrders(data, filters = {}) {
 const verified = data.orders.filter(o => o.verification === 'confirmed');
 const {channel='all', type='all', sku='all', phase='all'} = filters;
 const pre = verified.filter(o => (type === 'all' || o.type === type) && (phase === 'all' || o.salesPhase === phase));
 const rows = pre.filter(o => (channel === 'all' || (channel === 'unassigned' ? o.channel === null : o.channel === channel)) && (sku === 'all' || o.skuId === sku));
 const unresolved = pre.filter(o => (channel !== 'all' && channel !== 'unassigned' && o.channel === null) || (sku !== 'all' && o.skuId === null));
 return {rows, unresolved, incomplete:unresolved.length > 0, noAttributedData:rows.length === 0 && unresolved.length > 0};
}
export function summarize(data, filters = {}) {
 const scope = selectOrders(data, filters), rows = scope.rows;
 const boxes = scope.noAttributedData ? null : sum(rows.map(o => o.boxes));
 const salesVnd = scope.noAttributedData ? null : sum(rows.map(o => o.salesVnd));
 const orderCount = scope.noAttributedData ? null : rows.length;
 return {...scope, boxes, salesVnd, orderCount,
  aovVnd:orderCount ? salesVnd / orderCount : null,
  aspVnd:known(boxes) && boxes > 0 ? salesVnd / boxes : null,
  progress:known(boxes) ? boxes / data.project.targetBoxes : null,
  remainingBoxes:known(boxes) ? Math.max(0, data.project.targetBoxes - boxes) : null,
  shippingActualVnd:completeSum(rows,'shippingActualVnd'),
  cashReceivedVnd:completeSum(rows,'cashReceivedVnd'),
  deliveredBoxes:completeSum(rows,'deliveredBoxes'),
  profitVnd:null // Ownership, COGS and complete expenses are not established.
 };
}
export function channelTotals(data) {
 const verified = data.orders.filter(o => o.verification === 'confirmed');
 return [...data.channels, {id:'unassigned',name:'Chưa phân kênh'}].map(c => {
  const rows = verified.filter(o => c.id === 'unassigned' ? o.channel === null : o.channel === c.id);
  const incomplete = c.id !== 'unassigned' && verified.some(o => o.channel === null);
  return {...c, orders:rows.length || (incomplete ? null : 0), boxes:rows.length ? sum(rows.map(o => o.boxes)) : (incomplete ? null : 0), salesVnd:rows.length ? sum(rows.map(o => o.salesVnd)) : (incomplete ? null : 0), incomplete};
 });
}
export function priceForOrder(data, type, boxes) {
 if (!Number.isInteger(boxes) || boxes <= 0) return null;
 if (type === 'retail_regular') return data.prices.retailRegularVnd;
 if (type === 'retail_discount') return data.prices.retailDiscountVnd;
 if (type !== 'wholesale') return null;
 const tier = [...data.prices.wholesaleTiers].sort((a,b) => b.minBoxes-a.minBoxes).find(t => boxes >= t.minBoxes);
 return tier?.priceVnd ?? null;
}
export function shippingScenarios(data, filters = {}) {
 const s = summarize(data, filters);
 return data.costs.shippingScenariosVnd.map(fee => ({fee, orders:s.orderCount,
  shippingVnd:known(s.orderCount) ? s.orderCount * fee : null,
  salesLessShippingVnd:known(s.salesVnd) && known(s.orderCount) ? s.salesVnd-s.orderCount*fee : null,
  actualShippingVnd:s.shippingActualVnd, basis:'ASSUMPTION_PER_ORDER_NOT_ACTUAL'}));
}
export function estimateCommission(data, revenue, mode) {
 if (!known(revenue) || revenue < data.commission.minimumKnownRevenueVnd) return null;
 if (mode === 'whole') {
  const band=data.commission.bands.find(b => b.upperInclusiveVnd === null || revenue <= b.upperInclusiveVnd);
  return revenue*band.rate;
 }
 if (mode === 'marginal') {
  let result=0, prior=0;
  for (const b of data.commission.bands) {
   const top=b.upperInclusiveVnd ?? revenue;
   result += Math.max(0,Math.min(revenue,top)-prior)*b.rate;
   prior=top; if (revenue <= top) break;
  }
  return result;
 }
 return null;
}
export function inventorySummary(data) {
 return {plannedReceipts:sum(data.receipts.map(r => r.boxes)), receivedBoxes:sum(data.receipts.filter(r => r.status === 'received').map(r => r.boxes)),
  futureReceipts:sum(data.receipts.filter(r => r.status === 'planned').map(r => r.boxes)),
  committedBoxes:summarize(data).boxes, physicalOnHandBoxes:data.inventory.physicalOnHandBoxes,
  availableToPromiseBoxes:data.inventory.availableToPromiseBoxes, skuStock:data.inventory.skuStock};
}
export function forecastSummary(data) {
 const f=data.forecast, actual=summarize(data);
 return {status:f.status, futureBoxes:f.futureBoxes, futureSalesVnd:f.futureSalesVnd,
  projectedBoxes:known(f.futureBoxes) ? actual.boxes+f.futureBoxes : null,
  projectedSalesVnd:known(f.futureSalesVnd) ? actual.salesVnd+f.futureSalesVnd : null,
  asOf:f.asOf, evidence:f.evidence};
}
export function simulateOrders(data, assumptions) {
 const {type, boxesPerOrder, orders, shippingPerOrder} = assumptions;
 const price=priceForOrder(data,type,boxesPerOrder);
 if (!known(price) || !Number.isInteger(orders) || orders <= 0 || !known(shippingPerOrder) || shippingPerOrder < 0) return null;
 const boxes=boxesPerOrder*orders, salesVnd=boxes*price, shippingVnd=orders*shippingPerOrder;
 const actual=summarize(data);
 return {price,boxes,orders,salesVnd,shippingVnd,salesLessShippingVnd:salesVnd-shippingVnd,
  projectedBoxes:actual.boxes+boxes,projectedSalesVnd:actual.salesVnd+salesVnd,
  exceedsTarget:actual.boxes+boxes>data.project.targetBoxes, profitVnd:null,basis:'SIMULATION_NOT_ACTUAL_OR_APPROVED_FORECAST'};
}
export function actualCSV(data, filters = {}) {
 const rows=selectOrders(data,filters).rows;
 const fields=['id','verification','type','offer','boxes','salesVnd','channel','skuId','orderedDate','shippingActualVnd','deliveredBoxes','cashReceivedVnd'];
 const quote = v => {let s=v===null||v===undefined?'':String(v);if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
 return '\uFEFF'+[fields,...rows.map(o => fields.map(f => o[f]))].map(r => r.map(quote).join(',')).join('\r\n');
}
