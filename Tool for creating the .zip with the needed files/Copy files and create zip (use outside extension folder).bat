@echo off

mkdir ".\Page Translator 3 Zip"
mkdir ".\Page Translator 3 Zip\icons"
mkdir ".\Page Translator 3 Zip\options"

copy ".\Page-Translator-3\background.js" ".\Page Translator 3 Zip\background.js"
copy ".\Page-Translator-3\LICENSE.txt" ".\Page Translator 3 Zip\LICENSE.txt"
copy ".\Page-Translator-3\manifest.json" ".\Page Translator 3 Zip\manifest.json"

copy ".\Page-Translator-3\icons\icon.svg" ".\Page Translator 3 Zip\icons\icon.svg"
copy ".\Page-Translator-3\icons\icon-16.png" ".\Page Translator 3 Zip\icons\icon-16.png"
copy ".\Page-Translator-3\icons\icon-32.png" ".\Page Translator 3 Zip\icons\icon-32.png"
copy ".\Page-Translator-3\icons\icon-48.png" ".\Page Translator 3 Zip\icons\icon-48.png"
copy ".\Page-Translator-3\icons\icon-96.png" ".\Page Translator 3 Zip\icons\icon-96.png"
copy ".\Page-Translator-3\icons\icon-128.png" ".\Page Translator 3 Zip\icons\icon-128.png"
copy ".\Page-Translator-3\icons\LICENSE.txt" ".\Page Translator 3 Zip\icons\LICENSE.txt"

copy ".\Page-Translator-3\options\options.css" ".\Page Translator 3 Zip\options\options.css"
copy ".\Page-Translator-3\options\options.html" ".\Page Translator 3 Zip\options\options.html"
copy ".\Page-Translator-3\options\options.js" ".\Page Translator 3 Zip\options\options.js"

7za-x64.exe a ".\Page Translator 3.zip" ".\Page Translator 3 Zip\*" -mx=9 -mmt=on"

RD /S /Q ".\Page Translator 3 Zip"
