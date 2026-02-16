const domainList = document.getElementById("domain-list");
const newDomainInput = document.getElementById("new-domain");
const addBtn = document.getElementById("add-btn");
const resetBtn = document.getElementById("reset-btn");
const blockCountEl = document.getElementById("block-count");
const resetCountBtn = document.getElementById("reset-count");

function renderDomains(domains) {
	domainList.innerHTML = "";
	if (domains.length === 0) {
		const li = document.createElement("li");
		li.className = "empty-message";
		li.textContent = "ドメインが登録されていません";
		domainList.appendChild(li);
		return;
	}
	domains.forEach((domain) => {
		const li = document.createElement("li");
		const span = document.createElement("span");
		span.className = "domain-name";
		span.textContent = domain;
		const btn = document.createElement("button");
		btn.textContent = "削除";
		btn.addEventListener("click", () => removeDomain(domain));
		li.appendChild(span);
		li.appendChild(btn);
		domainList.appendChild(li);
	});
}

async function loadDomains() {
	const { blockedDomains } = await chrome.storage.local.get({
		blockedDomains: [],
	});
	renderDomains(blockedDomains);
}

async function loadBlockCount() {
	const { blockCount } = await chrome.storage.local.get({ blockCount: 0 });
	blockCountEl.textContent = blockCount;
}

function normalizeDomain(input) {
	let d = input.trim().toLowerCase();
	// プロトコルが付いていたら除去
	d = d.replace(/^https?:\/\//, "");
	// パスを除去
	d = d.replace(/\/.*$/, "");
	// www. を除去
	d = d.replace(/^www\./, "");
	return d;
}

function isValidDomain(domain) {
	return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(
		domain,
	);
}

async function addDomain() {
	const raw = newDomainInput.value;
	const domain = normalizeDomain(raw);
	if (!domain) return;
	if (!isValidDomain(domain)) {
		alert(`無効なドメインです: ${domain}`);
		return;
	}
	const { blockedDomains } = await chrome.storage.local.get({
		blockedDomains: [],
	});
	if (blockedDomains.includes(domain)) {
		alert(`すでに登録されています: ${domain}`);
		return;
	}
	blockedDomains.push(domain);
	await chrome.storage.local.set({ blockedDomains });
	newDomainInput.value = "";
	renderDomains(blockedDomains);
}

async function removeDomain(domain) {
	const { blockedDomains } = await chrome.storage.local.get({
		blockedDomains: [],
	});
	const updated = blockedDomains.filter((d) => d !== domain);
	await chrome.storage.local.set({ blockedDomains: updated });
	renderDomains(updated);
}

async function resetToDefaults() {
	if (!confirm("デフォルトのドメインリストに戻しますか？")) return;
	try {
		const resp = await fetch(chrome.runtime.getURL("config.json"));
		const config = await resp.json();
		await chrome.storage.local.set({ blockedDomains: config.blockedDomains });
		renderDomains(config.blockedDomains);
	} catch (e) {
		alert("デフォルト設定の読み込みに失敗しました");
		console.error(e);
	}
}

async function resetBlockCount() {
	if (!confirm("ブロック回数のカウントをリセットしますか？")) return;
	await chrome.storage.local.set({ blockCount: 0 });
	blockCountEl.textContent = "0";
}

addBtn.addEventListener("click", addDomain);
newDomainInput.addEventListener("keydown", (e) => {
	if (e.key === "Enter") addDomain();
});
resetBtn.addEventListener("click", resetToDefaults);
resetCountBtn.addEventListener("click", resetBlockCount);

loadDomains();
loadBlockCount();
