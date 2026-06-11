"use strict";Object.defineProperty(exports, "__esModule", {value: true});







var _2WBRQ3I7cjs = require('./2WBRQ3I7.cjs');


var _VUISVT3Vcjs = require('./VUISVT3V.cjs');


var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');


var _TMY4OIYCcjs = require('./TMY4OIYC.cjs');





















var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/composite/composite-item.js
var _react = require('react');
var _jsxruntime = require('react/jsx-runtime');
var TagName = "button";
function isEditableElement(element) {
  if (_JBOLBTVUcjs.isTextbox.call(void 0, element)) return true;
  return element.tagName === "INPUT" && !_JBOLBTVUcjs.isButton.call(void 0, element);
}
function getNextPageOffset(scrollingElement, pageUp = false) {
  const height = scrollingElement.clientHeight;
  const { top } = scrollingElement.getBoundingClientRect();
  const pageSize = Math.max(height * 0.875, height - 40) * 1.5;
  const pageOffset = pageUp ? height - pageSize + top : pageSize + top;
  if (scrollingElement.tagName === "HTML") return pageOffset + scrollingElement.scrollTop;
  return pageOffset;
}
function getItemOffset(itemElement, pageUp = false) {
  const { top } = itemElement.getBoundingClientRect();
  if (pageUp) return top + itemElement.clientHeight;
  return top;
}
function findNextPageItemId(element, store, next, pageUp = false) {
  var _a;
  if (!store) return;
  if (!next) return;
  const { renderedItems } = store.getState();
  const scrollingElement = _JBOLBTVUcjs.getScrollingElement.call(void 0, element);
  if (!scrollingElement) return;
  const nextPageOffset = getNextPageOffset(scrollingElement, pageUp);
  let id;
  let prevDifference;
  for (let i = 0; i < renderedItems.length; i += 1) {
    const previousId = id;
    id = next(i);
    if (!id) break;
    if (id === previousId) continue;
    const itemElement = (_a = _2WBRQ3I7cjs.getEnabledItem.call(void 0, store, id)) == null ? void 0 : _a.element;
    if (!itemElement) continue;
    const difference = getItemOffset(itemElement, pageUp) - nextPageOffset;
    const absDifference = Math.abs(difference);
    if (pageUp && difference <= 0 || !pageUp && difference >= 0) {
      if (prevDifference !== void 0 && prevDifference < absDifference) id = previousId;
      break;
    }
    prevDifference = absDifference;
  }
  return id;
}
function targetIsAnotherItem(event, store) {
  if (_JBOLBTVUcjs.isSelfTarget.call(void 0, event)) return false;
  return _2WBRQ3I7cjs.isItem.call(void 0, store, event.target);
}
var useCompositeItem = _JBOLBTVUcjs.createHook.call(void 0, function useCompositeItem2({ store, rowId: rowIdProp, preventScrollOnKeyDown = false, moveOnKeyPress = true, tabbable = false, getItem: getItemProp, "aria-setsize": ariaSetSizeProp, "aria-posinset": ariaPosInSetProp, ...props }) {
  const context = _2WBRQ3I7cjs.useCompositeScopedContext.call(void 0, );
  store = store || context;
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const ref = _react.useRef.call(void 0, null);
  const row = _react.useContext.call(void 0, _2WBRQ3I7cjs.CompositeRowContext);
  const trulyDisabled = _JBOLBTVUcjs.disabledFromProps.call(void 0, props) && !props.accessibleWhenDisabled;
  const { rowId, baseElement, isActiveItem, ariaSetSize, ariaPosInSet, isTabbable } = _FHPV2Q7Ccjs.useStoreStateObject.call(void 0, store, {
    rowId(state) {
      if (rowIdProp) return rowIdProp;
      if (!state) return;
      if (!(row == null ? void 0 : row.baseElement)) return;
      if (row.baseElement !== state.baseElement) return;
      return row.id;
    },
    baseElement(state) {
      return (state == null ? void 0 : state.baseElement) || void 0;
    },
    isActiveItem(state) {
      return !!state && state.activeId === id;
    },
    ariaSetSize(state) {
      if (ariaSetSizeProp != null) return ariaSetSizeProp;
      if (!state) return;
      if (!(row == null ? void 0 : row.ariaSetSize)) return;
      if (row.baseElement !== state.baseElement) return;
      return row.ariaSetSize;
    },
    ariaPosInSet(state) {
      if (ariaPosInSetProp != null) return ariaPosInSetProp;
      if (!state) return;
      if (!(row == null ? void 0 : row.ariaPosInSet)) return;
      if (row.baseElement !== state.baseElement) return;
      const itemsInRow = state.renderedItems.filter((item) => item.rowId === rowId);
      return row.ariaPosInSet + itemsInRow.findIndex((item) => item.id === id);
    },
    isTabbable(state) {
      if (!(state == null ? void 0 : state.renderedItems.length)) return true;
      if (state.virtualFocus) return false;
      if (tabbable) return true;
      if (state.activeId === null) return false;
      const item = store == null ? void 0 : store.item(state.activeId);
      if (item == null ? void 0 : item.disabled) return true;
      if (!(item == null ? void 0 : item.element)) return true;
      return state.activeId === id;
    }
  });
  const getItem = _react.useCallback.call(void 0, (item) => {
    var _a;
    const nextItem = {
      ...item,
      id: id || item.id,
      rowId,
      disabled: trulyDisabled,
      children: (_a = item.element) == null ? void 0 : _a.textContent
    };
    if (getItemProp) return getItemProp(nextItem);
    return nextItem;
  }, [
    id,
    rowId,
    trulyDisabled,
    getItemProp
  ]);
  const onFocusProp = props.onFocus;
  const hasFocusedComposite = _react.useRef.call(void 0, false);
  const onFocus = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onFocusProp == null ? void 0 : onFocusProp(event);
    if (event.defaultPrevented) return;
    if (_JBOLBTVUcjs.isPortalEvent.call(void 0, event)) return;
    if (!id) return;
    if (!store) return;
    if (targetIsAnotherItem(event, store)) return;
    const { virtualFocus, baseElement: baseElement2 } = store.getState();
    store.setActiveId(id);
    if (_JBOLBTVUcjs.isTextbox.call(void 0, event.currentTarget)) _2WBRQ3I7cjs.selectTextField.call(void 0, event.currentTarget);
    if (!virtualFocus) return;
    if (!_JBOLBTVUcjs.isSelfTarget.call(void 0, event)) return;
    if (isEditableElement(event.currentTarget)) return;
    if (!(baseElement2 == null ? void 0 : baseElement2.isConnected)) return;
    if (_JBOLBTVUcjs.isSafari.call(void 0, ) && event.currentTarget.hasAttribute("data-autofocus")) event.currentTarget.scrollIntoView({
      block: "nearest",
      inline: "nearest"
    });
    hasFocusedComposite.current = true;
    if (event.relatedTarget === baseElement2 || _2WBRQ3I7cjs.isItem.call(void 0, store, event.relatedTarget)) _2WBRQ3I7cjs.focusSilently.call(void 0, baseElement2);
    else baseElement2.focus();
  });
  const onBlurCaptureProp = props.onBlurCapture;
  const onBlurCapture = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    var _a;
    onBlurCaptureProp == null ? void 0 : onBlurCaptureProp(event);
    if (event.defaultPrevented) return;
    if (((_a = store == null ? void 0 : store.getState()) == null ? void 0 : _a.virtualFocus) && hasFocusedComposite.current) {
      hasFocusedComposite.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  });
  const onKeyDownProp = props.onKeyDown;
  const preventScrollOnKeyDownProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, preventScrollOnKeyDown);
  const moveOnKeyPressProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, moveOnKeyPress);
  const onKeyDown = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    var _a;
    onKeyDownProp == null ? void 0 : onKeyDownProp(event);
    if (event.defaultPrevented) return;
    if (!_JBOLBTVUcjs.isSelfTarget.call(void 0, event)) return;
    if (!store) return;
    const { currentTarget } = event;
    const state = store.getState();
    const isGrid = !!((_a = store.item(id)) == null ? void 0 : _a.rowId);
    const isVertical = state.orientation !== "horizontal";
    const isHorizontal = state.orientation !== "vertical";
    const canHomeEnd = () => {
      if (isGrid) return true;
      if (isHorizontal) return true;
      if (!state.baseElement) return true;
      if (!_JBOLBTVUcjs.isTextField.call(void 0, state.baseElement)) return true;
      return false;
    };
    const action = {
      ArrowUp: (isGrid || isVertical) && store.up,
      ArrowRight: (isGrid || isHorizontal) && store.next,
      ArrowDown: (isGrid || isVertical) && store.down,
      ArrowLeft: (isGrid || isHorizontal) && store.previous,
      Home: () => {
        if (!canHomeEnd()) return;
        if (!isGrid || event.ctrlKey) return store == null ? void 0 : store.first();
        return store == null ? void 0 : store.previous(-1);
      },
      End: () => {
        if (!canHomeEnd()) return;
        if (!isGrid || event.ctrlKey) return store == null ? void 0 : store.last();
        return store == null ? void 0 : store.next(-1);
      },
      PageUp: () => {
        return findNextPageItemId(currentTarget, store, store == null ? void 0 : store.up, true);
      },
      PageDown: () => {
        return findNextPageItemId(currentTarget, store, store == null ? void 0 : store.down);
      }
    }[event.key];
    if (action) {
      if (_JBOLBTVUcjs.isTextbox.call(void 0, currentTarget)) {
        const selection = _JBOLBTVUcjs.getTextboxSelection.call(void 0, currentTarget);
        const isLeft = isHorizontal && event.key === "ArrowLeft";
        const isRight = isHorizontal && event.key === "ArrowRight";
        const isUp = isVertical && event.key === "ArrowUp";
        const isDown = isVertical && event.key === "ArrowDown";
        if (isRight || isDown) {
          const { length: valueLength } = _JBOLBTVUcjs.getTextboxValue.call(void 0, currentTarget);
          if (selection.end !== valueLength) return;
        } else if ((isLeft || isUp) && selection.start !== 0) return;
      }
      const nextId = action();
      if (preventScrollOnKeyDownProp(event) || nextId !== void 0) {
        if (!moveOnKeyPressProp(event)) return;
        event.preventDefault();
        store.move(nextId);
      }
    }
  });
  const providerValue = _react.useMemo.call(void 0, () => ({
    id,
    baseElement
  }), [id, baseElement]);
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _2WBRQ3I7cjs.CompositeItemContext.Provider, {
    value: providerValue,
    children: element
  }), [providerValue]);
  props = {
    "data-active-item": isActiveItem || void 0,
    ...props,
    id,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref),
    tabIndex: isTabbable ? props.tabIndex : -1,
    onFocus,
    onBlurCapture,
    onKeyDown
  };
  props = _TMY4OIYCcjs.useCommand.call(void 0, props);
  props = _VUISVT3Vcjs.useCollectionItem.call(void 0, {
    store,
    ...props,
    getItem,
    shouldRegisterItem: id ? props.shouldRegisterItem : false
  });
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, {
    ...props,
    "aria-setsize": ariaSetSize,
    "aria-posinset": ariaPosInSet
  });
});
var CompositeItem = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function CompositeItem2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useCompositeItem(props));
}));




exports.useCompositeItem = useCompositeItem; exports.CompositeItem = CompositeItem;
