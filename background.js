"use strict";

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";

const TITLE = "🐞 Bug Opener";

const formatter1 = new Intl.ListFormat([], { style: "short" });
const formatter2 = new Intl.ListFormat([], { style: "short", type: "disjunction" });

const TYPE = Object.freeze({
	BUG: "bug",
	BUGZILLA: "Bugzilla",
	PHAB: "Phabricator",
	GH: "GitHub",
	GL: "GitLab",
	BB: "Bitbucket",
	CODEBERG: "Codeberg",
	JIRA: "Jira"
});
const menuStructure = Object.freeze([TYPE.BUGZILLA, TYPE.PHAB, TYPE.GH, TYPE.GL, TYPE.BB, TYPE.CODEBERG, TYPE.JIRA]);

// GitHub, Bitbucket and Codeberg
const re = /#(\d+)/gu;

/**
 * Bug/issue number regular expressions.
 *
 * @const
 * @type {Object.<string, RegExp>}
 */
const reBug = Object.freeze({
	// GitHub Issues, Pull Requests and Discussions
	[TYPE.GH]: re,
	// GitLab Issues and Merge Requests
	[TYPE.GL]: /([#!])(\d+)/gu,
	// Bitbucket Issues and Pull Requests
	[TYPE.BB]: re,
	// Codeberg Issues and Pull Requests
	[TYPE.CODEBERG]: re,
	// Bugzilla Bugs: https://bugzilla.readthedocs.io/en/latest/using/tips.html
	[TYPE.BUGZILLA]: /\b(?:Bug\s*)?(?:#\s*)?(\d{3,})\b/giu, // /\bBugs\s*#?\s*\d+(?:\s*,\s*#?\s*\d+)+\b/giu
	// Phabricator Revisions
	[TYPE.PHAB]: /D(\d+)/gu,
	// Jira Issues
	[TYPE.JIRA]: /([A-Z]{2,})-(\d+)/giu
});

// Thunderbird
// https://bugzilla.mozilla.org/show_bug.cgi?id=1641573
const IS_THUNDERBIRD = Boolean(globalThis.messenger);

// Chrome
const IS_CHROME = Object.getPrototypeOf(browser) !== Object.prototype;

// communication type
const UPDATE_CONTEXT_MENU = "updateContextMenu";
const BACKGROUND = "background";

const menus = browser.menus || browser.contextMenus; // fallback for Thunderbird

const settings = {
	GH: null,
	GitHub: null,
	GL: null,
	GitLab: null,
	BB: null,
	Bitbucket: null,
	CODEBERG: null,
	Codeberg: null,
	Bugzilla: null,
	Phabricator: null,
	Jira: null,
	single: null,
	nested: null,
	newTab: null,
	newWindow: null,
	private: null,
	background: null,
	lazy: null,
	livePreview: null,
	delay: null, // Seconds
	send: null
};

const notifications = new Map();

let menuIsShown = false;

let isAllowed = null;


/**
 * Create notification.
 *
 * @param {string} title
 * @param {string} message
 * @returns {void}
 */
function notification(title, message) {
	if (settings.send) {
		console.log(title, message);
		browser.notifications.create({
			type: "basic",
			iconUrl: browser.runtime.getURL("icons/icon_128.png"),
			title,
			message
		});
	}
}

browser.notifications.onClicked.addListener((notificationId) => {
	const url = notifications.get(notificationId);

	if (url) {
		browser.tabs.create({ url });
	}
});

browser.notifications.onClosed.addListener((notificationId) => {
	notifications.delete(notificationId);
});

/**
 * Encode XML.
 *
 * @param {string} text
 * @returns {string}
 */
function encodeXML(text) {
	const map = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&apos;"
	};
	return text.replaceAll(/[&<>"']/gu, (m) => map[m]);
}

/**
 * Get GitHub URLs.
 *
 * @param {string} text
 * @param {string} url
 * @param {boolean} [omnibox]
 * @returns {string[]}
 */
function getGHURLs(text, url, omnibox) {
	const issues = Array.from(text.matchAll(reBug[TYPE.GH]), (x) => x[1]);
	if (issues.length) {
		const aurl = new URL(url);
		if (!aurl.pathname.endsWith("/")) { // terminating /
			aurl.pathname += "/";
		}
		if (settings.single || omnibox) {
			if (issues.length > 1) {
				return [`${aurl}issues?${new URLSearchParams({ q: issues.join(" ") })}`];
			}
		}
		return issues.map((issue) => `${aurl}issues/${issue}`);
	}
	return [];
}

/**
 * Get GitLab URLs.
 *
 * @param {string} text
 * @param {string} url
 * @param {boolean} [omnibox]
 * @returns {string[]}
 */
function getGLURLs(text, url, _omnibox) {
	const issues = Array.from(text.matchAll(reBug[TYPE.GL]));
	if (issues.length) {
		const aurl = new URL(url);
		if (!aurl.pathname.endsWith("/")) { // terminating /
			aurl.pathname += "/";
		}
		return issues.map((issue) => `${aurl}-/${issue[1] === "!" ? "merge_requests" : "issues"}/${issue[2]}`);
	}
	return [];
}

/**
 * Get Bitbucket URLs.
 *
 * @param {string} text
 * @param {string} url
 * @param {boolean} [omnibox]
 * @returns {string[]}
 */
function getBBURLs(text, url, _omnibox) {
	const issues = Array.from(text.matchAll(reBug[TYPE.BB]), (x) => x[1]);
	if (issues.length) {
		const aurl = new URL(url);
		if (!aurl.pathname.endsWith("/")) { // terminating /
			aurl.pathname += "/";
		}
		return issues.map((issue) => `${aurl}issues/${issue}`);
	}
	return [];
}

/**
 * Get Codeberg URLs.
 *
 * @param {string} text
 * @param {string} url
 * @param {boolean} [omnibox]
 * @returns {string[]}
 */
function getCodebergURLs(text, url, _omnibox) {
	const issues = Array.from(text.matchAll(reBug[TYPE.CODEBERG]), (x) => x[1]);
	if (issues.length) {
		const aurl = new URL(url);
		if (!aurl.pathname.endsWith("/")) { // terminating /
			aurl.pathname += "/";
		}
		return issues.map((issue) => `${aurl}issues/${issue}`);
	}
	return [];
}

/**
 * Get Bugzilla URLs.
 *
 * @param {string} text
 * @param {string} url
 * @param {boolean} [omnibox]
 * @returns {string[]}
 */
function getBugzillaURLs(text, url, omnibox) {
	const bugnums = Array.from(text.matchAll(reBug[TYPE.BUGZILLA]), (x) => x[1]);
	if (bugnums.length) {
		const aurl = new URL(url);
		if (!aurl.pathname.endsWith("/")) { // terminating /
			aurl.pathname += "/";
		}
		if (settings.single || omnibox) {
			if (bugnums.length > 1) {
				return [`${aurl}buglist.cgi?${new URLSearchParams({ bug_id: bugnums.join(",") })}`];
			}
		}
		// `${aurl}show_bug.cgi?id=${bugnum}`
		return bugnums.map((bugnum) => `${aurl}${bugnum}`);
	}
	return [];
}

/**
 * Get Phabricator URLs.
 *
 * @param {string} text
 * @param {string} url
 * @param {boolean} [omnibox]
 * @returns {string[]}
 */
function getPhabURLs(text, url, omnibox) {
	const revisions = Array.from(text.matchAll(reBug[TYPE.PHAB]), (x) => x[0]);
	if (revisions.length) {
		const aurl = new URL(url);
		if (!aurl.pathname.endsWith("/")) { // terminating /
			aurl.pathname += "/";
		}
		return revisions.map((revision) => `${aurl}${revision}`);
	}
	return [];
}

/**
 * Get Jira URLs.
 *
 * @param {string} text
 * @param {string} url
 * @param {boolean} [omnibox]
 * @returns {string[]}
 */
function getJiraURLs(text, url, omnibox) {
	const issues = Array.from(text.matchAll(reBug[TYPE.JIRA]), (x) => x[0]);
	if (issues.length) {
		const aurl = new URL(url);
		if (!aurl.pathname.endsWith("/")) { // terminating /
			aurl.pathname += "/";
		}
		if (settings.single || omnibox) {
			if (issues.length > 1) {
				return [`${aurl}issues/?${new URLSearchParams({ jql: `key in (${issues.join(", ")})` })}`];
			}
		}
		return issues.map((issue) => `${aurl}browse/${issue}`);
	}
	return [];
}

/**
 * Get URLs.
 *
 * @const
 * @type {Object.<string, function(string, string, boolean=): string[]>}
 */
const getURLs = Object.freeze({
	// GitHub
	[TYPE.GH]: getGHURLs,
	// GitLab
	[TYPE.GL]: getGLURLs,
	// Bitbucket
	[TYPE.BB]: getBBURLs,
	// Codeberg
	[TYPE.CODEBERG]: getCodebergURLs,
	// Bugzilla
	[TYPE.BUGZILLA]: getBugzillaURLs,
	// Phabricator
	[TYPE.PHAB]: getPhabURLs,
	// Jira
	[TYPE.JIRA]: getJiraURLs
});

/**
 * Delay.
 *
 * @param {number} delay
 * @returns {Promise<void>}
 */
function delay(delay) {
	return new Promise((resolve) => {
		setTimeout(resolve, delay);
	});
}

/**
 * Potentially adjust context menu display if it is shown.
 *
 * This does not always change some things, but it e.g.
 * * hides the menu when no text is selected
 *
 * @param {Object} info
 * @param {Object} tab
 * @returns {Promise<void>}
 * @throws {Error}
 */
async function handleMenuShown(info, tab) {
	console.log(info);
	let text = info.selectionText;

	// do not show menu entry when no text is selected
	if (!text) {
		// await menus.removeAll();
		// menuIsShown = false;
		// menus.refresh();
		return;
	}

	text &&= text.trim().normalize();

	await buildMenu(text, tab);

	menus.refresh();
}

/**
 * Handle selection of a context menu item.
 *
 * This will trigger the actual action of transforming the selected text.
 *
 * @param {Object} info
 * @param {Object} tab
 * @returns {Promise<void>}
 * @throws {Error}
 */
async function handleMenuChoosen(info, tab) {
	console.log(info);
	let text = info.selectionText;

	if (!text) {
		return;
	}

	text = text.trim().normalize();

	const urls = [];

	const [menuItemId, id, name] = info.menuItemId.split("-");

	switch (menuItemId) {
		case TYPE.BUG: {
			let url;
			if (name === "Current") {
				const aurl = new URL(tab.url);
				url = aurl.origin + aurl.pathname.split("/").slice(0, 3).join("/");
			} else {
				const setting = settings[id].find((x) => x.name === name);
				url = setting.url;
			}
			const aurls = getURLs[id](text, url);
			if (aurls.length) {
				urls.push(...aurls);
			} else {
				const message = `${id} bugs/issues`;
				console.error(`Error: No ${message} found`, text);
				notification(`❌ No ${message} found`, `The selected text does not contain any ${message}. This error should only happen in Chrome/Chromium.`);
			}
			break;
		}
	}

	if (urls.length) {
		if (IS_THUNDERBIRD) {
			for (const url of urls) {
				// Only supports HTTP and HTTPS URLs: https://bugzilla.mozilla.org/show_bug.cgi?id=1777183
				await browser.windows.openDefaultBrowser(url);
				if (settings.delay) {
					await delay(settings.delay * 1000);
				}
			}
		} else if (settings.newWindow) {
			browser.windows.create({ url: urls, incognito: settings.private && isAllowed || tab.incognito, focused: !settings.background });
		} else {
			// let aindex = tab.index + 1;
			let aactive = !settings.background;

			if (urls.length > 1) {
				for (const url of urls) {
					const options = { url, active: aactive, /* index: aindex, */ openerTabId: tab.id };
					if (!IS_CHROME) {
						options.discarded = !aactive && settings.lazy;
					}
					await browser.tabs.create(options);
					// aindex += 1;
					aactive = false;
					if (settings.delay) {
						await delay(settings.delay * 1000);
					}
				}
			} else if (settings.newTab) {
				const options = { url: urls[0], active: aactive, /* index: aindex, */ openerTabId: tab.id };
				if (!IS_CHROME) {
					options.discarded = !aactive && settings.lazy;
				}
				browser.tabs.create(options);
			} else {
				browser.tabs.update(tab.id, { url: urls[0] });
			}
		}
	}
}

/**
 * Add menu items.
 *
 * @param {string} transformationId
 * @param {{name: string, url: string|null, icon?: string}[]} menuItems
 * @param {string[]} bugnums
 * @returns {Promise<void>}
 */
async function createSubmenus(transformationId, menuItems, bugnums) {
	// console.log(transformationId, menuItems, bugnums);
	const text = settings.livePreview && bugnums ? ` (${formatter1.format(bugnums).replaceAll("&", "&&")})` : "";
	const aid = `${TYPE.BUG}-${transformationId}`;
	if (settings.nested && menuItems.length > 1) {
		const menuText = `in ${transformationId}${text}`;
		if (menuIsShown) {
			await menus.update(aid, {
				title: menuText,
				visible: Boolean(bugnums)
			});
		} else {
			await menus.create({
				id: aid,
				parentId: TYPE.BUG,
				title: menuText,
				contexts: ["selection"]
			});
		}
		for (const menuItem of menuItems) {
			const url = menuItem.url && new URL(menuItem.url);
			const menuText = `${menuItem.name}${url ? ` – ${url.pathname.length > 1 ? url.pathname : url.host}` : ""}`;
			if (menuIsShown) {
				if (IS_CHROME || !url) {
					await menus.update(`${aid}-${menuItem.name}`, {
						title: menuText,
						visible: Boolean(menuItem.url)
					});
				} else {
					await menus.update(`${aid}-${menuItem.name}`, {
						title: menuText,
						icons: {
							16: menuItem.icon || `${url.origin}/favicon.ico`
						},
						visible: Boolean(menuItem.url)
					});
				}
			} else {
				await menus.create({
					id: `${aid}-${menuItem.name}`,
					parentId: aid,
					title: menuText,
					contexts: ["selection"]
				});
			}
		}
	} else {
		const amenuItems = menuItems.filter((x) => x.url);
		for (const menuItem of menuItems) {
			const url = menuItem.url && new URL(menuItem.url);
			const menuText = `in ${menuItem.name}${url ? "" : ` ${transformationId}`}${url ? amenuItems.length > 1 ? ` – ${url.pathname.length > 1 ? url.pathname : url.host}` : text : ""}`;
			if (menuIsShown) {
				if (IS_CHROME || !url) {
					await menus.update(`${aid}-${menuItem.name}`, {
						title: menuText,
						visible: Boolean(bugnums) && Boolean(menuItem.url)
					});
				} else {
					await menus.update(`${aid}-${menuItem.name}`, {
						title: menuText,
						icons: {
							16: menuItem.icon || `${url.origin}/favicon.ico`
						},
						visible: Boolean(bugnums) && Boolean(menuItem.url)
					});
				}
			} else {
				await menus.create({
					id: `${aid}-${menuItem.name}`,
					parentId: TYPE.BUG,
					title: menuText,
					contexts: ["selection"]
				});
			}
		}
	}
}

/**
 * Apply (new) menu item settings by (re)creating or updating/refreshing the context menu.
 *
 * @param {string?} [exampleText=null]
 * @param {Object?} [tab]
 * @returns {Promise<void>}
 */
async function buildMenu(exampleText, tab) {
	console.log(exampleText);
	let arepos = {
		[TYPE.GH]: settings.GH && !IS_THUNDERBIRD ? [{ name: "Current", url: null }, ...settings[TYPE.GH]] : settings[TYPE.GH],
		[TYPE.GL]: settings.GL && !IS_THUNDERBIRD ? [{ name: "Current", url: null }, ...settings[TYPE.GL]] : settings[TYPE.GL],
		[TYPE.BB]: settings.BB && !IS_THUNDERBIRD ? [{ name: "Current", url: null }, ...settings[TYPE.BB]] : settings[TYPE.BB],
		[TYPE.CODEBERG]: settings.CODEBERG && !IS_THUNDERBIRD ? [{ name: "Current", url: null }, ...settings[TYPE.CODEBERG]] : settings[TYPE.CODEBERG],
		[TYPE.BUGZILLA]: settings[TYPE.BUGZILLA],
		[TYPE.PHAB]: settings[TYPE.PHAB],
		[TYPE.JIRA]: settings[TYPE.JIRA]
	};
	if (tab?.url && (settings.GH || settings.GL || settings.BB || settings.CODEBERG) && !IS_THUNDERBIRD) {
		const aurl = new URL(tab.url);
		const path = aurl.pathname.split("/");
		if (path.length >= 3 && path[1] && path[2]) {
			let type = null;
			switch (aurl.origin) {
				case "https://github.com":
					if (settings.GH) {
						type = TYPE.GH;
					}
					break;
				case "https://gitlab.com":
					if (settings.GL) {
						type = TYPE.GL;
					}
					break;
				case "https://bitbucket.org":
					if (settings.BB) {
						type = TYPE.BB;
					}
					break;
				case "https://codeberg.org":
					if (settings.CODEBERG) {
						type = TYPE.CODEBERG;
					}
					break;
			}
			if (type) {
				const [repo] = arepos[type];
				repo.url = aurl.origin + path.slice(0, 3).join("/");
				repo.icon = tab.favIconUrl;
			}
		}
	}
	arepos = Object.fromEntries(Object.entries(arepos).filter(([, v]) => v.length));

	const bugnums = {};
	if (exampleText) {
		for (const id of Object.keys(arepos)) {
			bugnums[id] = exampleText.match(reBug[id]);
		}
	}

	if (Object.keys(arepos).length) {
		if (menuIsShown) {
			await menus.update(TYPE.BUG, {
				enabled: Object.values(bugnums).some(Boolean)
			});
		} else {
			await menus.create({
				id: TYPE.BUG,
				title: "Open bugs",
				contexts: ["selection"]
			});
		}
	}

	for (const [index, [key, repos]] of Object.entries(arepos).entries()) {
		if (!settings.nested && index && !menuIsShown) {
			await menus.create({
				// id: id,
				parentId: TYPE.BUG,
				type: "separator",
				contexts: ["selection"]
			});
		}

		await createSubmenus(key, repos, bugnums[key]);
	}

	menuIsShown = true;
}

if (browser.omnibox) {
	browser.omnibox.onInputChanged.addListener((input, suggest) => {
		console.log(input);
		const result = [];

		if (input) {
			for (const id of menuStructure) {
				if (settings[id].length) {
					const bugnums = input.match(reBug[id]);
					if (bugnums) {
						const text = ` (${formatter1.format(bugnums)})`;
						for (const setting of settings[id]) {
							const url = new URL(setting.url);
							const [aurl] = getURLs[id](input, setting.url, true);
							const adescription = `Open bugs in ${setting.name} – ${url.pathname.length > 1 ? url.pathname : url.host}${text}`;
							result.push({
								content: aurl,
								description: IS_CHROME ? `${encodeXML(adescription)} <url>${aurl}</url>` : adescription
							});
						}
					}
				}
			}
		}

		console.log(result);
		suggest(result);
	});

	browser.omnibox.onInputEntered.addListener((url, disposition) => {
		console.log(url, disposition);
		if (/^(?:https?|ftp):/iu.test(url)) {
			switch (disposition) {
				case "currentTab":
					browser.tabs.update({ url });
					break;
				case "newForegroundTab":
					browser.tabs.create({ url });
					break;
				case "newBackgroundTab":
					browser.tabs.create({ url, active: false });
					break;
			}
		}
	});
}

// feature detection for this feature, as it is not compatible with Chrome/ium.
if (menus.onShown) {
	menus.onShown.addListener(handleMenuShown);
}
menus.onClicked.addListener(handleMenuChoosen);

/**
 * Set settings.
 *
 * @param {Object} asettings
 * @returns {void}
 */
function setSettings(asettings) {
	settings.GH = asettings.GH;
	settings.GitHub = asettings.GHRepos;
	settings.GL = asettings.GL;
	settings.GitLab = asettings.GLRepos;
	settings.BB = asettings.BB;
	settings.Bitbucket = asettings.BBRepos;
	settings.CODEBERG = asettings.CODEBERG;
	settings.Codeberg = asettings.CodebergRepos;
	settings.Bugzilla = asettings.bugzillas;
	settings.Phabricator = asettings.phabricators;
	settings.Jira = asettings.jiras;
	settings.single = asettings.single;
	settings.nested = asettings.nested;
	settings.newTab = false;
	settings.newWindow = false;
	settings.private = false;
	switch (Number.parseInt(asettings.disposition, 10)) {
		case 1:
			break;
		case 2:
			settings.newTab = true;
			break;
		case 3:
			settings.newWindow = true;
			break;
		case 4:
			settings.newWindow = true;
			settings.private = true;
			break;
	}
	settings.background = asettings.background;
	settings.lazy = asettings.lazy;
	settings.livePreview = asettings.livePreview;
	settings.delay = asettings.delay;
	settings.send = asettings.send;

	if (browser.omnibox) {
		browser.omnibox.setDefaultSuggestion({
			description: `Search for bugs via ${TITLE}. Type ${formatter2.format(menuStructure.filter((x) => settings[x].length))} bug/issue numbers.`
		});
	}
}

/**
 * Init.
 *
 * @public
 * @returns {Promise<void>}
 */
async function init() {
	const platformInfo = await browser.runtime.getPlatformInfo();
	// Remove once https://bugzilla.mozilla.org/show_bug.cgi?id=1595822 is fixed
	if (platformInfo.os === "android") {
		return;
	}

	isAllowed = await browser.extension.isAllowedIncognitoAccess();

	const asettings = await AddonSettings.get("settings");

	setSettings(asettings);

	buildMenu();
}

init();

browser.runtime.onMessage.addListener(async (message, sender) => {
	// console.log(message);
	if (message.type === UPDATE_CONTEXT_MENU) {
		let text = message.selection;

		// do not show menu entry when no text is selected
		if (!text) {
			return;
		}

		text = text.trim().normalize();

		await buildMenu(text, sender.tab);
	} else if (message.type === BACKGROUND) {
		setSettings(message.optionValue);

		await menus.removeAll();
		menuIsShown = false;
		buildMenu();
	}
});

browser.runtime.onInstalled.addListener((details) => {
	console.log(details);

	const manifest = browser.runtime.getManifest();
	switch (details.reason) {
		case "install":
			notification(`🎉 ${manifest.name} installed`, `Thank you for installing the “${TITLE}” add-on!\nVersion: ${manifest.version}\n\nOpen the options/preferences page to configure this extension and add your issue trackers.`);
			break;
		case "update":
			if (settings.send) {
				browser.notifications.create({
					type: "basic",
					iconUrl: browser.runtime.getURL("icons/icon_128.png"),
					title: `✨ ${manifest.name} updated`,
					message: `The “${TITLE}” add-on has been updated to version ${manifest.version}. Click to see the release notes.\n\n❤️ Huge thanks to the generous donors that have allowed me to continue to work on this extension!`
				}).then(async (notificationId) => {
					let url = "";
					if (browser.runtime.getBrowserInfo) {
						const browserInfo = await browser.runtime.getBrowserInfo();

						url = browserInfo.name === "Thunderbird" ? `https://addons.thunderbird.net/thunderbird/addon/bug-opener/versions/${manifest.version}` : `https://addons.mozilla.org/firefox/addon/bug-opener/versions/${manifest.version}`;
					}
					if (url) {
						notifications.set(notificationId, url);
					}
				});
			}
			break;
	}
});

browser.runtime.setUninstallURL("https://forms.gle/qhBxEKP7eA2JjSky8");
