export const money = (num, currency = 'LKR') => `${currency} ${Number(num || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
export const byId = (id) => document.getElementById(id);
export const downloadFile = (filename, content, type = 'application/json') => {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};
export const parseFileJSON = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    try { resolve(JSON.parse(reader.result)); } catch (e) { reject(e); }
  };
  reader.onerror = reject;
  reader.readAsText(file);
});
export const uid = (prefix='INV') => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random()*999).toString().padStart(3, '0')}`;
export const toDateTime = (ts = Date.now()) => new Date(ts).toLocaleString();
