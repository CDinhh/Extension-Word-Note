// welcome.js - Welcome page interactions

document.addEventListener('DOMContentLoaded', () => {
    const getStartedBtn = document.getElementById('get-started');
    const openDashboardBtn = document.getElementById('open-dashboard');
    const sourceLangSelect = document.getElementById('default-source-lang');
    const targetLangSelect = document.getElementById('default-target-lang');
    const pinGuideImg1 = document.getElementById('pin-guide-img-1');
    const pinGuideImg2 = document.getElementById('pin-guide-img-2');

    // Hide images if they fail to load (CSP-compliant)
    if (pinGuideImg1) {
        pinGuideImg1.addEventListener('error', () => {
            pinGuideImg1.style.display = 'none';
        });
    }

    if (pinGuideImg2) {
        pinGuideImg2.addEventListener('error', () => {
            pinGuideImg2.style.display = 'none';
        });
    }

    // Load current language preferences if any
    chrome.storage.local.get({
        'translate-source-lang': 'en',
        'translate-target-lang': 'vi'
    }, (result) => {
        sourceLangSelect.value = result['translate-source-lang'];
        targetLangSelect.value = result['translate-target-lang'];
    });

    // Save language preferences when changed
    sourceLangSelect.addEventListener('change', () => {
        chrome.storage.local.set({
            'translate-source-lang': sourceLangSelect.value
        });
        localStorage.setItem('translate-source-lang', sourceLangSelect.value);
    });

    targetLangSelect.addEventListener('change', () => {
        chrome.storage.local.set({
            'translate-target-lang': targetLangSelect.value
        });
        localStorage.setItem('translate-target-lang', targetLangSelect.value);
    });

    // Get Started - Save preferences and close
    getStartedBtn.addEventListener('click', () => {
        // Ensure preferences are saved
        chrome.storage.local.set({
            'translate-source-lang': sourceLangSelect.value,
            'translate-target-lang': targetLangSelect.value
        }, () => {
            window.close();
        });
    });

    // Open Dashboard
    openDashboardBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openDashboard' }, () => {
            window.close();
        });
    });
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openDashboard') {
        chrome.action.openPopup();
    }
});
