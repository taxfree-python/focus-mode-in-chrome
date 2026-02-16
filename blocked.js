const params = new URLSearchParams(location.search);
const src = params.get("src");
const info = document.getElementById("info");

info.innerHTML = src
	? `アクセスしようとしたURL: <code>${escapeHtml(src)}</code>`
	: "URL情報がありません。";

function escapeHtml(s) {
	return s.replace(
		/[&<>"']/g,
		(c) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			})[c],
	);
}

// ブロック回数を表示
chrome.storage.local.get({ blockCount: 0 }, ({ blockCount }) => {
	document.getElementById("block-count").textContent = blockCount;
});
