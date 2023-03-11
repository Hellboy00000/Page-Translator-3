function protocolIsApplicable(tabUrl) {
    const APPLICABLE_PROTOCOLS = ['http:', 'https:'];
    let url = new URL(tabUrl);
    return APPLICABLE_PROTOCOLS.includes(url.protocol);
}

let options = { alwaysShowPageAction: false, automaticallyTranslate: false, translationService: "google", fromLang: "auto", toLang: "auto", contextMenu: true };

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
function pageIsInForeignLanguage(pageLanguage) {
    // Normalize page language and browser languages
    pageLanguage = pageLanguage.toLowerCase();

    // If language is unknown, better to show the UI
    if (pageLanguage === "und") {
        return true;
    }

    let navigatorLanguages = navigator.languages.map(navigatorLanguage => {
        return navigatorLanguage.toLowerCase();
    });

    // Check if the page's language explicitly matches any of browser's preferred languages
    if (navigatorLanguages.includes(pageLanguage)) {
        return false;
    }

    // If you're still here, then check for match of primary language subtags
    // If so, assume close enough to native language.

    // Get array of the primary languages from the browser, i.e. those without a hyphen
    // Ex: `en` but not `en-SV`
    let primaryLanguageSubtags = navigatorLanguages.filter(language => {
        return language.indexOf('-') === -1;
    });

    // If no primary language subtag specified in browser, the user has explicitly removed it,
    // so assume they want explicit language match instead of partial match.
    if (primaryLanguageSubtags.length === 0) {
        return true;
    }

    // Get page's language subtag
    let pageLanguageSubtag = pageLanguage.split('-', 1)[0];

    // Look for primary language subtag match
    if (primaryLanguageSubtags.includes(pageLanguageSubtag)) {
        return false;
    }

    // No match, so page is in foreign language.
    return true;
}

/*
Show the Page Translator page action in the browser address bar, if applicable.
If user always wants the icon, show it.
If page is in foreign language, show it.
    If user wants auto translation, invoke it.
*/
async function determinePageAction(tabId, url) {
    if (options.alwaysShowPageAction && !options.automaticallyTranslate) {
        return true;
    }

    if (!url) {
        let tab = await browser.tabs.get(tabId);
        url = tab.url;
    }

    if (!url || !protocolIsApplicable(url)) {
        return false;
    }

    let pageLanguage = await getPageLanguage(tabId);
    let pageLanguageKnown = pageLanguage !== "und";
    let pageNeedsTranslating = pageIsInForeignLanguage(pageLanguage);
    let isTranslationPage = url.includes(".translate.goog") || url.includes(".microsofttranslator.com");

    if (pageLanguageKnown && pageNeedsTranslating && options.automaticallyTranslate && !isTranslationPage) {
        return "translate";
    }

    return (pageNeedsTranslating || options.alwaysShowPageAction);
}

let needsTranslation = false;

async function initializePageAction(tabId, url) {
    let action = await determinePageAction(tabId, url);
    needsTranslation = action;

    if (action === "translate") {
        doTranslator({ id: tabId, url: url });
        action = false;
    }

    if (action === true) {
        browser.pageAction.show(tabId);
    } else {
        browser.pageAction.hide(tabId);
    }
}

let selectedText = "";
browser.menus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
        case "translate-page":
            if (!isNullOrWhitespace(info.selectionText)) {
                selectedText = info.selectionText.trim();
            }
            doTranslator(tab);
            break;
    }
});

function isNullOrWhitespace(input) {
    return !input;
}

async function doTranslator(tab) {
    let url = tab.url;

    if (needsTranslation === true || !isNullOrWhitespace(selectedText)) {
        let fromLang = options.fromLang;
        if (fromLang == "auto2") {
            let pageLanguage = await getPageLanguage(tab.id);
            if (pageLanguage !== "und") {
                fromLang = pageLanguage;
            } else {
                fromLang = "auto";
            }
        }

        let toLang = options.toLang;
        if (toLang == "auto") {
            let languageBrowser = navigator.language;
            if (languageBrowser.includes("-") == true) {
                languageBrowser = languageBrowser.split('-', 1)[0];
            }
            toLang = languageBrowser
        }

        if (isNullOrWhitespace(selectedText)) {
            if (options.translationService === "microsoft") {
                url = `https://www.translatetheweb.com/?from=${fromLang}&to=${toLang}&a=${encodeURIComponent(url)}`;
            } else {
                url = `https://translate.google.com/translate?sl=${fromLang}&tl=${toLang}&hl=${toLang}&u=${encodeURIComponent(url)}`;
            }
            browser.tabs.update(tab.id, { url: url });
            browser.tabs.query({active:true,currentWindow:true}).then(function(tabs){ url = tabs[0].url; });
            initializePageAction(tab.id, url);
        } else {
            url = `https://translate.google.com/?sl=${fromLang}&tl=${toLang}&text=${selectedText}`;

            browser.tabs.create({ 'url': url, 'index': tab.index + 1 });
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
            title: "Translate"
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
    updateOptions(newOptions);
}

browser.storage.onChanged.addListener(updateChanged);
