/*
 * Copyright (c) 2018, Jake Hartz. All rights reserved.
 * Use of this source code is governed by a BSD-style license
 * that can be found in the README.md file.
 */

const FIRSTRUN_URL = "https://jhartz.github.io/copy-url-with-hash/welcome.html";

const MENU_ITEM_ID = "copy-url-with-hash-button";

browser.contextMenus.create({
    id: MENU_ITEM_ID,
    title: browser.i18n.getMessage("menuButtonLabel"),
    // Doesn't include nested iframes
    contexts: ["page", "link", "image"]
});

browser.contextMenus.onClicked.addListener((data, tab) => {
    if (data.menuItemId !== MENU_ITEM_ID) return;

    browser.tabs.sendMessage(tab.id, {
        name: "menu-button-clicked"
    }).catch((err) => {
        console.error("Copy URL With Hash: error sending menu-button-clicked:", err);
        alert(browser.i18n.getMessage("otherError"));
    });
});

browser.runtime.onInstalled.addListener(({reason, temporary}) => {
    if (!temporary && reason === "install") {
        browser.tabs.create({
            url: FIRSTRUN_URL
        });
    }
});
