const BLOCK_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\/.*/i,
  /^https?:\/\/(m\.)?youtube\.com\/.*/i,
  /^https?:\/\/(www\.)?twitter\.com\/.*/i,
  /^https?:\/\/(mobile\.)?twitter\.com\/.*/i,
  /^https?:\/\/(www\.)?x\.com\/.*/i,
];

function isBlocked(url) {
  return BLOCK_PATTERNS.some((re) => re.test(url));
}

async function getState() {
  return await chrome.storage.local.get({ focusEnabled: false });
}

async function setBadge(on) {
  await chrome.action.setBadgeText({ text: on ? "ON" : "" });
}

// 拡張アイコンをクリックでON/OFF
chrome.action.onClicked.addListener(async () => {
  const { focusEnabled } = await getState();
  const next = !focusEnabled;
  await chrome.storage.local.set({ focusEnabled: next });
  await setBadge(next);
});

// すでにあるタブやURL変更を監視してブロック
async function maybeBlock(tabId, url) {
  if (!url || !url.startsWith("http")) return;
  const { focusEnabled } = await getState();
  if (!focusEnabled) return;

  const blockedUrl =
    chrome.runtime.getURL("blocked.html") +
    "?src=" +
    encodeURIComponent(url);
  if (url.startsWith(chrome.runtime.getURL("blocked.html"))) return;

  if (isBlocked(url)) {
    await chrome.tabs.update(tabId, { url: blockedUrl });
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) maybeBlock(tabId, changeInfo.url);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab?.url) maybeBlock(tabId, tab.url);
});

// 起動時にバッジ同期
chrome.runtime.onStartup.addListener(async () => {
  const { focusEnabled } = await getState();
  await setBadge(focusEnabled);
});
chrome.runtime.onInstalled.addListener(async () => {
  const { focusEnabled } = await getState();
  await setBadge(focusEnabled);
});
