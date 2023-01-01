[![Actions Status](https://github.com/tdulcet/Bug-Opener/workflows/CI/badge.svg?branch=main)](https://github.com/tdulcet/Bug-Opener/actions)

# Bug Opener
Open bug/issue numbers

Copyright © 2021 Teal Dulcet

![](icons/logo.png)

Firefox, Chromium and Thunderbird add-on/WebExtension to open GitHub, GitLab, Bitbucket, Bugzilla and Jira bug/issue numbers.

* Allows opening:
	* GitHub Issues, Pull Requests and Discussions (requires `#` prefix)
	* GitLab Issues and Merge Requests (requires `#` or `!` prefix respectively)
	* Bitbucket Issues and Pull Requests (requires `#` prefix)
	* Bugzilla Bugs (optional case insensitive `bug` prefix and three or more digits)
	* Jira Issues (requires case insensitive prefix)
* Supports opening multiple bugs in single page
* Type bug/issue numbers directly in the address bar/omnibox (Firefox and Chrome only, use the `bug` keyword)
* Supports creating a nested context menu
* Shows a live preview of the bug(s) that would open
* Allows user to specify the installations/repositories for each issue tracker in the options
* Supports automatically adding a menu item for the current GitHub, GitLab or Bitbucket repository
* Supports opening bugs in the current tab, a new tab (default), a new window or a new private/incognito window (Firefox and Chrome only)
* Supports lazy loading tabs (Firefox and Chrome only)
* Supports the light/dark mode of your system automatically
* Settings automatically synced between all browser instances and devices (Firefox and Chrome only)
* Follows the [Firefox](https://design.firefox.com/photon) and [Thunderbird](https://style.thunderbird.net/) Photon Design

❤️ Please visit [tealdulcet.com](https://www.tealdulcet.com/) to support this extension and my other software development.

⬇️ Download from [Addons.mozilla.org](https://addons.mozilla.org/firefox/addon/bug-opener/) (AMO) and [Addons.thunderbird.net](https://addons.thunderbird.net/thunderbird/addon/bug-opener/) (ATN).

Use on Thunderbird requires renaming the [thunderbirdmanifest.json](thunderbirdmanifest.json) file to `manifest.json`.
Use on Chromium/Chrome requires the downloading the [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) and renaming the [chromemanifest.json](chromemanifest.json) file to `manifest.json`.

## Other Extensions

* [Open these bug IDs in BMO or GitHub](https://github.com/ddurst/bugme) (Firefox)

## Contributing

Pull requests welcome! Ideas for contributions:

* Convert to [Manifest V3](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/) (MV3)
* Refactor into more modules
* Support more than one top level context menu item (see [bug 1294429](https://bugzilla.mozilla.org/show_bug.cgi?id=1294429))
* Show omnibox suggestions in private windows in Firefox (see [bug 1779400](https://bugzilla.mozilla.org/show_bug.cgi?id=1779400))
* Support changing the omnibox keyword (see [bug 1375453](https://bugzilla.mozilla.org/show_bug.cgi?id=1375453))
* Show more than six omnibox suggestions (see [bug 1375252](https://bugzilla.mozilla.org/show_bug.cgi?id=1375252))
* [Improve the options page](https://github.com/TinyWebEx/AutomaticSettings/issues/15)
	* [Check validity of input before saving values](https://github.com/TinyWebEx/AutomaticSettings/issues/14)
* Improve the performance
* Sync settings in Thunderbird (see [bug 446444](https://bugzilla.mozilla.org/show_bug.cgi?id=446444))
* Support Firefox for Android (see [bug 1595822](https://bugzilla.mozilla.org/show_bug.cgi?id=1595822) and [bug 1427501](https://bugzilla.mozilla.org/show_bug.cgi?id=1427501))
* Localize the add-on
