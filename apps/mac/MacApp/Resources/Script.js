function show(enabled, useSettingsInsteadOfPreferences) {
    if (useSettingsInsteadOfPreferences) {
        document.getElementsByClassName('state-on')[0].innerText = "Universal VidCaster Safari is enabled. Open a video page in Safari and select the extension in the toolbar.";
        document.getElementsByClassName('state-off')[0].innerText = "Universal VidCaster Safari is disabled. Enable it in Safari Settings → Extensions.";
        document.getElementsByClassName('state-unknown')[0].innerText = "Enable Universal VidCaster Safari in Safari Settings → Extensions.";
        document.getElementsByClassName('open-preferences')[0].innerText = "Quit and Open Safari Settings…";
    }

    if (typeof enabled === "boolean") {
        document.body.classList.toggle(`state-on`, enabled);
        document.body.classList.toggle(`state-off`, !enabled);
    } else {
        document.body.classList.remove(`state-on`);
        document.body.classList.remove(`state-off`);
    }
}

function openPreferences() {
    webkit.messageHandlers.controller.postMessage("open-preferences");
}

document.querySelector("button.open-preferences").addEventListener("click", openPreferences);
