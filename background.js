"use strict";

// There is no popup defined in the manifest, so clicking the toolbar
// icon fires this event instead. Open the settings (options) page.
browser.browserAction.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});
