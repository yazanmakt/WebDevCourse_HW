const SKINS = ["../SKINS/basic.css", "../SKINS/dark.css", "../SKINS/modern.css"];

const linkEl = document.getElementById("skinStylesheet");

let idx = linkEl ? Math.max(0, SKINS.indexOf(linkEl.getAttribute("href"))) : 0;

window.changeSkin = function () {
    if (!linkEl) {
        console.error("Skin stylesheet link element not found!");
        return;
    }

    // Increment the index and wrap around to 0 when it reaches the end of the array
    idx = (idx + 1) % SKINS.length;

    // Set the new href value
    linkEl.href = SKINS[idx];

    console.debug("Skin switched to:", linkEl.href);
};