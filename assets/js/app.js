import { initDB, getAll } from './db.js';
import { logout, requireAuth } from './auth.js';
import { byId, money } from './utils.js';
import { ProductModule } from './products.js';
import { BillingModule } from './billing.js';
import { ReportsModule } from './reports.js';
import { InventoryModule } from './inventory.js';
import { CustomerModule } from './customers.js';
import { SettingsModule } from './settings.js';

const sectionNav = () => {
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
    byId(btn.dataset.section).classList.add('active');
  }));
};

const dashboard = async (settings) => {
  const [sales, products, customers] = await Promise.all([getAll('sales'), getAll('products'), getAll('customers')]);
  const revenue = sales.reduce((a, s) => a + s.total, 0);
  const cards = [
    ['Today Invoices', sales.filter((x) => new Date(x.timestamp).toDateString() === new Date().toDateString()).length],
    ['Products', products.length],
    ['Customers', customers.length],
    ['Revenue', money(revenue, settings.currency)]
  ];
  byId('dashboardCards').innerHTML = cards.map((c) => `<div class='card'><h3>${c[0]}</h3><div>${c[1]}</div></div>`).join('');

  const low = products.filter((p) => p.stockQty <= (p.lowStockLevel || 5));
  byId('lowStockBox').innerHTML = `<h4>Low Stock Alerts</h4>${low.length ? low.map((p) => `<div class='alert warn'>${p.name} has ${p.stockQty} units left.</div>`).join('') : '<div class="alert success">No low-stock items.</div>'}`;
};

const init = async () => {
  const session = requireAuth();
  byId('userBadge').textContent = `${session.name} (${session.role})`;
  byId('logoutBtn').onclick = logout;
  byId('appModal').onclick = (e) => { if (e.target.id === 'appModal') e.currentTarget.classList.remove('open'); };

  await initDB();
  const settings = await SettingsModule.bind();

  if (session.role !== 'admin') {
    document.querySelector('[data-section="settingsSection"]').style.display = 'none';
    document.querySelector('[data-section="productsSection"]').style.display = 'none';
  }

  await ProductModule.bind(settings);
  BillingModule.bind(settings);
  ReportsModule.bind(settings);
  InventoryModule.bind();
  CustomerModule.bind();
  await dashboard(settings);
  sectionNav();
};

init();
