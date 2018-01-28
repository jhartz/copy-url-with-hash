/*
 * Copyright (c) 2018, Jake Hartz. All rights reserved.
 * Use of this source code is governed by a BSD-style license
 * that can be found in the README.md file.
 */

var clickedElem = null;

document.addEventListener("contextmenu", (event) => {
    clickedElem = event.target;
}, false);

browser.runtime.onMessage.addListener(async (request) => {
    if (request && request.name === "menu-button-clicked") {
        if (!clickedElem) {
            console.warn("Copy URL With Hash: no clickedElem:", clickedElem);
        }
        handleContextMenuButtonClick().catch((err) => {
            console.error("Copy URL With Hash: error handling menu button click:", err);
        });
    }
});

async function handleContextMenuButtonClick() {
    let elem = await findClosestNamedElement(clickedElem);
    if (!elem) {
        window.alert(browser.i18n.getMessage("noNearbyElementError"));
        return;
    }

    let anchor = elem.id || elem.getAttribute("name");
    let url = window.location.href;
    if (url.indexOf("#") != -1) {
        url = url.substring(0, url.indexOf("#"));
    }
    url += "#" + encodeURIComponent(anchor);

    copyToClipboard({text: url});
}

async function findClosestNamedElement(elem) {
    let origElem = elem;

    let blacklist = await getBlacklist();
    while (elem) {
        if (blacklist.indexOf(elem.nodeName.toLowerCase()) != -1) {
            // Found blacklisted element
            console.info("Copy URL With Hash: found blacklisted element (" + elem.nodeName + "):", elem);
            return null;
        } else if (elem.id || (elem.nodeName.toLowerCase() === "a" && elem.getAttribute("name"))) {
            // Found good element!
            break;
        } else {
            // Keep looking
            elem = elem.parentNode;
        }
    }
    if (!elem) {
        console.info("Copy URL With Hash: found no element with id or name");
        return null;
    }
    if (!(await isWhitelisted(elem))) {
        console.info("Copy URL With Hash: element is not whitelisted (" + elem.nodeName + "):", elem);
        return null;
    }
    if (!(await isCloseEnough(elem, origElem))) {
        console.info("Copy URL With Hash: element is not close enough:", elem);
        return null;
    }

    return elem;
}


///////////////////////////////////////////////////////////////////////////////


async function getOption(optionName) {
    let optionValues = await browser.storage.sync.get(OPTIONS.reduce((obj, {name, defaultValue}) => {
        if (name === optionName) {
            obj[name] = defaultValue;
        }
        return obj;
    }, {}));
    return optionValues[optionName];
}

async function getBlacklist() {
    return parseList(await getOption("element-blacklist"));
}

async function getWhitelist() {
    return parseList(await getOption("element-whitelist"));
}

async function isWhitelisted(elem) {
    let whitelist = await getWhitelist();
    if (whitelist.length === 0) {
        return true;
    }

    // Make sure the elem with the id or name (or its nearest
    // block-displayed parent) is a whitelisted element
    let peekingElem = elem;
    while (peekingElem) {
        if (whitelist.indexOf(peekingElem.nodeName.toLowerCase()) !== -1) {
            // Yay, it's whitelisted!
            return true;
        } else {
            // Not whitelisted
            let display = window.getComputedStyle(peekingElem, null).display;
            if (display !== "inline" && display !== "inline-block") {
                // It's not inline; give it the boot
                return false;
            } else {
                // It's inline; keep looking
                peekingElem = peekingElem.parentNode;
            }
        }
    }
    return false;
}

async function isCloseEnough(elem, origElem) {
    let max = 0;
    try {
        max = parseInt(await getOption("maximum-location-difference"), 10);
    } catch (err) {}
    if (max < 0) {
        return true;
    }

    let diff = Math.abs(findTop(elem) - findTop(origElem));
    return diff <= max;
}
