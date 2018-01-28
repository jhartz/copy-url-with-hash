/*
 * Copyright (c) 2018, Jake Hartz. All rights reserved.
 * Use of this source code is governed by a BSD-style license
 * that can be found in the README.md file.
 */

const OPTIONS = [
    {
        name: "element-blacklist",
        type: "text",
        label: "elementBlacklistLabel",
        description: "elementBlacklistDescription",
        defaultValue: "header footer body",
    },
    {
        name: "element-whitelist",
        type: "text",
        label: "elementWhitelistLabel",
        description: "elementWhitelistDescription",
        defaultValue: "",
    },
    {
        name: "maximum-location-difference",
        type: "number",
        label: "maximumLocationDifferenceLabel",
        description: "maximumLocationDifferenceDescription",
        defaultValue: "200",
        unit: "maximumLocationDifferenceUnit",
    },
];
