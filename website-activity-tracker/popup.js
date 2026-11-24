const userNameInput = document.getElementById("userName");
const saveNameBtn = document.getElementById("saveNameBtn");
const autoDetectToggle = document.getElementById("autoDetectToggle");
const trackingToggle = document.getElementById("trackingToggle");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const logCount = document.getElementById("logCount");
const detectedInfo = document.getElementById("detectedInfo");

function refreshUI() {
  chrome.storage.local.get(
    {
      logs: [],
      manualUserName: "",
      autoDetectUser: true,
      detectedSiteUser: "",
      chromeEmail: "",
      isTracking: true
    },
    (data) => {
      userNameInput.value = data.manualUserName;
      autoDetectToggle.checked = data.autoDetectUser;
      trackingToggle.checked = data.isTracking;
      logCount.textContent = `Total Recorded Events: ${data.logs.length}`;

      let active = "Anonymous";
      if (!data.autoDetectUser && data.manualUserName.trim()) {
        active = data.manualUserName.trim();
      } else if (data.detectedSiteUser && data.chromeEmail && data.detectedSiteUser !== data.chromeEmail) {
        active = `${data.detectedSiteUser} (${data.chromeEmail})`;
      } else {
        active = data.detectedSiteUser || data.chromeEmail || data.manualUserName.trim() || "Anonymous";
      }
      detectedInfo.textContent = `Active Identity: ${active}`;
    }
  );
}

saveNameBtn.addEventListener("click", () => {
  const name = userNameInput.value.trim();
  const autoMode = name === "";
  chrome.storage.local.set({ manualUserName: name, autoDetectUser: autoMode }, () => {
    saveNameBtn.textContent = "Saved!";
    refreshUI();
    setTimeout(() => (saveNameBtn.textContent = "Save Manual Name"), 1000);
  });
});

autoDetectToggle.addEventListener("change", () => {
  chrome.storage.local.set({ autoDetectUser: autoDetectToggle.checked }, refreshUI);
});

trackingToggle.addEventListener("change", () => {
  chrome.storage.local.set({ isTracking: trackingToggle.checked });
});

downloadBtn.addEventListener("click", () => {
  chrome.storage.local.get({ logs: [] }, (data) => {
    if (!data.logs.length) {
      alert("No activity recorded yet!");
      return;
    }

    const headers = ["User Name / Email", "Website URL", "Action Type", "Details", "Hold Duration", "Timestamp"];
    const csvRows = [headers.join(",")];

    data.logs.forEach((row) => {
      const values = [
        row.userName,
        row.url,
        row.action,
        row.details,
        row.duration,
        row.timestamp
      ].map((val) => `"${String(val).replace(/"/g, '""')}"`);
      csvRows.push(values.join(","));
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

clearBtn.addEventListener("click", () => {
  chrome.storage.local.set({ logs: [] }, refreshUI);
});

refreshUI();
