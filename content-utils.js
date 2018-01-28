/*
 * Copyright (c) 2018, Jake Hartz. All rights reserved.
 * Use of this source code is governed by a BSD-style license
 * that can be found in the README.md file.
 */

/**
 * Copy data to the clipboard.
 * Based on: https://github.com/mdn/webextensions-examples/blob/master/context-menu-copy-link-with-types/clipboard-helper.js
 */
function copyToClipboard({text, html}) {
    function oncopy(event) {
        document.removeEventListener("copy", oncopy, true);
        // Hide the event from the page to prevent tampering.
        event.stopImmediatePropagation();

        // Overwrite the clipboard content.
        event.preventDefault();
        if (text) {
            event.clipboardData.setData("text/plain", text);
        }
        if (html) {
            event.clipboardData.setData("text/html", html);
        }
    }
    document.addEventListener("copy", oncopy, true);

    // Requires the clipboardWrite permission, or a user gesture:
    document.execCommand("copy");
}

/**
 * Find the distance of an element from the top of the page.
 */
function findTop(elem) {
    let top = 0;
    do {
        top += elem.offsetTop;
    } while ((elem = elem.offsetParent));
    return top;
}

/**
 * Parse a string with space-separated elements into an array.
 */
function parseList(s) {
    return s.split(" ").map((e) => e.trim().toLowerCase()).filter((e) => !!e);
}
