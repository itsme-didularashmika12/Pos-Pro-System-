import { getAll } from './db.js';
import { byId, downloadFile, money } from './utils.js';

export const ReportsModule = (() => {
  let settings = { currency: 'LKR' };

  const dateInRange = (t, from, to) => (!from || t >= from) && (!to || t <= (to + 86400000 - 1));

  const run = async () => {
    const from = byId('reportFrom').value ? new Date(byId('reportFrom').value).getTime() : 0;
    const to = byId('reportTo').value ? new Date(byId('reportTo').value).getTime() : 0;
    const sales = (await getAll('sales')).filter((s) => dateInRange(s.timestamp, from, to));

    const revenue = sales.reduce((a, s) => a + s.total, 0);
    const profit = sales.reduce((a, s) => a + s.items.reduce((x, i) => x + ((i.price - i.cost) * i.qty), 0), 0);
    const daily = sales.filter((s) => new Date(s.timestamp).toDateString() === new Date().toDateString()).length;
    const month = sales.filter((s) => new Date(s.timestamp).getMonth() === new Date().getMonth()).length;
    byId('reportCards').innerHTML = [
      ['Revenue', money(revenue, settings.currency)],
      ['Profit', money(profit, settings.currency)],
      ['Daily Sales', daily],
      ['Monthly Sales', month]
    ].map((d) => `<div class='card'><h4>${d[0]}</h4><div>${d[1]}</div></div>`).join('');

    const byProd = {};
    sales.forEach((s) => s.items.forEach((i) => byProd[i.name] = (byProd[i.name] || 0) + i.qty));
    const top = Object.entries(byProd).sort((a, b) => b[1] - a[1]).slice(0, 8);
    byId('topProducts').innerHTML = top.map((x) => `<div>${x[0]} <strong>${x[1]}</strong></div>`).join('') || '<span class="small">No data</span>';

    drawChart(sales);

    return sales;
  };

  const drawChart = (sales) => {
    const c = byId('salesChart');
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const buckets = {};
    sales.forEach((s) => {
      const k = new Date(s.timestamp).toISOString().slice(0, 10);
      buckets[k] = (buckets[k] || 0) + s.total;
    });
    const keys = Object.keys(buckets).sort().slice(-14);
    const vals = keys.map((k) => buckets[k]);
    const max = Math.max(...vals, 1);
    ctx.fillStyle = '#163a70';
    keys.forEach((k, i) => {
      const x = 40 + i * ((c.width - 60) / Math.max(keys.length, 1));
      const h = (vals[i] / max) * 180;
      ctx.fillRect(x, c.height - h - 30, 24, h);
      ctx.fillStyle = '#445';
      ctx.fillText(k.slice(5), x - 4, c.height - 10);
      ctx.fillStyle = '#163a70';
    });
  };

  const bind = (cfg) => {
    settings = cfg;
    byId('runReports').onclick = run;
    byId('exportCsv').onclick = async () => {
      const sales = await run();
      const rows = ['invoice,date,total,method'];
      sales.forEach((s) => rows.push(`${s.invoiceNo},${new Date(s.timestamp).toISOString()},${s.total},${s.method}`));
      downloadFile(`sales-report-${Date.now()}.csv`, rows.join('\n'), 'text/csv');
    };
    run();
  };

  return { bind, run };
})();
