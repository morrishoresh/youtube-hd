"use strict";

const DEFAULT_QUALITY = "hd1080";
const select = document.getElementById("quality");
const status = document.getElementById("status");

function load() {
  browser.storage.local.get({ targetQuality: DEFAULT_QUALITY }).then((res) => {
    select.value = res.targetQuality;
  });
}

function save() {
  browser.storage.local.set({ targetQuality: select.value }).then(() => {
    status.textContent = "Saved.";
    setTimeout(() => {
      status.textContent = "";
    }, 1200);
  });
}

select.addEventListener("change", save);
document.addEventListener("DOMContentLoaded", load);
