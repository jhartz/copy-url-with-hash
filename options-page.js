/*
 * Copyright (c) 2018, Jake Hartz. All rights reserved.
 * Use of this source code is governed by a BSD-style license
 * that can be found in the README.md file.
 */

async function restoreOptions() {
    let optionValues = await browser.storage.sync.get(OPTIONS.reduce((obj, {name, defaultValue}) => {
        obj[name] = defaultValue;
        return obj;
    }, {}));

    let optionsTable = document.getElementById("options-table");
    while (optionsTable.lastChild) optionsTable.removeChild(optionsTable.lastChild);
    OPTIONS.forEach(({name, type, label, description, unit}) => {
        let labelElem = document.createElement("label");
        labelElem.textContent = browser.i18n.getMessage(label);
        labelElem.title = browser.i18n.getMessage(description);
        labelElem.for = "option-" + name;

        let inputElem = document.createElement("input");
        inputElem.id = "option-" + name;
        inputElem.type = type;
        inputElem.value = optionValues[name];

        let unitElem;
        if (unit) {
            unitElem = document.createElement("span");
            unitElem.textContent = " " + browser.i18n.getMessage(unit);
        }

        let tr = document.createElement("tr");

        let th = document.createElement("th");
        th.appendChild(labelElem);
        tr.appendChild(th);

        let td = document.createElement("td");
        td.appendChild(inputElem);
        if (unitElem) {
            td.appendChild(unitElem);
        }
        tr.appendChild(td);

        document.getElementById("options-table").appendChild(tr);
    });

    let saveBtn = document.createElement("input");
    saveBtn.type = "submit";
    saveBtn.value = browser.i18n.getMessage("save");

    let td = document.createElement("td");
    td.appendChild(saveBtn);

    let tr = document.createElement("tr");
    tr.appendChild(document.createElement("td"));
    tr.appendChild(td);

    document.getElementById("options-table").appendChild(tr);
}

async function saveOptions() {
    const optionValues = OPTIONS.reduce((obj, {name}) => {
        obj[name] = document.getElementById("option-" + name).value;
        return obj;
    }, {});
    await browser.storage.sync.set(optionValues);
}

document.addEventListener("DOMContentLoaded", (event) => {
    document.title = browser.i18n.getMessage("optionsTitle");
    document.getElementById("options-title").textContent = browser.i18n.getMessage("optionsTitle");
    document.getElementById("options-link").textContent = browser.i18n.getMessage("aboutOrHelp");
    restoreOptions().catch((err) => {
        console.error("Copy URL With Hash: error restoring options:", err);
        alert(browser.i18n.getMessage("errorRestoringOptions"));
    });
}, false);

document.getElementById("options-form").addEventListener("submit", (event) => {
    event.preventDefault();
    saveOptions().catch((err) => {
        console.error("Copy URL With Hash: error saving options:", err);
        alert(browser.i18n.getMessage("errorSavingOptions"));
    })
}, false);