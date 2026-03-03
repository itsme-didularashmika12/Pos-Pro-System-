const DB_NAME = 'mobile-shop-pos-pro';
const DB_VERSION = 1;
const STORES = ['users', 'products', 'sales', 'customers', 'suppliers', 'purchases', 'settings'];

let dbRef;

export const initDB = () => new Promise((resolve, reject) => {
  if (dbRef) return resolve(dbRef);
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onerror = () => reject(req.error);
  req.onupgradeneeded = () => {
    const db = req.result;
    STORES.forEach((name) => {
      if (!db.objectStoreNames.contains(name)) {
        const store = db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
        if (name === 'users') store.createIndex('username', 'username', { unique: true });
        if (name === 'products') {
          store.createIndex('barcode', 'barcode', { unique: false });
          store.createIndex('imei', 'imei', { unique: false });
          store.createIndex('name', 'name', { unique: false });
        }
        if (name === 'sales') store.createIndex('invoiceNo', 'invoiceNo', { unique: true });
      }
    });
  };
  req.onsuccess = async () => {
    dbRef = req.result;
    await seedSampleData();
    resolve(dbRef);
  };
});

const txDone = (tx) => new Promise((res, rej) => {
  tx.oncomplete = () => res(true);
  tx.onerror = () => rej(tx.error);
  tx.onabort = () => rej(tx.error);
});

export const getAll = (store) => new Promise((resolve, reject) => {
  const tx = dbRef.transaction(store, 'readonly');
  const req = tx.objectStore(store).getAll();
  req.onsuccess = () => resolve(req.result || []);
  req.onerror = () => reject(req.error);
});

export const put = async (store, value) => {
  const tx = dbRef.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  await txDone(tx);
};

export const add = (store, value) => new Promise((resolve, reject) => {
  const tx = dbRef.transaction(store, 'readwrite');
  const req = tx.objectStore(store).add(value);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

export const remove = async (store, id) => {
  const tx = dbRef.transaction(store, 'readwrite');
  tx.objectStore(store).delete(id);
  await txDone(tx);
};

export const clearStore = async (store) => {
  const tx = dbRef.transaction(store, 'readwrite');
  tx.objectStore(store).clear();
  await txDone(tx);
};

export const exportDB = async () => {
  const out = {};
  for (const store of STORES) out[store] = await getAll(store);
  return out;
};

export const restoreDB = async (payload) => {
  for (const store of STORES) {
    await clearStore(store);
    const rows = payload[store] || [];
    for (const row of rows) await add(store, row);
  }
};

const seedSampleData = async () => {
  const users = await getAll('users');
  if (!users.length) {
    await add('users', { username: 'admin', passwordHash: btoa('admin123'), role: 'admin', name: 'System Admin' });
    await add('users', { username: 'cashier', passwordHash: btoa('cashier123'), role: 'cashier', name: 'Cashier 1' });
  }
  const settings = await getAll('settings');
  if (!settings.length) {
    await add('settings', {
      shopName: 'Mobile Shop Offline POS Pro', address: 'Main Street, Colombo', phone: '+94 77 000 0000',
      taxPercent: 8, currency: 'LKR', darkMode: false, logo: ''
    });
  }
  const products = await getAll('products');
  if (!products.length) {
    const sample = [
      ['Samsung Galaxy A55', 'Samsung', 'A55', '356001000001', '89011111', 'Mobile', 85000, 98000, 6],
      ['iPhone 13 128GB', 'Apple', '13', '356001000002', '89011112', 'Mobile', 200000, 230000, 4],
      ['Fast Charger 25W', 'Anker', 'C25', 'NA', '89011113', 'Charger', 3500, 6500, 30],
      ['Wireless Earbuds', 'Xiaomi', 'Buds 3', 'NA', '89011114', 'Earphones', 4500, 8900, 22]
    ];
    for (const p of sample) {
      await add('products', {
        name: p[0], brand: p[1], model: p[2], imei: p[3], barcode: p[4], category: p[5],
        purchasePrice: p[6], sellingPrice: p[7], stockQty: p[8], warranty: '12 months',
        supplier: 'Default Supplier', serials: [], image: '', lowStockLevel: 5
      });
    }
  }
  const customers = await getAll('customers');
  if (!customers.length) {
    await add('customers', { name: 'Walk-in Customer', phone: '0000000000', loyaltyPoints: 0, creditBalance: 0 });
  }
};
