"use strict";Object.defineProperty(exports, "__esModule", {value: true});


var _2WBRQ3I7cjs = require('./2WBRQ3I7.cjs');












var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/composite/composite-typeahead.js
var _react = require('react');
var TagName = "div";
var chars = "";
function clearChars() {
  chars = "";
}
function isValidTypeaheadEvent(event) {
  const target = event.target;
  if (target && _JBOLBTVUcjs.isTextField.call(void 0, target)) return false;
  if (event.key === " " && chars.length) return true;
  return event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey && /^[\p{Letter}\p{Number}]$/u.test(event.key);
}
function isSelfTargetOrItem(event, items) {
  if (_JBOLBTVUcjs.isSelfTarget.call(void 0, event)) return true;
  const target = event.target;
  if (!target) return false;
  return items.some((item) => item.element === target);
}
function getEnabledItems(items) {
  return items.filter((item) => !item.disabled);
}
function itemTextStartsWith(item, text) {
  var _a;
  const itemText = ((_a = item.element) == null ? void 0 : _a.textContent) || item.children || "value" in item && item.value;
  if (!itemText) return false;
  return _JBOLBTVUcjs.normalizeString.call(void 0, itemText).trim().toLowerCase().startsWith(text.toLowerCase());
}
function getSameInitialItems(items, char, activeId) {
  if (!activeId) return items;
  const activeItem = items.find((item) => item.id === activeId);
  if (!activeItem) return items;
  if (!itemTextStartsWith(activeItem, char)) return items;
  if (chars !== char && itemTextStartsWith(activeItem, chars)) return items;
  chars = char;
  return _2WBRQ3I7cjs.flipItems.call(void 0, items.filter((item) => itemTextStartsWith(item, chars)), activeId).filter((item) => item.id !== activeId);
}
var useCompositeTypeahead = _JBOLBTVUcjs.createHook.call(void 0, function useCompositeTypeahead2({ store, typeahead = true, ...props }) {
  const context = _2WBRQ3I7cjs.useCompositeScopedContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "CompositeTypeahead must be a Composite component");
  const onKeyDownCaptureProp = props.onKeyDownCapture;
  const cleanupTimeoutRef = _react.useRef.call(void 0, 0);
  const onKeyDownCapture = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onKeyDownCaptureProp == null ? void 0 : onKeyDownCaptureProp(event);
    if (event.defaultPrevented) return;
    if (!typeahead) return;
    if (!store) return;
    if (!isValidTypeaheadEvent(event)) return clearChars();
    const { renderedItems, items, activeId, id } = store.getState();
    let enabledItems = getEnabledItems(items.length > renderedItems.length ? items : renderedItems);
    const document = _JBOLBTVUcjs.getDocument.call(void 0, event.currentTarget);
    const selector = `[data-offscreen-id="${id}"]`;
    const offscreenItems = document.querySelectorAll(selector);
    for (const element of offscreenItems) {
      const disabled = element.ariaDisabled === "true" || "disabled" in element && !!element.disabled;
      enabledItems.push({
        id: element.id,
        element,
        disabled
      });
    }
    if (offscreenItems.length) enabledItems = _JBOLBTVUcjs.sortBasedOnDOMPosition.call(void 0, enabledItems, (i) => i.element);
    if (!isSelfTargetOrItem(event, enabledItems)) return clearChars();
    event.preventDefault();
    window.clearTimeout(cleanupTimeoutRef.current);
    cleanupTimeoutRef.current = window.setTimeout(() => {
      chars = "";
    }, 500);
    const char = event.key.toLowerCase();
    chars += char;
    enabledItems = getSameInitialItems(enabledItems, char, activeId);
    const item = enabledItems.find((item2) => itemTextStartsWith(item2, chars));
    if (item) store.move(item.id);
    else clearChars();
  });
  props = {
    ...props,
    onKeyDownCapture
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var CompositeTypeahead = _JBOLBTVUcjs.forwardRef.call(void 0, function CompositeTypeahead2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useCompositeTypeahead(props));
});




exports.useCompositeTypeahead = useCompositeTypeahead; exports.CompositeTypeahead = CompositeTypeahead;
