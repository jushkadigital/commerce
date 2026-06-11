"use client";
import { getDocument, isTextField } from "@ariakit/utils";
//#region src/composite/utils.ts
const NULL_ITEM = { id: null };
/**
* Moves all the items before the passed `id` to the end of the array. This is
* useful when we want to loop through the items in the same row or column as
* the first items will be placed after the last items.
*
* The null item that's inserted when `shouldInsertNullItem` is set to `true`
* represents the composite container itself. When the active item is null, the
* composite container has focus.
*/
function flipItems(items, activeId, shouldInsertNullItem = false) {
	const index = items.findIndex((item) => item.id === activeId);
	return [
		...items.slice(index + 1),
		...shouldInsertNullItem ? [NULL_ITEM] : [],
		...items.slice(0, index)
	];
}
/**
* Finds the first enabled item.
*/
function findFirstEnabledItem(items, excludeId) {
	return items.find((item) => {
		if (excludeId) return !item.disabled && item.id !== excludeId;
		return !item.disabled;
	});
}
/**
* Finds the first enabled item by its id.
*/
function getEnabledItem(store, id) {
	if (!id) return null;
	return store.item(id) || null;
}
/**
* Creates a two-dimensional array with items grouped by their rowId's.
*/
function groupItemsByRows(items) {
	const rows = [];
	for (const item of items) {
		const row = rows.find((currentRow) => currentRow[0]?.rowId === item.rowId);
		if (row) row.push(item);
		else rows.push([item]);
	}
	return rows;
}
/**
* Selects text field contents even if it's a content editable element.
*/
function selectTextField(element, collapseToEnd = false) {
	if (isTextField(element)) element.setSelectionRange(collapseToEnd ? element.value.length : 0, element.value.length);
	else if (element.isContentEditable) {
		const selection = getDocument(element).getSelection();
		selection?.selectAllChildren(element);
		if (collapseToEnd) selection?.collapseToEnd();
	}
}
const FOCUS_SILENTLY = Symbol("FOCUS_SILENTLY");
/**
* Focus an element with a flag. The `silentlyFocused` function needs to be
* called later to check if the focus was silenced and to reset this state.
*/
function focusSilently(element) {
	element[FOCUS_SILENTLY] = true;
	element.focus({ preventScroll: true });
}
/**
* Checks whether the element has been focused with the `focusSilently` function
* and resets the state.
*/
function silentlyFocused(element) {
	const isSilentlyFocused = element[FOCUS_SILENTLY];
	delete element[FOCUS_SILENTLY];
	return isSilentlyFocused;
}
/**
* Determines whether the element is a composite item.
*/
function isItem(store, element, exclude) {
	if (!element) return false;
	if (element === exclude) return false;
	const item = store.item(element.id);
	if (!item) return false;
	if (exclude && item.element === exclude) return false;
	return true;
}
//#endregion
export { findFirstEnabledItem, flipItems, focusSilently, getEnabledItem, groupItemsByRows, isItem, selectTextField, silentlyFocused };

//# sourceMappingURL=utils.js.map