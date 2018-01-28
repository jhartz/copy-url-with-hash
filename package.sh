#!/usr/bin/env bash

set -e

EXCLUDE=(".git/*" ".gitignore" ".gitmodules" "_layouts/*" "package.sh" "*.zip" "*.xpi" "webextension-polyfill/*")
FIREFOX_ZIPFILE="copy-url-with-hash-webext.xpi"
CHROME_ZIPFILE="copy-url-with-hash-chrome.zip"

do_firefox=
do_chrome=
if [ "$1" = "all" ]; then
    do_firefox=1
    do_chrome=1
elif [ "$1" = "firefox" ]; then
    do_firefox=1
elif [ "$1" = "chrome" ]; then
    do_chrome=1
else
    echo "USAGE: package.sh {firefox,chrome,all}"
    exit 2
fi

status() {
    echo ""
    echo ""
    echo ":: $1"
}

make_zip() {
    local zipfile="$1"
    if [ -f "$zipfile" ]; then
        rm -v "$zipfile"
    fi
    zip -r "$zipfile" . -x "${EXCLUDE[@]}"
}

echo "Copy URL With Hash"
echo "------------------"

status "UPDATING SUBMODULES"
git submodule update --init

status "BUILDING WEBEXTENSION-POLYFILL"
cd webextension-polyfill
npm install >/dev/null
npm run build >/dev/null
cp -v dist/browser-polyfill.min.js{,.map} ..
cd ..

if [ "$do_firefox" ]; then
    status "PACKAGING FOR FIREFOX"
    make_zip "$FIREFOX_ZIPFILE"
fi

if [ "$do_chrome" ]; then
    status "PACKAGING FOR CHROME WEB STORE"
    make_zip "$CHROME_ZIPFILE"
fi
