// ===== Quiz/quiz.js — Final polished version =====

// Có chrome.storage khi chạy trong extension; ngoài ra thì không.
const hasChromeStorage = typeof chrome !== 'undefined' && chrome && chrome.storage;

// ===== Helpers to load data from storage or file =====
async function loadAllWords() {
    if (hasChromeStorage) {
        try {
            const fromLocal = await new Promise((res) =>
                chrome.storage.local.get(null, (obj) => res(obj || {}))
            );
            const fromSync = await new Promise((res) =>
            (chrome.storage.sync
                ? chrome.storage.sync.get(null, (obj) => res(obj || {}))
                : res({}))
            );
            const merged = { ...fromLocal, ...fromSync };
            const candidates =
                merged['vocab_items'] ||
                merged['words'] ||
                merged['wn-words'] ||
                merged['wordNote'] ||
                merged['WordNote'];

            if (Array.isArray(candidates)) return normalizeWords(candidates);
            if (candidates && typeof candidates === "object")
                return normalizeWords(Object.values(candidates));
        } catch (_) { }
    }

    // fallback localStorage
    try {
        const keys = ["vocab_items", "words", "wn-words", "wordNote", "WordNote"];
        for (const k of keys) {
            const raw = localStorage.getItem(k);
            if (raw) {
                const arr = JSON.parse(raw);
                return normalizeWords(Array.isArray(arr) ? arr : Object.values(arr));
            }
        }
    } catch (_) { }

    return [];
}

// Chuẩn hóa item
function normalizeWords(list) {
    return list
        .map((x, idx) => {
            const id = x.id ?? x.wordId ?? x._id ?? idx + 1;
            const word = x.word ?? x.en ?? x.text ?? "";
            const vi = x.vi ?? x.vn ?? x.meaning ?? x.description ?? x.desc ?? "";
            const cat = x.cat ?? x.category ?? x.type ?? "other";
            const createdAt = x.createdAt ?? x.time ?? x.timestamp ?? x.created ?? Date.now();
            return {
                id,
                word: String(word).trim(),
                vi: String(vi).trim(),
                cat,
                createdAt: Number(createdAt) || Date.now(),
            };
        })
        .filter((x) => x.word && x.vi);
}

// ===== State =====
let DATA = [];
let POOL = [];
let QUESTIONS = [];
let idx = 0;
let score = 0;
let finished = false;

const $ = (s) => document.querySelector(s);
const elMonth = $("#month-filter");
const elStart = $("#start-btn");
const elCounter = $("#counter");
const elScore = $("#score");
const elFinish = $("#finish-btn");
const elCard = $("#question-card");
const elWord = $("#q-word");
const elCat = $("#q-cat");
const elOpts = $("#q-options");
const elPrev = $("#prev-btn");
const elNext = $("#next-btn");
const elEmpty = $("#empty-state");
const elResult = $("#result");
const elResultText = $("#result-text");
const elLoadBtn = $("#load-json-btn");
const elFileInput = $("#file-input");

/* ===== Theme toggle ===== */
(function themeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    function apply(mode) {
        document.body.classList.remove('theme-dark', 'theme-light');
        if (mode === 'dark') { document.body.classList.add('theme-dark'); btn.textContent = '☀️'; }
        else { document.body.classList.add('theme-light'); btn.textContent = '🌙'; }
    }

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
})();

/* ===== Progress bar ===== */
function updateProgress() {
    const bar = document.getElementById('progress-bar');
    if (!bar || !QUESTIONS.length) return;
    const pct = Math.round(((idx + 1) / QUESTIONS.length) * 100);
    bar.style.width = pct + '%';
}

/* ===== Build UI ===== */
function fillMonthOptions(words) {
    const months = new Set(
        words.map((w) => {
            const d = new Date(w.createdAt || Date.now());
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        })
    );
    const sorted = Array.from(months).sort().reverse();
    elMonth.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "all";
    optAll.textContent = "All months";
    elMonth.appendChild(optAll);
    for (const m of sorted) {
        const o = document.createElement("option");
        o.value = m;
        const [y, mm] = m.split("-");
        o.textContent = `Tháng ${mm}/${y}`;
        elMonth.appendChild(o);
    }
}

function buildQuestionsFrom(pool) {
    const sorted = [...pool].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const qs = [];
    for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        const distractors = pickDistractors(sorted, item, 3);
        const options = shuffle([item.vi, ...distractors]);
        const answerIndex = options.findIndex((t) => t === item.vi);
        qs.push({
            word: item.word,
            cat: item.cat,
            correct: item.vi,
            options,
            answerIndex,
            chosen: null,
        });
    }
    return qs;
}

function pickDistractors(pool, item, n) {
    const candidates = pool
        .filter((x) => x.id !== item.id && x.vi && x.vi !== item.vi)
        .map((x) => x.vi);
    const unique = Array.from(new Set(candidates));
    shuffle(unique);
    return unique.slice(0, Math.max(0, Math.min(n, unique.length)));
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/* ===== Feedback ===== */
function revealFeedback(q) {
    [...elOpts.children].forEach((wrap, i) => {
        wrap.classList.add("disabled");
        if (i === q.answerIndex) wrap.classList.add("correct");
        if (q.chosen === i && q.chosen !== q.answerIndex)
            wrap.classList.add("wrong");
    });

    let fb = document.querySelector(".q-feedback");
    if (!fb) {
        fb = document.createElement("div");
        fb.className = "q-feedback";
        elCard.appendChild(fb);
    }
    if (q.chosen === q.answerIndex) {
        fb.textContent = "✅ Chính xác!";
        fb.className = "q-feedback ok";
    } else {
        fb.textContent = `❌ Sai. Đáp án đúng: ${q.correct}`;
        fb.className = "q-feedback bad";
    }
}

/* ===== Render ===== */
function renderQuestion() {
    if (!QUESTIONS.length) return;

    const q = QUESTIONS[idx];
    elWord.textContent = q.word;
    elCat.textContent = q.cat || "other";
    elCat.className = "q-cat";
    if (q.cat) elCat.classList.add(`cat--${q.cat.toLowerCase()}`);

    const fbExist = document.querySelector(".q-feedback");
    if (fbExist) fbExist.remove();

    elOpts.innerHTML = "";
    q.options.forEach((op, i) => {
        const wrap = document.createElement("label");
        wrap.className = "q-option";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `q-${idx}`;
        radio.value = String(i);
        radio.checked = q.chosen === i;

        radio.addEventListener("change", () => {
            q.chosen = i;
            recomputeScore();
            revealFeedback(q);
            // tự next sau 1.2s — comment nếu muốn bấm tay
            // setTimeout(() => {
            //     if (idx < QUESTIONS.length - 1) next();
            // }, 1200);
        });

        const text = document.createElement("div");
        text.textContent = op;
        wrap.append(radio, text);
        elOpts.appendChild(wrap);
    });

    elCounter.textContent = `${idx + 1} / ${QUESTIONS.length}`;
    elPrev.disabled = idx === 0;
    elNext.disabled = idx === QUESTIONS.length - 1;
    updateProgress();

    if (q.chosen != null) revealFeedback(q);
}

/* ===== Score & Navigation ===== */
function recomputeScore() {
    score = QUESTIONS.reduce(
        (acc, q) => acc + (q.chosen != null && q.chosen === q.answerIndex ? 1 : 0),
        0
    );
    elScore.textContent = `Score: ${score}`;
}
function showResult() {
    finished = true;
    renderQuestion();
    const total = QUESTIONS.length;
    elResultText.textContent = `Bạn trả lời đúng ${score}/${total} câu (${Math.round(
        (score / Math.max(total, 1)) * 100
    )}%).`;
    elResult.hidden = false;
}
function goto(i) {
    idx = Math.min(Math.max(0, i), QUESTIONS.length - 1);
    renderQuestion();
}
function next() {
    if (idx < QUESTIONS.length - 1) goto(idx + 1);
}
function prev() {
    if (idx > 0) goto(idx - 1);
}

/* ===== Init ===== */
async function init() {
    DATA = await loadAllWords();
    fillMonthOptions(DATA);

    elStart.addEventListener("click", () => {
        const sel = elMonth.value;
        if (sel && sel !== "all") {
            const [y, m] = sel.split("-").map(Number);
            POOL = DATA.filter((w) => {
                const d = new Date(w.createdAt || Date.now());
                return d.getFullYear() === y && d.getMonth() + 1 === m;
            });
        } else {
            POOL = [...DATA];
        }

        QUESTIONS = buildQuestionsFrom(POOL);
        idx = 0;
        score = 0;
        finished = false;

        recomputeScore();
        elEmpty.hidden = true;
        elResult.hidden = true;
        elCard.hidden = false;
        renderQuestion();
        updateProgress();
    });

    elNext.addEventListener("click", next);
    elPrev.addEventListener("click", prev);
    elFinish.addEventListener("click", () => {
        recomputeScore();
        showResult();
    });

    // ===== Restart fix =====
    const restartBtn = document.getElementById("restart-btn");
    if (restartBtn) {
        restartBtn.addEventListener("click", () => {
            finished = false;
            score = 0;
            idx = 0;
            elResult.hidden = true;
            elEmpty.hidden = true;
            elCard.hidden = false;
            QUESTIONS = buildQuestionsFrom(POOL);
            recomputeScore();
            renderQuestion();
            updateProgress();
        });
    }

    // ===== Import JSON =====
    elLoadBtn?.addEventListener("click", () => elFileInput.click());
    elFileInput?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            const list = Array.isArray(json) ? json : Object.values(json || {});
            DATA = normalizeWords(list);
            fillMonthOptions(DATA);
            elEmpty.hidden = false;
            elCard.hidden = true;
            elResult.hidden = true;
            idx = 0;
            score = 0;
            finished = false;
            elScore.textContent = "Score: 0";
            alert("Import thành công! Chọn tháng (nếu cần) rồi bấm Start.");
        } catch (err) {
            alert("File JSON không hợp lệ.");
        } finally {
            e.target.value = "";
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
