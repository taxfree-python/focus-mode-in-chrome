async function getLists() {
	const { blockedDomains, allowedDomains } = await chrome.storage.local.get({
		blockedDomains: [],
		allowedDomains: [],
	});
	return { blockedDomains, allowedDomains };
}

function matchesDomain(hostname, domain) {
	return hostname === domain || hostname.endsWith(`.${domain}`);
}

function isBlocked(url, blockedDomains, allowedDomains) {
	try {
		const hostname = new URL(url).hostname;
		if (allowedDomains.some((d) => matchesDomain(hostname, d))) return false;
		return blockedDomains.some((d) => matchesDomain(hostname, d));
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

	const { blockedDomains, allowedDomains } = await getLists();
	if (isBlocked(url, blockedDomains, allowedDomains)) {
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

	// 既存の設定がなければ config.json からデフォルトを読み込む
	const stored = await chrome.storage.local.get([
		"blockedDomains",
		"allowedDomains",
	]);
	if (!stored.blockedDomains || !stored.allowedDomains) {
		try {
			const resp = await fetch(chrome.runtime.getURL("config.json"));
			const config = await resp.json();
			const defaults = {};
			if (!stored.blockedDomains)
				defaults.blockedDomains = config.blockedDomains;
			if (!stored.allowedDomains)
				defaults.allowedDomains = config.allowedDomains;
			await chrome.storage.local.set(defaults);
		} catch (e) {
			console.error("Failed to load default config:", e);
		}
	}
});
