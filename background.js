let options = { automaticallyTranslate: false, alwaysShowPageAction: false, translationService: "google", fromLang: "auto", toLang: "auto", contextMenu: true, openPageNewTab: false, openTextSameTab: false };

let contextMenuItem = false;

async function getPageLanguage(tabId) {
    if (!browser.tabs.detectLanguage) {
        if (!options.alwaysShowPageAction) {
            options.alwaysShowPageAction = true;
            browser.storage.local.set({ alwaysShowPageAction: true });
        }
        return "und";
    }
    return await browser.tabs.detectLanguage(tabId);
}

// string -> boolean
function pageIsInForeignLanguage() {
    // Normalize page language and browser language
    let pageLanguageLower = pageLanguage.toLowerCase();

    // If language is unknown, better to show the UI
    if (pageLanguageLower === "und") {
        return true;
    }

    let languageBrowser = browser.i18n.getUILanguage().toLowerCase();

    // Check if the page language explicitly matches the browser preferred language
    if (languageBrowser.includes(pageLanguageLower)) {
        return false;
    }

    // If you're still here, then check for match of primary language subtag
    // If so, assume close enough to native language.

    // Get browser language subtag, i.e. those without a hyphen
    // Ex: `en` but not `en-SV`
    let primaryLanguageSubtags = languageBrowser.split('-', 1)[0];

    // If no primary language subtag specified in browser, the user has explicitly removed it,
    // so assume they want explicit language match instead of partial match.
    if (primaryLanguageSubtags.length === 0) {
        return true;
    }

    // Get page's language subtag
    let pageLanguageSubtag = pageLanguageLower.split('-', 1)[0];

    // Look for primary language subtag match
    if (primaryLanguageSubtags.includes(pageLanguageSubtag)) {
        return false;
    }

    // No match, so page is in foreign language.
    return true;
}

var currentTab;
let currentUrl = "";
var pageLanguage;

/*
Show the Page Translator page action in the browser address bar, if applicable.
If user always wants the icon, show it.
If page is in foreign language, show it.
    If user wants auto translation, invoke it.
*/
async function determinePageAction(tabId) {
    if (options.alwaysShowPageAction && !options.automaticallyTranslate) {
        return true;
    }

    currentTab = await browser.tabs.get(tabId);
    currentUrl = currentTab.url;

    if (isNullOrWhitespace(currentUrl) || !currentUrl.includes("http")) {
        return false;
    }

    pageLanguage = await getPageLanguage(tabId);
    let pageLanguageKnown = pageLanguage !== "und";
    let pageNeedsTranslating = pageIsInForeignLanguage();
    let isTranslationPage = currentUrl.includes("translate.goog") || currentUrl.includes("translated.turbopages.org");

    if (pageLanguageKnown && pageNeedsTranslating && options.automaticallyTranslate && !options.openPageNewTab && !isTranslationPage) {
        return "translate";
    }

    if (isTranslationPage === true) {
        return false;
    }

    return (pageNeedsTranslating || options.alwaysShowPageAction);
}

let needsTranslation = false;

async function initializePageAction(tabId) {
    let action = await determinePageAction(tabId);

    if (action === true || action === "translate") {
        needsTranslation = true;
    } else {
        needsTranslation = false;
    }

    if (action === "translate") {
        doTranslator();
    }

    if (action === true) {
        browser.pageAction.show(tabId);
    } else {
        browser.pageAction.hide(tabId);
    }
}

let selectedText = "";
browser.menus.onClicked.addListener((info) => {
    switch (info.menuItemId) {
        case "translate-page":
            if (!isNullOrWhitespace(info.selectionText)) {
                selectedText = info.selectionText.trim();
            }
            doTranslator();
            break;
    }
});

function isNullOrWhitespace(input) {
    return !input;
}

async function doTranslator() {
    let url = currentUrl;

    if (needsTranslation === true || !isNullOrWhitespace(selectedText)) {
        let fromLang = options.fromLang;
        if (fromLang === "auto2") {
            if (pageLanguage !== "und") {
                fromLang = pageLanguage;
            } else {
                fromLang = "auto";
            }
        }

        let toLang = options.toLang;
        if (toLang === "auto") {
            let languageBrowser = browser.i18n.getUILanguage();
            // Next if - Necessary because yandex have languages with "-"
            if (options.translationService === "google" || options.translationService === "yandex" && toLang !== "pt-BR" && toLang !== "sr-Latn") {
                if (languageBrowser.includes("-") === true) {
                    languageBrowser = languageBrowser.split('-', 1)[0];
                }
            }
            toLang = languageBrowser
        }

        if (isNullOrWhitespace(selectedText)) {
            if (options.translationService === "google") {
                url = `https://translate.google.com/translate?sl=${fromLang}&tl=${toLang}&hl=${toLang}&u=${encodeURIComponent(url)}`;
            } else {
                if (fromLang == "auto") {
                    url = `https://translate.yandex.com/translate?lang=${toLang}&url=${encodeURIComponent(url)}`;   // Necessary because yandex auto doesn't work correctly
                } else {
                    url = `https://translate.yandex.com/translate?lang=${fromLang}-${toLang}&url=${encodeURIComponent(url)}`;
                }
            }

            if (options.openPageNewTab === true) {
                browser.tabs.create({ 'url': url, 'index': currentTab.index + 1 });
            }
            else {
                browser.tabs.update(currentTab.id, { url: url });
            }
        } else {
            if (options.translationService === "google") {
                url = `https://translate.google.com/?sl=${fromLang}&tl=${toLang}&text=${encodeURIComponent(selectedText)}&op=translate`;
            } else {
                if (fromLang == "auto") {   // Necessary because yandex auto doesn't work correctly
                    if (toLang == "en") {
                        fromLang = "zu";
                    } else {
                        fromLang = "en";
                    }
                    // navigator.clipboard.writeText(selectedText);
                    // selectedText = "";
                }
                url = `https://translate.yandex.com/?source_lang=${fromLang}&target_lang=${toLang}&text=${encodeURIComponent(selectedText)}`;
            }

            if (options.openTextSameTab === true) {
                browser.tabs.update(currentTab.id, { url: url });
            }
            else {
                browser.tabs.create({ 'url': url, 'index': currentTab.index + 1 });
            }
        }

        selectedText = "";
    }
}

browser.tabs.onActivated.addListener((activeInfo) => {
    initializePageAction(activeInfo.tabId);
});

try {
    browser.tabs.onUpdated.addListener((id, changeInfo, tab) => {
        if ((typeof changeInfo.status === "string") && (changeInfo.status === "complete")) {
            initializePageAction(tab.id, tab.url);
        }
    }, { properties: ["status"] });
} catch (err) {
    browser.tabs.onUpdated.addListener((id, changeInfo, tab) => {
        if ((typeof changeInfo.status === "string") && (changeInfo.status === "complete")) {
            initializePageAction(tab.id, tab.url);
        }
    });
}

browser.pageAction.onClicked.addListener(doTranslator);

let changed = true;
function updateOptions(storedOptions) {
    for (o in options) {
        if (typeof storedOptions[o] === typeof options[o]) {
            changed = changed || options[o] !== storedOptions[o];
            options[o] = storedOptions[o];
        }
    }

    if (options.contextMenu && !contextMenuItem) {
        contextMenuItem = "translate-page";
        browser.menus.create({
            id: contextMenuItem,
            title: "Translate Page or Text"
        });
    } else if (contextMenuItem && !options.contextMenu) {
        browser.menus.update(contextMenuItem, { visible: false });
    }

    if (changed) {
        browser.tabs.query({}).then((tabs) => {
            for (tab of tabs) {
                initializePageAction(tab.id, tab.url);
            }
        });
        changed = false;
    }
}

browser.storage.local.get().then(updateOptions);

function updateChanged(changes, area) {
    var changedItems = Object.keys(changes);
    changed = false;

    let newOptions = {};
    for (var item of changedItems) {
        newOptions[item] = changes[item].newValue;
    }

    // To avoid a bug: The "Open translated pages in a new tab" option does not work if you are using the "Automatically translate pages in foreign language" option.
    if (newOptions["automaticallyTranslate"] === true && newOptions["openPageNewTab"] === true || options.openPageNewTab) {
        newOptions["openPageNewTab"] = false;
    }

    updateOptions(newOptions);
}

browser.storage.onChanged.addListener(updateChanged);
