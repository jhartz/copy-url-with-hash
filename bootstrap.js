/*
    Copyright (c) 2013, Jake Hartz. All rights reserved.
    Use of this source code is governed by a BSD-style license
    that can be found in the README.md file.
*/


var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

// Pref access
var prefs = Services.prefs.getBranch("extensions.copyurlwithhash.");
// String access
var strings;
// Set to an instance of nsIClipboardHelper when we need it
var clipboardHelper;

/* BOOTSTRAP CODE */

function install(data, reason) {}
function uninstall(data, reason) {}

function startup(data, reason) {
    // Set default prefs (NOTE: not user prefs)
    try {
        var branch = Services.prefs.getDefaultBranch("");
        branch.setCharPref("extensions.copyurlwithhash.elementBlacklist", "header footer body");
        branch.setCharPref("extensions.copyurlwithhash.elementWhitelist", Services.appinfo.ID == "{aa3c5121-dab2-40e2-81ca-7ea25febc110}" ? "h1 h2 h3 h4 h5 h6 a img" : "");  // (different default for Firefox Mobile)
        branch.setBoolPref("extensions.copyurlwithhash.ignoreAjaxPages", true);
        branch.setIntPref("extensions.copyurlwithhash.maxHeightDifference", 200);
    } catch (err) {
        Cu.reportError(err);
    }
    
    // Load into all existing browser windows
    var enumerator = Services.wm.getEnumerator("navigator:browser");
    while (enumerator.hasMoreElements()) {
        loadWindow(enumerator.getNext());
    }
    
    // Listen for new windows
    Services.ww.registerNotification(windowWatcher);
}

function shutdown(data, reason) {
    // Remove "new window" listener
    Services.ww.unregisterNotification(windowWatcher);
    
    // Unload from all existing browser windows
    var enumerator = Services.wm.getEnumerator("navigator:browser");
    var win;
    while (enumerator.hasMoreElements()) {
        if (win = enumerator.getNext()) {
            unloadWindow(win)
        }
    }
}

/* WINDOW LOADING/UNLOADING CODE */

var windowWatcher = function windowWatcher(win, topic) {
    if (topic != "domwindowopened") return;
    
    win.addEventListener("load", function onLoad() {
        win.removeEventListener("load", onLoad, false);
        if (win.document.documentElement.getAttribute("windowtype") == "navigator:browser") {
            loadWindow(win);
        }
    }, false);
}

function loadWindow(win) {
    if (!win._COPYURLWITHHASH_LOADED) {
        win._COPYURLWITHHASH_LOADED = true;
        
        if (win.document.getElementById("contentAreaContextMenu")) {
            // Firefox Desktop
            var menuitem = win.document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "menuitem");
            menuitem.id = "copyurlwithhash_menuitem";
            menuitem.setAttribute("label", getString("contextmenu_label"));
            menuitem.setAttribute("hidden", true);
            menuitem.addEventListener("command", onCommand, false);
            win.document.getElementById("contentAreaContextMenu").insertBefore(menuitem, win.document.getElementById("context-sep-stop") || null);
            
            var menuseparator = win.document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "menuseparator");
            menuseparator.id = "copyurlwithhash_menuseparator";
            menuseparator.setAttribute("hidden", true);
            win.document.getElementById("contentAreaContextMenu").insertBefore(menuseparator, menuitem);
            
            win.document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", onPopupShowing, false);
        } else if (win.NativeWindow && win.NativeWindow.contextmenus) {
            // Firefox Mobile
            win._COPYURLWITHHASH_MENUID = win.NativeWindow.contextmenus.add(getString("contextmenu_label"), {
                matches: function (elem) {
                    var status;
                    if (status = checkNode(elem)) {
                        win._COPYURLWITHHASH_URL = status[0];
                        return true;
                    } else {
                        return false;
                    }
                }
            }, function () {
                if (win._COPYURLWITHHASH_URL) copyURL(win._COPYURLWITHHASH_URL);
            });
        }
        
        // TODO: Add hashchange listener to detect when hash changes might reveal that a page uses too much AJAX for our add-on to work effectively
    }
}

function unloadWindow(win) {
    if (win._COPYURLWITHHASH_LOADED) {
        win._COPYURLWITHHASH_LOADED = false;
        
        if (win.document.getElementById("contentAreaContextMenu")) {
            // Firefox Desktop
            win.document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", onPopupShowing, false);
            
            var menuseparator = win.document.getElementById("copyurlwithhash_menuseparator");
            menuseparator.parentNode.removeChild(menuseparator);
            
            var menuitem = win.document.getElementById("copyurlwithhash_menuitem");
            menuitem.removeEventListener("command", onCommand, false);
            menuitem.parentNode.removeChild(menuitem);
        } else if (win.NativeWindow && win.NativeWindow.contextmenus && typeof win._COPYURLWITHHASH_MENUID != "undefined") {
            // Firefox Mobile
            win.NativeWindow.contextmenus.remove(win._COPYURLWITHHASH_MENUID);
        }
    }
}

/* CROSS-PLATFORM FUNCTIONS */

function getString(name, formats) {
    if (!strings) strings = Services.strings.createBundle("chrome://copyurlwithhash/locale/main.properties");
    return formats ? strings.formatStringFromName(name, formats, formats.length) : strings.GetStringFromName(name);
}

function findTop(elem) {
    var top = 0;
    do {
        top += elem.offsetTop;
    } while (elem = elem.offsetParent);
    return top;
}

function checkNode(elem) {
    var contentWindow = elem.ownerDocument.defaultView;
    if (!prefs.getBoolPref("ignoreAjaxPages") || contentWindow.location.hash.substring(0, 2) != "#!") {
        var origElem = elem;
        
        var blacklist = prefs.getCharPref("elementBlacklist").split(" ");
        while (elem) {
            if (blacklist.indexOf(elem.nodeName.toLowerCase()) != -1) {
                // Found blacklisted element; stop search
                elem = null;
            } else if (elem.id || (elem.nodeName.toLowerCase() == "a" && elem.getAttribute("name"))) {
                // Found good element!
                break;
            } else {
                elem = elem.parentNode;
            }
        }
        
        var whitelist = prefs.getCharPref("elementWhitelist").replace(/  */g, " ").trim();
        if (elem && whitelist.length > 0) {
            whitelist = whitelist.split(" ");
            // If the elem with the id is a whitelisted element, or its nearest block-displayed parent
            var peekingElem = elem;
            while (peekingElem) {
                if (whitelist.indexOf(peekingElem.nodeName.toLowerCase()) != -1) {
                    // Yay, it's whitelisted!
                    break;
                } else {
                    // Not whitelisted, so if it's not inline, then give it the boot
                    let display = contentWindow.getComputedStyle(peekingElem, null).display
                    if (display != "inline" && display != "inline-block") {
                        elem = null;
                        break;
                    } else {
                        peekingElem = peekingElem.parentNode;
                    }
                }
            }
                    
        }
        
        if (elem) {
            var max = prefs.getIntPref("maxHeightDifference"), diff = Math.abs(findTop(elem) - findTop(origElem));
            if (max >= 0 && diff > max) elem = null;
        }
        
        if (elem) {
            var anchor = elem.id || elem.getAttribute("name");
            
            var url = contentWindow.location.href;
            if (url.indexOf("#") != -1) url = url.substring(0, url.indexOf("#"));
            url += "#" + encodeURIComponent(anchor);
            
            return [url, "#" + anchor + (diff > 0 ? ("  " + getString("pxoff", [diff])) : "")];
        }
    }
    
    return false;
}

function copyURL(url) {
    if (!clipboardHelper) clipboardHelper = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);
    clipboardHelper.copyString(url);

}

/* FF DESKTOP FUNCTIONS */

function onPopupShowing(event) {
    var menupopup = event.originalTarget, status;
    if (menupopup.triggerNode && (status = checkNode(menupopup.triggerNode))) {
        var [url, tooltip] = status;
        var menuitem = menupopup.querySelector("#copyurlwithhash_menuitem");
        menuitem.setAttribute("hidden", false);
        menuitem.setAttribute("data-url", url);
        menuitem.setAttribute("tooltiptext", tooltip);
        menupopup.querySelector("#copyurlwithhash_menuseparator").setAttribute("hidden", false);
    } else {
        menupopup.querySelector("#copyurlwithhash_menuitem").setAttribute("hidden", true);
        menupopup.querySelector("#copyurlwithhash_menuseparator").setAttribute("hidden", true);
    }
}

function onCommand(event) {
    var menuitem = event.originalTarget;
    if (menuitem.getAttribute("data-url")) {
        copyURL(menuitem.getAttribute("data-url"));
    }
}
