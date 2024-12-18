function showHide(elem, show) {
    if ( show ) {
        elem.style.display = "";
    } else {
        elem.style.display = "none";
    }
}

function updateLayout() {
    let service = document.querySelector("#translation-service").value;
    let b = (service === "google");
    showHide( document.querySelector("#google_lang_from"), b);
    showHide( document.querySelector("#google_lang_to"), b);
    showHide( document.querySelector("#yandex_lang_from"), !b);
    showHide( document.querySelector("#yandex_lang_to"), !b);
}

function saveOptions() {
    let service = document.querySelector("#translation-service").value;
    browser.storage.local.set({
        automaticallyTranslate: document.querySelector("#automatically-translate").checked,
        alwaysShowPageAction: document.querySelector("#always-show-page-action").checked,
        contextMenu: document.querySelector("#context-menu").checked,
        openPageNewTab: document.querySelector("#open-page-in-new-tab").checked,
        openTextSameTab: document.querySelector("#open-text-in-same-tab").checked,
        translationService: service,
        fromLang: document.querySelector(service == "google" ? "#google_lang_from" : "#yandex_lang_from").value,
        toLang: document.querySelector(service == "google" ? "#google_lang_to" : "#yandex_lang_to").value
    });
    updateLayout();
}

async function restoreOptions() {
    let options = await browser.storage.local.get();

    if (typeof options.automaticallyTranslate === "boolean") {
        document.querySelector("#automatically-translate").checked = options.automaticallyTranslate;
    }

    if (typeof options.alwaysShowPageAction === "boolean") {
        document.querySelector("#always-show-page-action").checked = options.alwaysShowPageAction;
        updateLayout();
    }

    if (typeof options.contextMenu === "boolean") {
        document.querySelector("#context-menu").checked = options.contextMenu;
    }

    if (typeof options.contextMenu === "boolean") {
        document.querySelector("#open-page-in-new-tab").checked = options.openPageNewTab;
    }

    if (typeof options.contextMenu === "boolean") {
        document.querySelector("#open-text-in-same-tab").checked = options.openTextSameTab;
    }

    if (typeof options.translationService === "string") {
        document.querySelector("#translation-service").value = options.translationService;
    }
    
    let service = document.querySelector("#translation-service").value;
    if (typeof options.fromLang === "string") {
        document.querySelector(service == "google" ? "#google_lang_from" : "#yandex_lang_from").value = options.fromLang;
    }
    if (typeof options.toLang === "string") {
        document.querySelector(service == "google" ? "#google_lang_to" : "#yandex_lang_to").value = options.toLang;
    }
}

document.addEventListener("DOMContentLoaded", restoreOptions);
let arr = ["automatically-translate","always-show-page-action","translation-service","context-menu","open-page-in-new-tab","open-text-in-same-tab"
          ,"google_lang_from","google_lang_to","yandex_lang_from","yandex_lang_to"];
for(let i = 0; i < arr.length;i++)
 document.querySelector("#" + arr[i]).addEventListener("change", saveOptions);
updateLayout();
