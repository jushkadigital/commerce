"use client";
import { isBackdrop } from "./is-backdrop.js";
import { setProperty } from "./orchestrate.js";
import { walkTreeOutside } from "./walk-tree-outside.js";
import { chain } from "@ariakit/utils";
//#region src/dialog/utils/mark-tree-outside.ts
function getPropertyName(id = "", ancestor = false) {
	return `__ariakit-dialog-${ancestor ? "ancestor" : "outside"}${id ? `-${id}` : ""}`;
}
function markElement(element, id = "") {
	return chain(setProperty(element, getPropertyName(), true), setProperty(element, getPropertyName(id), true));
}
function markAncestor(element, id = "") {
	return chain(setProperty(element, getPropertyName("", true), true), setProperty(element, getPropertyName(id, true), true));
}
function isElementMarked(element, id) {
	const ancestorProperty = getPropertyName(id, true);
	if (element[ancestorProperty]) return true;
	const elementProperty = getPropertyName(id);
	do {
		if (element[elementProperty]) return true;
		if (!element.parentElement) return false;
		element = element.parentElement;
	} while (true);
}
function markTreeOutside(id, elements) {
	const cleanups = [];
	const ids = elements.map((el) => el?.id);
	walkTreeOutside(id, elements, (element) => {
		if (isBackdrop(element, ...ids)) return;
		cleanups.unshift(markElement(element, id));
	}, (ancestor, element) => {
		if (element.hasAttribute("data-dialog") && element.id !== id) return;
		cleanups.unshift(markAncestor(ancestor, id));
	});
	const restoreAccessibilityTree = () => {
		for (const cleanup of cleanups) cleanup();
	};
	return restoreAccessibilityTree;
}
//#endregion
export { isElementMarked, markAncestor, markElement, markTreeOutside };

//# sourceMappingURL=mark-tree-outside.js.map