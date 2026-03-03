import { exportDB, getAll, put, restoreDB } from './db.js';
import { byId, downloadFile, parseFileJSON } from './utils.js';

export const SettingsModule = (() => {
  let current;

  const load = async () => {
    current = (await getAll('settings'))[0];
    byId('setShopName').value = current.shopName || '';
    byId('setAddress').value = current.address || '';
    byId('setPhone').value = current.phone || '';
    byId('setTax').value = current.taxPercent || 0;
    byId('setCurrency').value = current.currency || 'LKR';
    byId('setDarkMode').checked = !!current.darkMode;
    document.body.classList.toggle('dark', !!current.darkMode);
    byId('shopTitle').textContent = current.shopName || 'Mobile Shop Offline POS Pro';
    return current;
  };

  const save = async () => {
    current.shopName = byId('setShopName').value;
    current.address = byId('setAddress').value;
    current.phone = byId('setPhone').value;
    current.taxPercent = Number(byId('setTax').value || 0);
    current.currency = byId('setCurrency').value;
    current.darkMode = byId('setDarkMode').checked;
    const logo = byId('setLogo').files[0];
    if (logo) current.logo = await fileToBase64(logo);
    await put('settings', current);
    await load();
    alert('Settings saved');
    return current;
  };

  const fileToBase64 = (file) => new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(file);
  });

  const bind = async () => {
    await load();
    byId('saveSettings').onclick = save;
    byId('backupBtn').onclick = async () => downloadFile(`full-backup-${Date.now()}.json`, JSON.stringify(await exportDB(), null, 2));
    byId('restoreInput').onchange = async (e) => {
      const payload = await parseFileJSON(e.target.files[0]);
      await restoreDB(payload);
      alert('Restore complete. Reloading...');
      location.reload();
    };
    return current;
  };

  return { bind, load, getCurrent: () => current };
})();
