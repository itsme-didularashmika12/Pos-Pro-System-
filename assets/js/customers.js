import { add, getAll, put } from './db.js';
import { byId } from './utils.js';

export const CustomerModule = (() => {
  const render = async () => {
    const q = byId('customerSearch').value.toLowerCase();
    const list = (await getAll('customers')).filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(q));
    byId('customersTable').innerHTML = `<thead><tr><th>Name</th><th>Phone</th><th>Loyalty</th><th>Credit</th><th>Warranty Tracking</th></tr></thead>
      <tbody>${list.map((c) => `<tr><td>${c.name}</td><td>${c.phone}</td><td>${c.loyaltyPoints || 0}</td><td>${c.creditBalance || 0}</td><td>${c.warrantyNotes || '-'}</td></tr>`).join('')}</tbody>`;
  };

  const addCustomer = async () => {
    const name = prompt('Customer Name');
    const phone = prompt('Phone Number');
    if (!name) return;
    await add('customers', { name, phone, loyaltyPoints: 0, creditBalance: 0, warrantyNotes: '' });
    render();
  };

  const linkSales = async () => {
    const [sales, customers] = await Promise.all([getAll('sales'), getAll('customers')]);
    if (!customers.length) return;
    const first = customers[0];
    const points = sales.reduce((a, s) => a + Math.floor(s.total / 1000), 0);
    first.loyaltyPoints = points;
    await put('customers', first);
  };

  const bind = () => {
    byId('addCustomerBtn').onclick = addCustomer;
    byId('customerSearch').oninput = render;
    linkSales().then(render);
  };

  return { bind, render };
})();
