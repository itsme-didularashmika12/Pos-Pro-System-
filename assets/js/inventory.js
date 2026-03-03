import { add, getAll, put } from './db.js';
import { byId } from './utils.js';

export const InventoryModule = (() => {
  const promptStock = async (type) => {
    const products = await getAll('products');
    const name = prompt(`${type}: enter exact product name`);
    if (!name) return;
    const product = products.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (!product) return alert('Product not found');
    const qty = Number(prompt('Quantity') || 0);
    if (qty <= 0) return;
    product.stockQty = type === 'Stock In' ? product.stockQty + qty : Math.max(0, product.stockQty - qty);
    await put('products', product);
    await add('purchases', { productId: product.id, productName: product.name, qty, type, timestamp: Date.now(), supplier: product.supplier || '' });
    render();
  };

  const addSupplier = async () => {
    const name = prompt('Supplier Name');
    const phone = prompt('Supplier Phone');
    if (!name) return;
    await add('suppliers', { name, phone, createdAt: Date.now() });
    render();
  };

  const render = async () => {
    const [products, purchases, suppliers] = await Promise.all([getAll('products'), getAll('purchases'), getAll('suppliers')]);
    const low = products.filter((p) => p.stockQty <= (p.lowStockLevel || 5)).length;
    byId('inventoryCards').innerHTML = [
      ['Products', products.length],
      ['Low Stock Items', low],
      ['Suppliers', suppliers.length],
      ['Purchase Entries', purchases.length]
    ].map((x) => `<div class='card'><h4>${x[0]}</h4><div>${x[1]}</div></div>`).join('');

    byId('purchaseTable').innerHTML = `<thead><tr><th>Date</th><th>Product</th><th>Type</th><th>Qty</th><th>Supplier</th></tr></thead>
      <tbody>${purchases.slice().reverse().map((p) => `<tr><td>${new Date(p.timestamp).toLocaleString()}</td><td>${p.productName}</td><td>${p.type}</td><td>${p.qty}</td><td>${p.supplier || '-'}</td></tr>`).join('')}</tbody>`;
  };

  const bind = () => {
    byId('stockInBtn').onclick = () => promptStock('Stock In');
    byId('stockOutBtn').onclick = () => promptStock('Stock Out');
    byId('supplierBtn').onclick = addSupplier;
    render();
  };

  return { bind, render };
})();
