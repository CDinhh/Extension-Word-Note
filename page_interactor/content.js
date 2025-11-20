// page_interactor/content.js
const KEY = 'vocab_items';

let bubble;
let lastText = "";
let interacting = false;

// lưu cả 2 hệ tọa độ: viewport (client) & absolute (page)
let lastMouse = { x: 0, y: 0, clientX: 0, clientY: 0 };

/* ===== storage ===== */
async function getItems() {
  const r = await chrome.storage.local.get({ [KEY]: [] });
  return Array.isArray(r[KEY]) ? r[KEY] : [];
}
async function setItems(items) {
  await chrome.storage.local.set({ [KEY]: items });
}

/* ===== loại từ ===== */
const CATS = [
  { v: 'noun', label: 'Noun' },
  { v: 'verb', label: 'Verb' },
  { v: 'adj', label: 'Adj' },
  { v: 'adv', label: 'Adv' },
  { v: 'phrase', label: 'Phrase' },
  { v: 'other', label: 'Other' }
];

// Quy tắc lọc selection (có thể chỉnh nhanh ở đây)
const SELECTION_RULE = {
  enabled: false,       // tắt lọc để đảm bảo hoạt động lại; bật true nếu muốn siết
  maxChars: 200,
  hardMaxChars: 400,    // vượt ngưỡng này chắc chắn bỏ qua
  maxWords: 20,
  hardMaxWords: 40,
  maxLineBreaks: 4,
};

function isValidSelection(text) {
  // Đơn giản hóa - chỉ kiểm tra cơ bản
  if (!text || text.trim().length === 0) {
    return false;
  }

  // Chỉ chặn những trường hợp cực đoan
  if (text.length > 1000) {
    return false;
  }

  return true;
}/* ---------- helpers ---------- */
function removeBubble() { bubble?.remove(); bubble = null; }

function showToast(msg, duration = 2500) {
  const old = document.getElementById('vocab-toast'); old?.remove();
  const node = document.createElement('div');
  node.id = 'vocab-toast'; node.textContent = msg;

  // Đặt tạm thời để tính kích thước
  node.style.visibility = 'hidden';
  node.style.top = '0px';
  node.style.left = '0px';
  document.documentElement.appendChild(node);

  // Tính vị trí dựa trên con trỏ chuột
  const rect = node.getBoundingClientRect();
  const offset = 15;

  let top = lastMouse.clientY + offset;
  let left = lastMouse.clientX + offset;

  const vw = window.innerWidth, vh = window.innerHeight;
  if (left + rect.width > vw - 8) left = lastMouse.clientX - rect.width - offset;
  if (top + rect.height > vh - 8) top = lastMouse.clientY - rect.height - offset;

  left = Math.max(8, Math.min(left, vw - rect.width - 8));
  top = Math.max(8, Math.min(top, vh - rect.height - 8));

  node.style.left = `${left}px`;
  node.style.top = `${top}px`;
  node.style.visibility = 'visible';

  // Thêm hiệu ứng animation
  setTimeout(() => node.classList.add('show'), 10);

  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 300);
  }, duration);
}

function getCatLabel(cat) {
  const map = { noun: 'Noun', verb: 'Verb', adj: 'Adj', adv: 'Adv', phrase: 'Phrase', other: 'Other' };
  return map[cat] || (cat || '');
}

// đã lưu hay chưa (bất kể có note/cat)
async function hasItem(text) {
  const items = await getItems();
  return items.some(i => i.text.toLowerCase() === text.toLowerCase());
}

// lưu từ
async function addVocab(text, vi = "", cat = "other") {
  text = (text || "").trim(); if (!text) return;
  const items = await getItems();
  const idx = items.findIndex(i => i.text.toLowerCase() === text.toLowerCase() && i.url === location.href);

  let msg = "";
  if (idx >= 0) {
    let changed = false;
    if (vi && vi.trim()) { items[idx].vi = vi.trim(); changed = true; }
    if (cat) { items[idx].cat = cat; changed = true; }
    if (changed) { await setItems(items); msg = "Đã cập nhật !"; }
    else msg = "Đã có trong danh sách !";
  } else {
    const entry = { text, url: location.href, time: Date.now(), cat: cat || 'other' };
    if (vi && vi.trim()) entry.vi = vi.trim();
    items.unshift(entry); await setItems(items);
    msg = vi && vi.trim() ? "Đã lưu + chú thích !" : "Đã lưu từ vựng !";
  }
  showToast(msg);
}

// tìm note/cat (ưu tiên cùng URL)
async function findNote(text) {
  const items = await getItems();
  return items.find(i => i.text.toLowerCase() === text.toLowerCase() && i.url === location.href && (i.vi || i.cat))
    || items.find(i => i.text.toLowerCase() === text.toLowerCase() && (i.vi || i.cat))
    || null;
}

// select cat
function createCatSelect(defaultCat = 'other') {
  const sel = document.createElement('select');
  sel.className = 'note-cat';
  for (const o of CATS) {
    const opt = document.createElement('option');
    opt.value = o.v; opt.textContent = o.label;
    if (o.v === (defaultCat || 'other')) opt.selected = true;
    sel.appendChild(opt);
  }
  return sel;
}

// editor trong bubble
function openNoteEditor(initialText) {
  if (!bubble) return;

  const exist = bubble.querySelector('.note-inline');
  if (exist) { exist.querySelector('.note-input')?.focus(); return; }

  const wrap = document.createElement('div');
  wrap.className = 'note-inline';

  const catSel = createCatSelect('other');

  const input = document.createElement('input');
  input.className = 'note-input';
  input.type = 'text';
  input.placeholder = 'Nhập chú thích (nếu có)…';

  const btnSave = document.createElement('button');
  btnSave.className = 'btn btn-save';
  btnSave.textContent = 'Lưu';

  wrap.append(catSel, input, btnSave);
  bubble.appendChild(wrap);

  input.focus();

  const doSave = async () => {
    const vi = input.value.trim();
    const cat = catSel.value || 'other';
    const t = window.getSelection().toString().trim() || initialText;
    if (t) await addVocab(t, vi, cat);
    removeBubble();
  };

  btnSave.addEventListener('click', e => { e.stopPropagation(); doSave(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.stopPropagation(); doSave(); }
    else if (e.key === 'Escape') { e.stopPropagation(); removeBubble(); }
  });

  // mark interacting
  [input, catSel].forEach(el => {
    el.addEventListener('focus', () => { interacting = true; });
    el.addEventListener('blur', () => { interacting = false; });
  });
}

/* ===== selection helpers (viewport-based) ===== */
function getSelectionPoint() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect && (rect.width || rect.height)) return { x: rect.left, y: rect.bottom };
  }
  return { x: lastMouse.clientX || 0, y: lastMouse.clientY || 0 };
}

/* ---------- main ---------- */
async function showBubbleAtSelection() {
  if (bubble && bubble.contains(document.activeElement)) return;
  if (interacting) return;

  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) {
    if (!(bubble && bubble.querySelector('.note-inline'))) removeBubble();
    return;
  }

  const text = sel.toString().trim();
  if (!text) { removeBubble(); return; }
  if (!isValidSelection(text)) { removeBubble(); return; }
  if (bubble && lastText === text) return;
  lastText = text;

  // create bubble once
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'vocab-bubble';

    bubble.addEventListener('mousedown', (e) => {
      const target = e.target;
      if (target && target.closest('.note-inline')) { interacting = true; return; }
      interacting = true; e.preventDefault(); e.stopPropagation();
    }, { capture: true });

    bubble.addEventListener('mouseup', () => { interacting = false; }, { capture: true });

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('img/logo.png');
    img.title = "Save vocab";
    img.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    img.addEventListener('click', e => { e.stopPropagation(); openNoteEditor(lastText); });

    const save = document.createElement('span');
    save.className = 'save-label'; save.textContent = 'Save it';
    save.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    save.addEventListener('click', e => { e.stopPropagation(); openNoteEditor(lastText); });

    const noteBtn = document.createElement('span');
    noteBtn.className = 'note-btn'; noteBtn.textContent = 'Note';
    noteBtn.style.display = 'none';
    noteBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    noteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const t = window.getSelection().toString().trim() || lastText;
      const data = await findNote(t);
      if (data) {
        const catLabel = getCatLabel(data.cat);
        const parts = []; if (catLabel) parts.push(`(${catLabel})`); if (data.vi) parts.push(data.vi);
        showToast(parts.join(' ').trim() || 'No note');
      }
      removeBubble();
    });

    bubble.append(img, save, noteBtn);
    document.documentElement.appendChild(bubble);

    // click ngoài để đóng
    document.addEventListener('mousedown', (e) => {
      if (!bubble) return;
      const path = e.composedPath?.() || [];
      if (bubble.contains(e.target) || path.includes(bubble)) return;
      removeBubble();
    }, { capture: true });
  }

  // Toggle: đã biết -> chỉ Note; chưa biết -> chỉ Save
  try {
    const known = await hasItem(text);

    const noteBtn = bubble.querySelector('.note-btn');
    const saveLabel = bubble.querySelector('.save-label');
    const saveIcon = bubble.querySelector('img');

    if (known) {
      noteBtn.style.display = 'inline';
      saveLabel.style.display = 'none';
      saveIcon.style.display = 'none';
    } else {
      noteBtn.style.display = 'none';
      saveLabel.style.display = 'inline';
      saveIcon.style.display = 'inline';
    }
  } catch (error) {
    // Silent fail
  }

  /* --- ĐỊNH VỊ (overlay fixed theo viewport) --- */
  // bubble.style.visibility = 'hidden';
  // bubble.style.top = '0px';
  // bubble.style.left = '0px';
  // document.documentElement.appendChild(bubble);
  if (!document.body.contains(bubble)) document.body.appendChild(bubble);


  const br = bubble.getBoundingClientRect();
  const offset = 4;
  const anchor = getSelectionPoint(); // {x,y} theo viewport

  let top = anchor.y + offset;
  let left = anchor.x + offset;

  const vw = window.innerWidth, vh = window.innerHeight;
  if (left + br.width > vw - 8) left = anchor.x - br.width - offset;
  if (top + br.height > vh - 8) top = anchor.y - br.height - offset;

  left = Math.max(8, Math.min(left, vw - br.width - 8));
  top = Math.max(8, Math.min(top, vh - br.height - 8));

  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
  bubble.style.visibility = 'visible';
  bubble.style.display = 'inline-flex'; // đảm bảo display
  bubble.style.zIndex = '2147483647'; // đảm bảo z-index
}


/* ---------- events ---------- */
document.addEventListener('mouseup', (e) => {
  lastMouse = { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY, clientX: e.clientX, clientY: e.clientY };
  if (interacting) return;
  showBubbleAtSelection();
}, true); // capture để không bị site chặn

document.addEventListener('selectionchange', () => {
  if (interacting) return;
  setTimeout(showBubbleAtSelection, 40); // cho rect ổn định
}, true);

document.addEventListener('contextmenu', (e) => {
  lastMouse = { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY, clientX: e.clientX, clientY: e.clientY };
  setTimeout(showBubbleAtSelection, 0);
}, true);

document.addEventListener('keyup', () => {
  if (bubble && bubble.contains(document.activeElement)) return;
  if (interacting) return;
  showBubbleAtSelection();
});
