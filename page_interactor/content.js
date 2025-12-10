// page_interactor/content.js
const KEY = 'vocab_items';

let bubble;
let lastText = "";
let interacting = false;
let lastMouse = { clientX: 0, clientY: 0 };

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

function isValidSelection(text) {
  return text && text.trim().length > 0 && text.length <= 1000;
}

/* ---------- helpers ---------- */
function removeBubble() {
  bubble?.remove();
  bubble = null;
}

function showToast(msg, duration = 2500) {
  const old = document.getElementById('vocab-toast');
  old?.remove();

  const node = document.createElement('div');
  node.id = 'vocab-toast';
  node.textContent = msg;
  document.documentElement.appendChild(node);

  console.log('Toast created:', msg, node);

  // Show at bottom-right corner
  setTimeout(() => {
    node.classList.add('show');
    console.log('Toast show class added');
  }, 10);
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 300);
  }, duration);
}

function getCatLabel(cat) {
  const map = { noun: 'Noun', verb: 'Verb', adj: 'Adj', adv: 'Adv', phrase: 'Phrase', other: 'Other' };
  return map[cat] || cat || '';
}

// đã lưu hay chưa (bất kể có note/cat)
async function hasItem(text) {
  const items = await getItems();
  return items.some(i => i.text.toLowerCase() === text.toLowerCase());
}

// lưu từ
async function addVocab(text, vi = "", cat = "other") {
  text = text?.trim().toLowerCase();
  if (!text) return;

  const items = await getItems();
  const idx = items.findIndex(i => i.text.toLowerCase() === text.toLowerCase() && i.url === location.href);

  if (idx >= 0) {
    let changed = false;
    if (vi?.trim()) { items[idx].vi = vi.trim(); changed = true; }
    if (cat) { items[idx].cat = cat; changed = true; }

    if (changed) {
      await setItems(items);
      showToast("Updated!");
    } else {
      showToast("Already in list!");
    }
  } else {
    const entry = { text, url: location.href, time: Date.now(), cat: cat || 'other' };
    if (vi?.trim()) entry.vi = vi.trim();
    items.unshift(entry);
    await setItems(items);
    showToast(vi?.trim() ? "Saved + note!" : "Saved!");
  }
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
function openNoteEditor(initialText, autoTranslatedText = '') {
  if (!bubble) return;

  const exist = bubble.querySelector('.note-inline');
  if (exist) {
    exist.querySelector('.note-input')?.focus();
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'note-inline';

  const catSel = createCatSelect('other');
  const input = document.createElement('input');
  input.className = 'note-input';
  input.type = 'text';
  input.placeholder = 'Enter note (optional)…';
  if (autoTranslatedText) {
    input.value = autoTranslatedText;
  }

  const btnSave = document.createElement('button');
  btnSave.className = 'btn btn-save';
  btnSave.textContent = 'Save';

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

  [input, catSel].forEach(el => {
    el.addEventListener('focus', () => interacting = true);
    el.addEventListener('blur', () => interacting = false);
  });
}

/* ===== selection helpers ===== */
function getSelectionPoint() {
  const sel = window.getSelection();
  if (sel?.rangeCount) {
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect?.width || rect?.height) return { x: rect.left, y: rect.bottom };
  }
  return { x: lastMouse.clientX || 0, y: lastMouse.clientY || 0 };
}

/* ---------- main ---------- */
async function showBubbleAtSelection() {
  if (bubble?.contains(document.activeElement) || interacting) return;

  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) {
    if (!(bubble?.querySelector('.note-inline'))) removeBubble();
    return;
  }

  const text = sel.toString().trim();
  if (!text || !isValidSelection(text)) {
    removeBubble();
    return;
  }
  if (bubble && lastText === text) return;
  lastText = text;

  // create bubble once
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'vocab-bubble';

    bubble.addEventListener('mousedown', (e) => {
      if (e.target?.closest('.note-inline')) {
        interacting = true;
        return;
      }
      interacting = true;
      e.preventDefault();
      e.stopPropagation();
    }, { capture: true });

    bubble.addEventListener('mouseup', () => interacting = false, { capture: true });

    const img = document.createElement('img');
    try {
      img.src = chrome.runtime.getURL('img/logo.png');
    } catch (e) {
      // Extension context invalidated - use fallback
      img.textContent = '📝';
      img.style.width = 'auto';
      img.style.height = 'auto';
      img.style.filter = 'none';
    }
    img.title = "Save vocab";
    img.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    img.addEventListener('click', e => { e.stopPropagation(); openNoteEditor(lastText); });

    const save = document.createElement('span');
    save.className = 'save-label';
    save.textContent = 'Save it';
    save.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    save.addEventListener('click', e => { e.stopPropagation(); openNoteEditor(lastText); });

    const translateBtn = document.createElement('span');
    translateBtn.className = 'translate-label';
    translateBtn.textContent = 'Translate';
    translateBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    translateBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const textToTranslate = window.getSelection().toString().trim() || lastText;
      if (!textToTranslate) return;

      // Kiểm tra xem editor đã mở chưa
      const existingEditor = bubble?.querySelector('.note-inline');
      const existingInput = existingEditor?.querySelector('.note-input');

      translateBtn.textContent = '⏳';
      try {
        const translated = await window.translateAuto(textToTranslate);

        // Nếu editor đã mở, điền kết quả vào input
        if (existingInput) {
          existingInput.value = translated;
          existingInput.focus();
        } else {
          // Nếu chưa mở, mở editor với kết quả dịch
          openNoteEditor(lastText, translated);
        }

        showToast('Translated!', 1500);
      } catch (error) {
        console.error('Translation error:', error);
        showToast('Translation failed', 2000);
      } finally {
        translateBtn.textContent = 'Translate';
      }
    });

    const noteImg = document.createElement('img');
    try {
      noteImg.src = chrome.runtime.getURL('img/logo.png');
    } catch (e) {
      noteImg.textContent = '📖';
      noteImg.style.width = 'auto';
      noteImg.style.height = 'auto';
      noteImg.style.filter = 'none';
    }
    noteImg.title = "Show saved note";
    noteImg.style.display = 'none';
    noteImg.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    noteImg.addEventListener('click', async (e) => {
      e.stopPropagation();
      const t = window.getSelection().toString().trim() || lastText;
      const data = await findNote(t);
      if (data) {
        const catLabel = getCatLabel(data.cat);
        const parts = [];
        if (catLabel) parts.push(`(${catLabel})`);
        if (data.vi) parts.push(data.vi);
        showToast(parts.join(' ').trim() || 'No note');
      }
      removeBubble();
    });

    const noteBtn = document.createElement('span');
    noteBtn.className = 'note-btn';
    noteBtn.textContent = 'Show Saved Note';
    noteBtn.style.display = 'none';
    noteBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    noteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const t = window.getSelection().toString().trim() || lastText;
      const data = await findNote(t);
      if (data) {
        const catLabel = getCatLabel(data.cat);
        const parts = [];
        if (catLabel) parts.push(`(${catLabel})`);
        if (data.vi) parts.push(data.vi);
        showToast(parts.join(' ').trim() || 'No note');
      }
      removeBubble();
    });

    bubble.append(img, save, translateBtn, noteImg, noteBtn);
    document.documentElement.appendChild(bubble);

    document.addEventListener('mousedown', (e) => {
      if (!bubble) return;
      if (bubble.contains(e.target) || e.composedPath?.().includes(bubble)) return;
      removeBubble();
    }, { capture: true });
  }

  // Toggle: đã biết -> chỉ Note; chưa biết -> chỉ Save + Translate
  const known = await hasItem(text);
  const noteBtn = bubble.querySelector('.note-btn');
  const saveLabel = bubble.querySelector('.save-label');
  const translateLabel = bubble.querySelector('.translate-label');
  const saveIcon = bubble.querySelector('img');
  const noteImgs = bubble.querySelectorAll('img');
  const noteImg = noteImgs[1]; // Second img is noteImg

  if (known) {
    if (noteImg) noteImg.style.display = 'inline';
    noteBtn.style.display = 'inline';
    saveLabel.style.display = 'none';
    translateLabel.style.display = 'none';
    saveIcon.style.display = 'none';
  } else {
    if (noteImg) noteImg.style.display = 'none';
    noteBtn.style.display = 'none';
    saveLabel.style.display = 'inline';
    translateLabel.style.display = 'inline';
    saveIcon.style.display = 'inline';
  }

  if (!document.body.contains(bubble)) document.body.appendChild(bubble);

  const br = bubble.getBoundingClientRect();
  const offset = 4;
  const anchor = getSelectionPoint();
  const vw = window.innerWidth, vh = window.innerHeight;

  let left = Math.min(anchor.x + offset, vw - br.width - 8);
  let top = Math.min(anchor.y + offset, vh - br.height - 8);

  if (left + br.width > vw - 8) left = anchor.x - br.width - offset;
  if (top + br.height > vh - 8) top = anchor.y - br.height - offset;

  left = Math.max(8, left);
  top = Math.max(8, top);

  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
  bubble.style.visibility = 'visible';
  bubble.style.display = 'inline-flex';
  bubble.style.zIndex = '2147483647';
}


/* ---------- events ---------- */
document.addEventListener('mouseup', (e) => {
  lastMouse = { clientX: e.clientX, clientY: e.clientY };
  if (!interacting) setTimeout(showBubbleAtSelection, 50);
}, true);

document.addEventListener('contextmenu', (e) => {
  lastMouse = { clientX: e.clientX, clientY: e.clientY };
  setTimeout(showBubbleAtSelection, 0);
}, true);

document.addEventListener('keyup', () => {
  if (bubble?.contains(document.activeElement) || interacting) return;
  showBubbleAtSelection();
});
