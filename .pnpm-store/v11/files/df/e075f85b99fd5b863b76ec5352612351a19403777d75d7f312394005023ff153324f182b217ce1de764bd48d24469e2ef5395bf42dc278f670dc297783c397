import { r as CompositeStoreItem, t as CompositeStore } from "../composite-store-DyJc-XRA.js";

//#region src/composite/utils.d.ts
/**
 * Moves all the items before the passed `id` to the end of the array. This is
 * useful when we want to loop through the items in the same row or column as
 * the first items will be placed after the last items.
 *
 * The null item that's inserted when `shouldInsertNullItem` is set to `true`
 * represents the composite container itself. When the active item is null, the
 * composite container has focus.
 */
declare function flipItems(items: CompositeStoreItem[], activeId: string, shouldInsertNullItem?: boolean): {
  id: string;
}[];
/**
 * Finds the first enabled item.
 */
declare function findFirstEnabledItem(items: CompositeStoreItem[], excludeId?: string): CompositeStoreItem | undefined;
/**
 * Finds the first enabled item by its id.
 */
declare function getEnabledItem(store: CompositeStore, id?: string | null): CompositeStoreItem | null;
/**
 * Creates a two-dimensional array with items grouped by their rowId's.
 */
declare function groupItemsByRows(items: CompositeStoreItem[]): CompositeStoreItem[][];
/**
 * Selects text field contents even if it's a content editable element.
 */
declare function selectTextField(element: HTMLElement, collapseToEnd?: boolean): void;
declare const FOCUS_SILENTLY: unique symbol;
type FocusSilentlyElement = HTMLElement & {
  [FOCUS_SILENTLY]?: boolean;
};
/**
 * Focus an element with a flag. The `silentlyFocused` function needs to be
 * called later to check if the focus was silenced and to reset this state.
 */
declare function focusSilently(element: FocusSilentlyElement): void;
/**
 * Checks whether the element has been focused with the `focusSilently` function
 * and resets the state.
 */
declare function silentlyFocused(element: FocusSilentlyElement): boolean | undefined;
/**
 * Determines whether the element is a composite item.
 */
declare function isItem(store: CompositeStore, element?: Element | null, exclude?: Element): boolean;
//#endregion
export { findFirstEnabledItem, flipItems, focusSilently, getEnabledItem, groupItemsByRows, isItem, selectTextField, silentlyFocused };
//# sourceMappingURL=utils.d.ts.map