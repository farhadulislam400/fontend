function fetchChromeProfileEmail() {
  if (chrome.identity && chrome.identity.getProfileUserInfo) {
    chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, (userInfo) => {
      if (userInfo && userInfo.email) {
        chrome.storage.local.set({ chromeEmail: userInfo.email });
      }
    });
  }
}

chrome.runtime.onInstalled.addListener(fetchChromeProfileEmail);
chrome.runtime.onStartup.addListener(fetchChromeProfileEmail);
fetchChromeProfileEmail();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DETECTED_PROFILE") {
    if (message.profileName) {
      chrome.storage.local.set({ detectedSiteUser: message.profileName });
    }
    return;
  }

  if (message.type === "LOG_ACTIVITY") {
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
        if (!data.isTracking) return;

        let activeUser = "Anonymous";
        if (!data.autoDetectUser && data.manualUserName.trim()) {
          activeUser = data.manualUserName.trim();
        } else if (data.detectedSiteUser && data.chromeEmail && data.detectedSiteUser !== data.chromeEmail) {
          activeUser = `${data.detectedSiteUser} (${data.chromeEmail})`;
        } else {
          activeUser =
            data.detectedSiteUser ||
            data.chromeEmail ||
            data.manualUserName.trim() ||
            "Anonymous";
        }

        const entry = {
          userName: activeUser,
          url: message.payload.url,
          action: message.payload.action,
          details: message.payload.details,
          duration: message.payload.duration || "-",
          timestamp: new Date().toLocaleString()
        };

        const updatedLogs = [...data.logs, entry];
        chrome.storage.local.set({ logs: updatedLogs });
      }
    );
  }
});
