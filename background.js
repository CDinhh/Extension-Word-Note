// background.js - Service Worker for Word Note Extension

// Open welcome page on first install
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Open welcome/guide page
        chrome.tabs.create({
            url: chrome.runtime.getURL('welcome/welcome.html')
        });
    } else if (details.reason === 'update') {
        // Optional: Show update notes
        console.log('Extension updated to version', chrome.runtime.getManifest().version);
    }
});
