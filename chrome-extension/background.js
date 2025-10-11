// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for tab updates to send current URL to side panel
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.runtime.sendMessage({
      type: 'TAB_UPDATED',
      url: tab.url
    }).catch(() => {
      // Side panel might not be open, ignore error
    });
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    chrome.runtime.sendMessage({
      type: 'TAB_UPDATED',
      url: tab.url
    }).catch(() => {
      // Side panel might not be open, ignore error
    });
  }
});