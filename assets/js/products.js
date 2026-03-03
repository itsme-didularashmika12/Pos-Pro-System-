import { add, getAll, put, remove } from './db.js';
import { byId, downloadFile, parseFileJSON, money } from './utils.js';

export const ProductModule = (() => {
  let settings = { currency: 'LKR' };

  const renderTable = async () => {
    const search = byId('productSearch').value.toLowerCase();
    const category = byId('categoryFilter').value;
    const products = await getAll('products');
    const filtered = products.filter((p) => {
      const matchSearch = `${p.name} ${p.imei || ''} ${p.barcode || ''}`.toLowerCase().includes(search);
      const matchCat = !category || p.category === category;
      return matchSearch && matchCat;
    });
    byId('productsTable').innerHTML = `
      <thead><tr><th>Name</th><th>IMEI</th><th>Category</th><th>Stock</th><th>Selling</th><th>Actions</th></tr></thead>
      <tbody>${filtered.map((p) => `<tr>
        <td>${p.name}<div class='small'>${p.brand} ${p.model}</div></td>
        <td>${p.imei || '-'}</td>
        <td>${p.category}</td>
        <td>${p.stockQty} ${p.stockQty <= (p.lowStockLevel || 5) ? '⚠️' : ''}</td>
        <td>${money(p.sellingPrice, settings.currency)}</td>
        <td>
          <button data-edit='${p.id}' class='btn-muted'>Edit</button>
          <button data-del='${p.id}' class='btn-danger'>Delete</button>
        </td>
      </tr>`).join('')}</tbody>`;

    const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
    byId('categoryFilter').innerHTML = `<option value=''>All categories</option>${categories.map((c) => `<option ${c === category ? 'selected' : ''}>${c}</option>`).join('')}`;

    byId('productsTable').querySelectorAll('[data-edit]').forEach((btn) => btn.onclick = () => openModal(Number(btn.dataset.edit)));
    byId('productsTable').querySelectorAll('[data-del]').forEach((btn) => btn.onclick = async () => {
      if (confirm('Delete this product?')) {
        await remove('products', Number(btn.dataset.del));
        renderTable();
      }
    });
  };

  const openModal = async (id = null) => {
    const modal = byId('appModal');
    const body = byId('modalBody');
    const item = id ? (await getAll('products')).find((p) => p.id === id) : {};
    body.innerHTML = `<h3>${id ? 'Edit' : 'Add'} Product</h3>
      <form id='productForm' class='form-grid'>
        <label>Name <input name='name' required value='${item?.name || ''}'></label>
        <label>Brand <input name='brand' value='${item?.brand || ''}'></label>
        <label>Model <input name='model' value='${item?.model || ''}'></label>
        <label>IMEI <input name='imei' value='${item?.imei || ''}'></label>
        <label>Barcode <input name='barcode' value='${item?.barcode || ''}'></label>
        <label>Category <input name='category' value='${item?.category || ''}'></label>
        <label>Purchase Price <input name='purchasePrice' type='number' required value='${item?.purchasePrice || 0}'></label>
        <label>Selling Price <input name='sellingPrice' type='number' required value='${item?.sellingPrice || 0}'></label>
        <label>Stock Qty <input name='stockQty' type='number' required value='${item?.stockQty || 0}'></label>
        <label>Warranty <input name='warranty' value='${item?.warranty || ''}'></label>
        <label>Supplier <input name='supplier' value='${item?.supplier || ''}'></label>
        <label>Serial Numbers (comma separated) <textarea name='serials'>${(item?.serials || []).join(',')}</textarea></label>
        <label>Product Image <input name='image' type='file' accept='image/*'></label>
        <button class='btn-primary'>Save Product</button>
      </form>`;
    modal.classList.add('open');

    byId('productForm').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const payload = {
        ...(item || {}),
        name: fd.get('name'), brand: fd.get('brand'), model: fd.get('model'), imei: fd.get('imei'), barcode: fd.get('barcode'),
        category: fd.get('category'), purchasePrice: Number(fd.get('purchasePrice')), sellingPrice: Number(fd.get('sellingPrice')),
        stockQty: Number(fd.get('stockQty')), warranty: fd.get('warranty'), supplier: fd.get('supplier'),
        serials: String(fd.get('serials') || '').split(',').map((s) => s.trim()).filter(Boolean), lowStockLevel: 5,
        image: item?.image || ''
      };
      const image = fd.get('image');
      if (image?.size) payload.image = await fileToBase64(image);
      if (id) await put('products', payload); else await add('products', payload);
      modal.classList.remove('open');
      renderTable();
    };
  };

  const fileToBase64 = (file) => new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(file);
  });

  const bind = async (cfg) => {
    settings = cfg;
    byId('openProductModal').onclick = () => openModal();
    byId('productSearch').oninput = renderTable;
    byId('categoryFilter').onchange = renderTable;
    byId('exportProducts').onclick = async () => {
      downloadFile(`products-backup-${Date.now()}.json`, JSON.stringify(await getAll('products'), null, 2));
    };
    byId('importProducts').onchange = async (e) => {
      const list = await parseFileJSON(e.target.files[0]);
      for (const p of list) delete p.id;
      for (const p of list) await add('products', p);
      renderTable();
    };
    await renderTable();
  };

  return { bind, renderTable, getProducts: () => getAll('products') };
})();
