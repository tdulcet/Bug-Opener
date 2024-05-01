/**
 * This modules contains the custom triggers for some options that are added.
 *
 * @module modules/CustomOptionTriggers
 */

import * as AutomaticSettings from "/common/modules/AutomaticSettings/AutomaticSettings.js";

// communication type
const BACKGROUND = "background";

/**
 * Binds the triggers.
 *
 * This is basically the "init" method.
 *
 * @returns {Promise<void>}
 */
export async function registerTrigger() {
	const aevent = new Event("change", { bubbles: true });

	const arepos = ["GHRepos", "GLRepos", "BBRepos", "bugzillas", "jiras"];

	for (const repos of arepos) {
		const table = document.getElementById(`${repos}-table`);

		const addRow = (repo) => {
			const row = table.insertRow();
			const template = document.getElementById(`${repos}-row`);
			const clone = template.content.cloneNode(true);

			if (repo) {
				clone.getElementById("name").value = repo.name;
				clone.getElementById("url").value = repo.url;
			}

			const up = (/* event */) => {
				const prev = row.previousSibling;
				if (prev?.previousSibling) {
					row.parentNode.insertBefore(row, prev);

					table.dispatchEvent(aevent);
				}
			};
			clone.getElementById("up").addEventListener("click", up);

			const down = (/* event */) => {
				const next = row.nextSibling;
				if (next) {
					row.parentNode.insertBefore(row, next.nextSibling);

					table.dispatchEvent(aevent);
				}
			};
			clone.getElementById("down").addEventListener("click", down);

			const deleteRow = (/* event */) => {
				row.remove();

				table.dispatchEvent(aevent);
			};
			clone.getElementById("delete").addEventListener("click", deleteRow);

			row.append(clone);
		};
		document.getElementById(`${repos}-add`).addEventListener("click", (/* event */) => {
			addRow();
		});

		const removeRows = () => {
			while (table.rows.length > 1) {
				table.deleteRow(-1);
			}
		};
		document.getElementById(`${repos}-remove`).addEventListener("click", (/* event */) => {
			// Does not work in Thunderbird: https://bugzilla.mozilla.org/show_bug.cgi?id=1780977
			if (confirm("Are you sure you want to remove all repositories?")) {
				removeRows();

				table.dispatchEvent(aevent);
			}
		});

		AutomaticSettings.Trigger.addCustomLoadOverride(repos, (param) => {
			// console.log(param);
			removeRows();

			for (const repo of param.optionValue) {
				addRow(repo);
			}

			return {};
		});
	}

	AutomaticSettings.Trigger.addCustomSaveOverride("settings", (param) => {
		// console.log(param);
		const settings = param.optionValue;
		delete settings.undefined;

		for (const repos of arepos) {
			const table = document.getElementById(`${repos}-table`);
			// Convert table to array of objects, ignores any rows with invalid cells
			const array = Array.from(table.rows, (row) => row.getElementsByTagName("input")).filter((cells) => cells.length && Array.from(cells).every((cell) => cell.checkValidity())).map(([aname, aurl]) => ({
				name: aname.value,
				url: aurl.value
			}));
			// Set the new options
			settings[repos] = array;
		}

		console.log(settings);

		// trigger update for current session
		browser.runtime.sendMessage({
			type: BACKGROUND,
			optionValue: settings
		});

		return AutomaticSettings.Trigger.overrideContinue(settings);
	});

	// Thunderbird
	if (globalThis.messenger) {
		document.getElementById("GH").disabled = true;
		document.getElementById("GL").disabled = true;
		document.getElementById("BB").disabled = true;
		document.getElementById("currentTab").disabled = true;
		document.getElementById("newWindow").disabled = true;
		document.getElementById("private").disabled = true;
		document.getElementById("background").disabled = true;
		document.getElementById("lazy").disabled = true;
	} else {
		const isAllowed = await browser.extension.isAllowedIncognitoAccess();

		if (!isAllowed) {
			document.getElementById("private").disabled = true;
		}
	}
}
