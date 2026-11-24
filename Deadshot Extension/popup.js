document.getElementById('btnExport').addEventListener('click', async () => {
  showStatus('Extracting data...', '');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url.startsWith('http')) {
      showStatus('Cannot access this page type!', 'error');
      return;
    }

    const url = new URL(tab.url);

    // 1. Get Cookies
    const cookies = await chrome.cookies.getAll({ url: tab.url });

    // 2. Get Local Storage via Script Injection
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const localStorageData = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          localStorageData[key] = localStorage.getItem(key);
        }
        return localStorageData;
      }
    });

    const localStorageData = injectionResults[0]?.result || {};

    const payload = {
      domain: url.hostname,
      exportedAt: new Date().toISOString(),
      cookies: cookies,
      localStorage: localStorageData
    };

    // Download JSON file
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `deadshot_${url.hostname}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(downloadUrl);

    showStatus('Export successful!', 'success');
  } catch (err) {
    console.error(err);
    showStatus('Export failed: ' + err.message, 'error');
  }
});

// Import Button Trigger
document.getElementById('btnImportTrigger').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});

// File Import Handler
document.getElementById('fileInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  showStatus('Importing data...', '');

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.url.startsWith('http')) {
        showStatus('Invalid tab!', 'error');
        return;
      }

      // 1. Set Cookies
      if (Array.isArray(data.cookies)) {
        for (const cookie of data.cookies) {
          const cookieDetails = {
            url: tab.url,
            name: cookie.name,
            value: cookie.value,
            path: cookie.path || '/',
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            expirationDate: cookie.expirationDate
          };
          
          if (cookie.hostOnly) delete cookieDetails.domain;
          
          try {
            await chrome.cookies.set(cookieDetails);
          } catch (cErr) {
            console.warn('Cookie set error:', cErr);
          }
        }
      }

      // 2. Set Local Storage
      if (data.localStorage) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (storageData) => {
            for (const [key, value] of Object.entries(storageData)) {
              localStorage.setItem(key, value);
            }
          },
          args: [data.localStorage]
        });
      }

      showStatus('Import success! Reloading page...', 'success');
      setTimeout(() => {
        chrome.tabs.reload(tab.id);
      }, 1200);

    } catch (err) {
      console.error(err);
      showStatus('Invalid JSON file!', 'error');
    }
  };

  reader.readAsText(file);
});

function showStatus(msg, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = msg;
  statusEl.className = type;
}