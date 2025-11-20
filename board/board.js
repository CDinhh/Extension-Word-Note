/* ====== State & constants (local storage) ====== */
const KEY = 'vocab_items';
let filterTerm = "";
let filterCat = "all";
let sortMode = "time_desc";

/* ====== storage helpers ====== */
async function getItems() {
  const r = await chrome.storage.local.get({ [KEY]: [] });
  return r[KEY];
}
async function setItems(items) {
  await chrome.storage.local.set({ [KEY]: items });
}

/* ===== Theme toggle ===== */
(function () {
  function apply(mode) {
    document.body.classList.remove('theme-dark', 'theme-light');
    if (mode === 'dark') document.body.classList.add('theme-dark');
    else if (mode === 'light') document.body.classList.add('theme-light');
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = mode === 'dark' ? '☀️' : '🌙';
  }

  function init() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const saved = localStorage.getItem('wn-theme');
    if (saved === 'dark' || saved === 'light') apply(saved);
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      apply(prefersDark ? 'dark' : 'light');
    }
    btn.addEventListener('click', () => {
      const isDark = document.body.classList.contains('theme-dark');
      const next = isDark ? 'light' : 'dark';
      localStorage.setItem('wn-theme', next);
      apply(next);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ===== Preferences ===== */
async function getPrefs() {
  const r = await chrome.storage.local.get({ prefs: { filterCat, sortMode } });
  return r.prefs || { filterCat, sortMode };
}
async function setPrefs(p) {
  await chrome.storage.local.set({ prefs: p });
}

/* ===== Open Quiz (fixed single handler) ===== */
(() => {
  if (window.__quizBound) return; // tránh gắn nhiều lần
  window.__quizBound = true;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#open-quiz');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const extUrl =
      (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
        ? chrome.runtime.getURL('Quiz/quiz.html')
        : '../Quiz/quiz.html';

    if (typeof chrome !== 'undefined' && chrome.tabs?.create)
      chrome.tabs.create({ url: extUrl });
    else window.open(extUrl, '_blank', 'noopener');
  }, true);
})();

/* ===== Open Full Page ===== */
(() => {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#open-full');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const url =
      (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
        ? chrome.runtime.getURL('manage_page/ManagePage.html')
        : '../manage_page/ManagePage.html';
    if (typeof chrome !== 'undefined' && chrome.tabs?.create)
      chrome.tabs.create({ url });
    else window.open(url, '_blank', 'noopener');
  }, true);
})();

/* ===== Utilities ===== */
function sourceHtml(it) {
  if (!it.url || it.url === 'manual')
    return `<span title="Thêm thủ công">manual</span>`;
  const url = String(it.url).replace(/"/g, '&quot;');
  return `<a href="${url}" target="_blank" rel="noopener">source</a>`;
}
function formatTime(t) {
  const d = new Date(t);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}
function applyCatColor(el, cat) {
  const classes = ['cat--noun', 'cat--verb', 'cat--adj', 'cat--adv', 'cat--phrase', 'cat--other'];
  el.classList.remove(...classes);
  el.classList.add(`cat--${cat || 'other'}`);
}

/* ===== Category helpers ===== */
const CATS = [
  { v: 'noun', label: 'Noun' },
  { v: 'verb', label: 'Verb' },
  { v: 'adj', label: 'Adj' },
  { v: 'adv', label: 'Adv' },
  { v: 'phrase', label: 'Phrase' },
  { v: 'other', label: 'Other' }
];
function catOptions(selected) {
  return CATS.map(o => `<option value="${o.v}" ${selected === o.v ? 'selected' : ''}>${o.label}</option>`).join('');
}

/* ===== Download / Import helpers ===== */
function toPrettyJSON(obj) { return JSON.stringify(obj, null, 2); }
function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function normalizeItem(it) {
  if (!it || typeof it !== 'object') return null;
  const text = (it.text ?? '').toString().trim();
  if (!text) return null;
  const vi = (it.vi ?? '').toString().trim();
  const cat = (it.cat ?? 'other');
  const url = (it.url ?? 'manual');
  const time = Number(it.time) || Date.now();
  return { text, vi, cat, url, time };
}
function mergeUnique(oldArr, newArr) {
  const key = (it) => (it.text || '').toLowerCase().trim() + '|' + (it.vi || '').toLowerCase().trim();
  const map = new Map(oldArr.map(it => [key(it), it]));
  let added = 0, replaced = 0;
  for (const raw of newArr) {
    const it = normalizeItem(raw);
    if (!it) continue;
    const k = key(it);
    if (!map.has(k)) { map.set(k, it); added++; }
    else {
      const cur = map.get(k);
      cur.time = Math.max(Number(cur.time) || 0, Number(it.time) || 0);
      if (it.cat && it.cat !== 'other') cur.cat = it.cat;
      if (it.url && it.url !== 'manual') cur.url = it.url;
      replaced++;
    }
  }
  return { list: Array.from(map.values()).sort((a, b) => (b.time || 0) - (a.time || 0)), added, replaced };
}

/* ====== Render list ====== */
async function render() {
  const ul = document.getElementById('list');
  ul.innerHTML = '';
  const items = await getItems();
  const q = (filterTerm || '').trim().toLowerCase();

  let data = q
    ? items.filter(it =>
      (it.text || '').toLowerCase().includes(q) ||
      (it.vi || '').toLowerCase().includes(q))
    : [...items];

  if (filterCat !== 'all') data = data.filter(it => (it.cat || 'other') === filterCat);

  data.sort((a, b) => {
    switch (sortMode) {
      case 'text_asc': return (a.text || '').localeCompare(b.text || '', undefined, { sensitivity: 'base' });
      case 'text_desc': return (b.text || '').localeCompare(a.text || '', undefined, { sensitivity: 'base' });
      case 'time_asc': return (a.time || 0) - (b.time || 0);
      default: return (b.time || 0) - (a.time || 0);
    }
  });

  if (!data.length) {
    ul.innerHTML = '<li class="item"><div class="meta-row"><i>Không có mục nào phù hợp</i></div></li>';
    return;
  }

  data.forEach(it => {
    const idx = items.indexOf(it);
    const li = document.createElement('li');
    li.className = 'item';
    li.dataset.index = String(idx);
    const cat = it.cat || 'other';

    li.innerHTML = `
      <input type="text" class="word-input" value="${(it.text || '').replace(/"/g, '&quot;')}" title="Sửa từ vựng">
      <select class="cat-select" title="Phân loại">${catOptions(cat)}</select>
      <input type="text" class="vi-input" placeholder="Chú thích"
             value="${it.vi ? it.vi.replace(/"/g, '&quot;') : ''}">
      <button class="remove-one" title="Xoá mục này">❌</button>
      <div class="meta-row"><div class="meta">${sourceHtml(it)} • ${formatTime(it.time)}</div></div>`;
    ul.appendChild(li);

    const sel = li.querySelector('.cat-select');
    applyCatColor(sel, cat);
  });
}

/* ====== Event bindings ====== */
document.addEventListener('DOMContentLoaded', async () => {
  const ul = document.getElementById('list');
  const search = document.getElementById('search');
  const selCat = document.getElementById('filter-cat');
  const selSort = document.getElementById('sort-mode');

  const prefs = await getPrefs();
  filterCat = prefs.filterCat || filterCat;
  sortMode = prefs.sortMode || sortMode;
  selCat.value = filterCat;
  selSort.value = sortMode;

  let t;
  search.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { filterTerm = search.value || ""; render(); }, 120);
  });

  selCat.addEventListener('change', async () => {
    filterCat = selCat.value;
    await setPrefs({ filterCat, sortMode });
    render();
  });

  selSort.addEventListener('change', async () => {
    sortMode = selSort.value;
    await setPrefs({ filterCat, sortMode });
    render();
  });

  ul.addEventListener('change', async e => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLSelectElement)) return;
    const li = el.closest('li.item'); if (!li) return;
    const idx = Number(li.dataset.index);
    const items = await getItems();

    if (el.classList.contains('word-input')) items[idx].text = el.value.trim();
    else if (el.classList.contains('vi-input')) items[idx].vi = el.value.trim();
    else if (el.classList.contains('cat-select')) {
      items[idx].cat = el.value; applyCatColor(el, el.value);
    }
    await setItems(items);
  });

  ul.addEventListener('keydown', async e => {
    if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return;
    const li = e.target.closest('li.item'); if (!li) return;
    const idx = Number(li.dataset.index); const items = await getItems();
    if (e.target.classList.contains('word-input')) items[idx].text = e.target.value.trim();
    else if (e.target.classList.contains('vi-input')) items[idx].vi = e.target.value.trim();
    await setItems(items); e.target.blur();
  });

  ul.addEventListener('click', async e => {
    if (!(e.target instanceof HTMLElement) || !e.target.classList.contains('remove-one')) return;
    const li = e.target.closest('li.item'); if (!li) return;
    const idx = Number(li.dataset.index); const items = await getItems();
    items.splice(idx, 1); await setItems(items); render();
  });

  document.getElementById('clear').addEventListener('click', async () => {
    if (!confirm('Xoá toàn bộ danh sách?')) return;
    await setItems([]); render();
  });

  document.getElementById('add').addEventListener('click', async () => {
    const word = prompt("Nhập từ vựng muốn thêm:"); if (!word) return;
    const vi = prompt("Nhập chú thích (nếu có):") || "";
    const items = await getItems();
    items.unshift({ text: word.trim(), vi: vi.trim(), cat: 'other', url: 'manual', time: Date.now() });
    await setItems(items); render();
  });

  document.getElementById('export').addEventListener('click', async () => {
    const items = await getItems();
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const fname = `word-note-${stamp}.json`;
    download(fname, toPrettyJSON(items));
  });

  const btnImport = document.getElementById('import');
  const inputFile = document.getElementById('import-file');
  btnImport.addEventListener('click', () => inputFile.click());

  inputFile.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('File JSON không đúng định dạng');

      const current = await getItems();
      const doReplace = confirm(
        "Import JSON\n\nOK = Replace (ghi đè toàn bộ)\nCancel = Merge & Update (gộp và cập nhật)\n\nLưu ý: Cancel không ghi đè từ 'manual' hay 'other'"
      );

      let resultList = [], added = 0, replaced = 0;
      if (doReplace) {
        resultList = data.map(normalizeItem).filter(Boolean)
          .sort((a, b) => (b.time || 0) - (a.time || 0));
        added = resultList.length;
      } else {
        const { list, added: a, replaced: r } = mergeUnique(current, data);
        resultList = list; added = a; replaced = r;
      }
      await setItems(resultList);
      render();

      alert(doReplace
        ? `Đã replace ${added} mục.`
        : `Đã merge: +${added} mới, cập nhật ${replaced}.`);
    } catch (err) {
      console.error(err);
      alert("Import thất bại: " + (err?.message || err));
    } finally {
      e.target.value = '';
    }
  });

  render();
});
