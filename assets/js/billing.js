import { add, getAll, put } from './db.js';
import { byId, money, toDateTime, uid } from './utils.js';

export const BillingModule = (() => {
  let cart = [];
  let settings = { taxPercent: 8, currency: 'LKR', shopName: '', address: '', phone: '', logo: '' };

  const findProduct = async (q) => {
    const products = await getAll('products');
    return products.find((p) => [p.barcode, p.imei, p.name].some((v) => String(v).toLowerCase() === q.toLowerCase()))
      || products.find((p) => p.name.toLowerCase().includes(q.toLowerCase()) || String(p.imei).includes(q));
  };

  const addToCart = async () => {
    const q = byId('billSearch').value.trim();
    if (!q) return;
    const product = await findProduct(q);
    if (!product) return alert('Product not found');
    if (product.stockQty < 1) return alert('Out of stock');
    const existing = cart.find((c) => c.id === product.id);
    if (existing) existing.qty += 1;
    else cart.push({ id: product.id, name: product.name, imei: product.imei, price: product.sellingPrice, cost: product.purchasePrice, qty: 1 });
    byId('billSearch').value = '';
    renderCart();
  };

  const totals = () => {
    const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
    const discountP = Number(byId('discountPercent').value || 0);
    const discountF = Number(byId('discountFixed').value || 0);
    const afterDiscount = subtotal - (subtotal * discountP / 100) - discountF;
    const tax = Math.max(0, afterDiscount * (Number(settings.taxPercent || 0) / 100));
    return { subtotal, tax, total: Math.max(0, afterDiscount + tax) };
  };

  const renderCart = () => {
    byId('cartList').innerHTML = cart.length ? cart.map((c, idx) => `<div class='cart-item'>
      <div>${c.name}<div class='small'>IMEI: ${c.imei || '-'}</div></div>
      <div>
        <input data-qty='${idx}' type='number' min='1' value='${c.qty}' style='width:64px'>
        ${money(c.qty * c.price, settings.currency)}
        <button data-rm='${idx}' class='btn-danger'>x</button>
      </div>
    </div>`).join('') : '<p class="small">No items in cart.</p>';

    const { subtotal, tax, total } = totals();
    byId('subTotal').textContent = money(subtotal, settings.currency);
    byId('taxAmount').textContent = money(tax, settings.currency);
    byId('grandTotal').textContent = money(total, settings.currency);
    const paid = Number(byId('paidAmount').value || 0);
    byId('changeAmount').textContent = money(paid - total, settings.currency);

    byId('cartList').querySelectorAll('[data-qty]').forEach((el) => el.onchange = (e) => {
      cart[Number(e.target.dataset.qty)].qty = Math.max(1, Number(e.target.value));
      renderCart();
    });
    byId('cartList').querySelectorAll('[data-rm]').forEach((el) => el.onclick = () => {
      cart.splice(Number(el.dataset.rm), 1);
      renderCart();
    });
  };

  const newBill = () => {
    cart = [];
    ['discountPercent', 'discountFixed', 'paidAmount'].forEach((id) => byId(id).value = 0);
    renderCart();
  };

  const completeSale = async () => {
    if (!cart.length) return alert('Cart is empty');
    const { subtotal, tax, total } = totals();
    const paid = Number(byId('paidAmount').value || 0);
    if (paid < total) return alert('Insufficient payment');
    const invoiceNo = uid('INV');
    const timestamp = Date.now();
    const sale = {
      invoiceNo, timestamp,
      method: byId('paymentMethod').value,
      customerPhone: '', subtotal, tax, total,
      discountPercent: Number(byId('discountPercent').value || 0),
      discountFixed: Number(byId('discountFixed').value || 0),
      paid, change: paid - total,
      items: cart
    };
    await add('sales', sale);

    const products = await getAll('products');
    for (const item of cart) {
      const p = products.find((x) => x.id === item.id);
      if (!p) continue;
      p.stockQty = Math.max(0, p.stockQty - item.qty);
      await put('products', p);
    }

    printReceipt(sale);
    newBill();
    alert(`Sale saved: ${invoiceNo}`);
  };

  const printReceipt = (sale) => {
    byId('receiptPrint').innerHTML = `
      <div style='padding:6px;font-family:monospace'>
        <div style='text-align:center'>${settings.logo ? `<img src='${settings.logo}' style='max-width:60mm;max-height:20mm'>` : ''}
          <h3 style='margin:4px 0'>${settings.shopName}</h3>
          <div>${settings.address}</div><div>${settings.phone}</div>
        </div>
        <hr><div>Invoice: ${sale.invoiceNo}<br>Date: ${toDateTime(sale.timestamp)}</div><hr>
        ${sale.items.map((i) => `<div>${i.name} x${i.qty}<br>IMEI: ${i.imei || '-'}<span style='float:right'>${money(i.qty * i.price, settings.currency)}</span></div>`).join('<br>')}
        <hr>
        <div>Total: <b>${money(sale.total, settings.currency)}</b></div>
        <div>Tax: ${money(sale.tax, settings.currency)}</div>
        <div>Warranty as per invoice date.</div>
        <div style='text-align:center;margin-top:8px'>Thank you! Visit Again.</div>
      </div>`;
    window.print();
  };

  const bind = (cfg) => {
    settings = cfg;
    byId('addToCartBtn').onclick = addToCart;
    byId('checkoutBtn').onclick = completeSale;
    byId('paidAmount').oninput = renderCart;
    byId('discountPercent').oninput = renderCart;
    byId('discountFixed').oninput = renderCart;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F2') { e.preventDefault(); newBill(); }
      if (e.key === 'F4') { e.preventDefault(); completeSale(); }
      if (e.key === 'Enter' && document.activeElement === byId('billSearch')) addToCart();
    });
    newBill();
  };

  return { bind, newBill, renderCart };
})();
