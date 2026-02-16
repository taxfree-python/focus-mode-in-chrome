async function getBlockedDomains() {
	const { blockedDomains } = await chrome.storage.local.get({
		blockedDomains: [],
	});
	return blockedDomains;
}

function isBlocked(url, blockedDomains) {
	try {
		const hostname = new URL(url).hostname;
		return blockedDomains.some(
			(domain) => hostname === domain || hostname.endsWith(`.${domain}`),
		);
	} catch {
		return false;
	}
}

async function getState() {
	return await chrome.storage.local.get({ focusEnabled: false });
}

async function setBadge(on) {
	await chrome.action.setBadgeText({ text: on ? "ON" : "" });
}

async function incrementBlockCount() {
	const { blockCount } = await chrome.storage.local.get({ blockCount: 0 });
	await chrome.storage.local.set({ blockCount: blockCount + 1 });
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

	if (url.startsWith(chrome.runtime.getURL("blocked.html"))) return;

	const blockedDomains = await getBlockedDomains();
	if (isBlocked(url, blockedDomains)) {
		await incrementBlockCount();
		const blockedUrl = `${chrome.runtime.getURL("blocked.html")}?src=${encodeURIComponent(url)}`;
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

// インストール時にデフォルト設定をロード
chrome.runtime.onInstalled.addListener(async () => {
	const { focusEnabled } = await getState();
	await setBadge(focusEnabled);

	// 既存のドメイン設定がなければ config.json からデフォルトを読み込む
	const { blockedDomains } = await chrome.storage.local.get("blockedDomains");
	if (!blockedDomains) {
		try {
			const resp = await fetch(chrome.runtime.getURL("config.json"));
			const config = await resp.json();
			await chrome.storage.local.set({
				blockedDomains: config.blockedDomains,
			});
		} catch (e) {
			console.error("Failed to load default config:", e);
		}
	}
});
