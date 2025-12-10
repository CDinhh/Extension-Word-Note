// page_interactor/translate.js - Free Google Translate

/* ===== Get language preferences ===== */
async function getLanguagePreferences() {
    try {
        const result = await chrome.storage.local.get({
            'translate-source-lang': 'auto',
            'translate-target-lang': 'vi'
        });
        return {
            sourceLang: result['translate-source-lang'] || 'auto',
            targetLang: result['translate-target-lang'] || 'vi'
        };
    } catch (error) {
        console.error('Failed to get language preferences:', error);
        return { sourceLang: 'auto', targetLang: 'vi' };
    }
}

/* ===== Free Google Translate ===== */
async function translateFree(text, sourceLang = 'en', targetLang = 'vi') {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Translation error: ${response.status}`);
        }

        const data = await response.json();
        // Response format: [[[translated, original, null, null, confidence], ...], ...]
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            return data[0][0][0];
        }
        throw new Error('Invalid translation response');
    } catch (error) {
        console.error('Free translation failed:', error);
        // Fallback: try alternative endpoint
        return translateWithMyMemory(text, sourceLang, targetLang);
    }
}

/* ===== MyMemory API (backup) ===== */
async function translateWithMyMemory(text, sourceLang = 'en', targetLang = 'vi') {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`MyMemory API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.responseStatus === 200 && data.responseData) {
        return data.responseData.translatedText;
    }
    throw new Error('Translation failed');
}

/* ===== Main translate function ===== */
async function translateText(text) {
    if (!text || !text.trim()) {
        throw new Error('No text to translate');
    }

    try {
        return await translateFree(text);
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
}

/* ===== Auto-detect language ===== */
async function detectLanguage(text) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const data = await response.json();

        // Detected language is at data[2]
        if (data && data[2]) {
            return data[2];
        }
        return 'unknown';
    } catch (error) {
        console.error('Language detection failed:', error);
        return 'unknown';
    }
}

/* ===== Translate with auto-detect ===== */
async function translateAuto(text) {
    const prefs = await getLanguagePreferences();
    const detectedLang = await detectLanguage(text);

    // Nếu source là auto, sử dụng detected language
    const sourceLang = prefs.sourceLang === 'auto' ? detectedLang : prefs.sourceLang;
    const targetLang = prefs.targetLang;

    return await translateFree(text, sourceLang, targetLang);
}

// Export for use in content.js
window.translateText = translateText;
window.translateAuto = translateAuto;
window.detectLanguage = detectLanguage;
