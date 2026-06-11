"use client";
import { isBackdrop } from "./is-backdrop.js";
import { assignStyle, orchestrate, setAttribute, setProperty } from "./orchestrate.js";
import { walkTreeOutside } from "./walk-tree-outside.js";
import { hideElementFromAccessibilityTree } from "./disable-accessibility-tree-outside.js";
import { isFocusTrap } from "./is-focus-trap.js";
import { supportsInert } from "./supports-inert.js";
import { chain, contains, getAllTabbableIn, noop } from "@ariakit/utils";
//#region src/dialog/utils/disable-tree.ts
function disableTree(element, ignoredElements) {
	if (!("style" in element)) return noop;
	if (supportsInert()) return setProperty(element, "inert", true);
	return chain(...getAllTabbableIn(element, true).map((element) => {
		if (ignoredElements?.some((el) => el && contains(el, element))) return noop;
		const restoreFocusMethod = orchestrate(element, "focus", () => {
			element.focus = noop;
			return () => {
				delete element.focus;
			};
		});
		return chain(setAttribute(element, "tabindex", "-1"), restoreFocusMethod);
	}), hideElementFromAccessibilityTree(element), assignStyle(element, {
		pointerEvents: "none",
		userSelect: "none",
		cursor: "default"
	}));
}
function disableTreeOutside(id, elements) {
	const cleanups = [];
	const ids = elements.map((el) => el?.id);
	walkTreeOutside(id, elements, (element) => {
		if (isBackdrop(element, ...ids)) return;
		if (isFocusTrap(element, ...ids)) return;
		cleanups.unshift(disableTree(element, elements));
	}, (element) => {
		if (!element.hasAttribute("role")) return;
		if (elements.some((el) => el && contains(el, element))) return;
		cleanups.unshift(setAttribute(element, "role", "none"));
	});
	const restoreTreeOutside = () => {
		for (const cleanup of cleanups) cleanup();
	};
	return restoreTreeOutside;
}
//#endregion
export { disableTree, disableTreeOutside };

//# sourceMappingURL=disable-tree.js.map