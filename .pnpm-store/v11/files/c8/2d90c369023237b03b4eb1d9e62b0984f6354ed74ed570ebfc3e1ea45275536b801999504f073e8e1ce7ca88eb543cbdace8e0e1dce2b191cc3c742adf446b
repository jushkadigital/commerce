"use strict";Object.defineProperty(exports, "__esModule", {value: true});







var _2WBRQ3I7cjs = require('./2WBRQ3I7.cjs');



var _42GL4LKIcjs = require('./42GL4LKI.cjs');







var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');


var _BTARPES4cjs = require('./BTARPES4.cjs');






















var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/composite/composite.js
var _react = require('react');
var _jsxruntime = require('react/jsx-runtime');
var TagName = "div";
function isGrid(items) {
  return items.some((item) => !!item.rowId);
}
function isPrintableKey(event) {
  const target = event.target;
  if (target && !_JBOLBTVUcjs.isTextField.call(void 0, target)) return false;
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey;
}
function isModifierKey(event) {
  return event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta";
}
function useKeyboardEventProxy(store, onKeyboardEvent, previousElementRef) {
  return _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    var _a;
    onKeyboardEvent == null ? void 0 : onKeyboardEvent(event);
    if (event.defaultPrevented) return;
    if (event.isPropagationStopped()) return;
    if (!_JBOLBTVUcjs.isSelfTarget.call(void 0, event)) return;
    if (isModifierKey(event)) return;
    if (isPrintableKey(event)) return;
    const activeElement = (_a = _2WBRQ3I7cjs.getEnabledItem.call(void 0, store, store.getState().activeId)) == null ? void 0 : _a.element;
    if (!activeElement) return;
    const { view, ...eventInit } = event;
    if (activeElement !== (previousElementRef == null ? void 0 : previousElementRef.current)) activeElement.focus();
    if (!_JBOLBTVUcjs.fireKeyboardEvent.call(void 0, activeElement, event.type, eventInit)) event.preventDefault();
    if (event.currentTarget.contains(activeElement)) event.stopPropagation();
  });
}
function findFirstEnabledItemInTheLastRow(items) {
  return _2WBRQ3I7cjs.findFirstEnabledItem.call(void 0, _JBOLBTVUcjs.flatten2DArray.call(void 0, _JBOLBTVUcjs.reverseArray.call(void 0, _2WBRQ3I7cjs.groupItemsByRows.call(void 0, items))));
}
function withBaseScrollPreserved(store, callback) {
  const { virtualFocus, baseElement } = store.getState();
  if (!virtualFocus || !baseElement || !_JBOLBTVUcjs.isTextField.call(void 0, baseElement)) {
    callback();
    return;
  }
  const savedScrollLeft = baseElement.scrollLeft;
  const savedScrollTop = baseElement.scrollTop;
  callback();
  baseElement.scrollLeft = savedScrollLeft;
  baseElement.scrollTop = savedScrollTop;
}
function useScheduleFocus(store) {
  const [scheduled, setScheduled] = _react.useState.call(void 0, false);
  const schedule = _react.useCallback.call(void 0, () => setScheduled(true), []);
  const activeItem = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => _2WBRQ3I7cjs.getEnabledItem.call(void 0, store, state.activeId));
  _react.useEffect.call(void 0, () => {
    const activeElement = activeItem == null ? void 0 : activeItem.element;
    if (!scheduled) return;
    if (!activeElement) return;
    setScheduled(false);
    withBaseScrollPreserved(store, () => {
      activeElement.focus({ preventScroll: true });
    });
  }, [
    store,
    activeItem,
    scheduled
  ]);
  return schedule;
}
var useComposite = _JBOLBTVUcjs.createHook.call(void 0, function useComposite2({ store, composite = true, focusOnMove = composite, moveOnKeyPress = true, ...props }) {
  const context = _2WBRQ3I7cjs.useCompositeProviderContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "Composite must receive a `store` prop or be wrapped in a CompositeProvider component.");
  const ref = _react.useRef.call(void 0, null);
  const previousElementRef = _react.useRef.call(void 0, null);
  const scheduleFocus = useScheduleFocus(store);
  const moves = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "moves");
  const [, setBaseElement] = _JBOLBTVUcjs.useTransactionState.call(void 0, composite ? store.setBaseElement : null);
  _react.useEffect.call(void 0, () => {
    var _a;
    if (!store) return;
    if (!moves) return;
    if (!composite) return;
    if (!focusOnMove) return;
    const { activeId: activeId2 } = store.getState();
    const itemElement = (_a = _2WBRQ3I7cjs.getEnabledItem.call(void 0, store, activeId2)) == null ? void 0 : _a.element;
    if (!itemElement) return;
    withBaseScrollPreserved(store, () => _JBOLBTVUcjs.focusIntoView.call(void 0, itemElement));
  }, [
    store,
    moves,
    composite,
    focusOnMove
  ]);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    if (!store) return;
    if (!moves) return;
    if (!composite) return;
    const { baseElement, activeId: activeId2 } = store.getState();
    if (!(activeId2 === null)) return;
    if (!baseElement) return;
    const previousElement = previousElementRef.current;
    previousElementRef.current = null;
    if (previousElement) _JBOLBTVUcjs.fireBlurEvent.call(void 0, previousElement, { relatedTarget: baseElement });
    if (!_JBOLBTVUcjs.hasFocus.call(void 0, baseElement)) baseElement.focus();
  }, [
    store,
    moves,
    composite
  ]);
  const activeId = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "activeId");
  const virtualFocus = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "virtualFocus");
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    var _a;
    if (!store) return;
    if (!composite) return;
    if (!virtualFocus) return;
    const previousElement = previousElementRef.current;
    previousElementRef.current = null;
    if (!previousElement) return;
    const relatedTarget = ((_a = _2WBRQ3I7cjs.getEnabledItem.call(void 0, store, activeId)) == null ? void 0 : _a.element) || _JBOLBTVUcjs.getActiveElement.call(void 0, previousElement);
    if (relatedTarget === previousElement) return;
    _JBOLBTVUcjs.fireBlurEvent.call(void 0, previousElement, { relatedTarget });
  }, [
    store,
    activeId,
    virtualFocus,
    composite
  ]);
  const onKeyDownCapture = useKeyboardEventProxy(store, props.onKeyDownCapture, previousElementRef);
  const onKeyUpCapture = useKeyboardEventProxy(store, props.onKeyUpCapture, previousElementRef);
  const onFocusCaptureProp = props.onFocusCapture;
  const onFocusCapture = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onFocusCaptureProp == null ? void 0 : onFocusCaptureProp(event);
    if (event.defaultPrevented) return;
    if (!store) return;
    const { virtualFocus: virtualFocus2 } = store.getState();
    if (!virtualFocus2) return;
    const previousActiveElement = event.relatedTarget;
    const isSilentlyFocused = _2WBRQ3I7cjs.silentlyFocused.call(void 0, event.currentTarget);
    if (_JBOLBTVUcjs.isSelfTarget.call(void 0, event) && isSilentlyFocused) {
      event.stopPropagation();
      previousElementRef.current = previousActiveElement;
    }
  });
  const onFocusProp = props.onFocus;
  const onFocus = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onFocusProp == null ? void 0 : onFocusProp(event);
    if (event.defaultPrevented) return;
    if (!composite) return;
    if (!store) return;
    const { relatedTarget } = event;
    const { virtualFocus: virtualFocus2 } = store.getState();
    if (virtualFocus2) {
      if (_JBOLBTVUcjs.isSelfTarget.call(void 0, event) && !_2WBRQ3I7cjs.isItem.call(void 0, store, relatedTarget)) queueMicrotask(scheduleFocus);
    } else if (_JBOLBTVUcjs.isSelfTarget.call(void 0, event)) store.setActiveId(null);
  });
  const onBlurCaptureProp = props.onBlurCapture;
  const onBlurCapture = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    var _a;
    onBlurCaptureProp == null ? void 0 : onBlurCaptureProp(event);
    if (event.defaultPrevented) return;
    if (!store) return;
    const { virtualFocus: virtualFocus2, activeId: activeId2 } = store.getState();
    if (!virtualFocus2) return;
    const activeElement = (_a = _2WBRQ3I7cjs.getEnabledItem.call(void 0, store, activeId2)) == null ? void 0 : _a.element;
    const nextActiveElement = event.relatedTarget;
    const nextActiveElementIsItem = _2WBRQ3I7cjs.isItem.call(void 0, store, nextActiveElement);
    const previousElement = previousElementRef.current;
    previousElementRef.current = null;
    if (_JBOLBTVUcjs.isSelfTarget.call(void 0, event) && nextActiveElementIsItem) {
      if (nextActiveElement === activeElement) {
        if (previousElement && previousElement !== nextActiveElement) _JBOLBTVUcjs.fireBlurEvent.call(void 0, previousElement, event);
      } else if (activeElement) _JBOLBTVUcjs.fireBlurEvent.call(void 0, activeElement, event);
      else if (previousElement) _JBOLBTVUcjs.fireBlurEvent.call(void 0, previousElement, event);
      event.stopPropagation();
    } else if (!_2WBRQ3I7cjs.isItem.call(void 0, store, event.target) && activeElement) _JBOLBTVUcjs.fireBlurEvent.call(void 0, activeElement, event);
  });
  const onKeyDownProp = props.onKeyDown;
  const moveOnKeyPressProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, moveOnKeyPress);
  const onKeyDown = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    var _a, _b;
    onKeyDownProp == null ? void 0 : onKeyDownProp(event);
    if (event.nativeEvent.isComposing) return;
    if (event.defaultPrevented) return;
    if (!store) return;
    if (!_JBOLBTVUcjs.isSelfTarget.call(void 0, event)) return;
    const { orientation, renderedItems, activeId: activeId2 } = store.getState();
    if ((_b = (_a = _2WBRQ3I7cjs.getEnabledItem.call(void 0, store, activeId2)) == null ? void 0 : _a.element) == null ? void 0 : _b.isConnected) return;
    const isVertical = orientation !== "horizontal";
    const isHorizontal = orientation !== "vertical";
    const grid = isGrid(renderedItems);
    if ((event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") && _JBOLBTVUcjs.isTextField.call(void 0, event.currentTarget)) return;
    const up = () => {
      var _a2;
      if (grid) return (_a2 = findFirstEnabledItemInTheLastRow(renderedItems)) == null ? void 0 : _a2.id;
      return store == null ? void 0 : store.last();
    };
    const action = {
      ArrowUp: (grid || isVertical) && up,
      ArrowRight: (grid || isHorizontal) && store.first,
      ArrowDown: (grid || isVertical) && store.first,
      ArrowLeft: (grid || isHorizontal) && store.last,
      Home: store.first,
      End: store.last,
      PageUp: store.first,
      PageDown: store.last
    }[event.key];
    if (action) {
      const id = action();
      if (id !== void 0) {
        if (!moveOnKeyPressProp(event)) return;
        event.preventDefault();
        store.move(id);
      }
    }
  });
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _2WBRQ3I7cjs.CompositeScopedContextProvider, {
    value: store,
    children: element
  }), [store]);
  props = {
    "aria-activedescendant": _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => {
      var _a;
      if (!store) return;
      if (!composite) return;
      if (!state.virtualFocus) return;
      return (_a = _2WBRQ3I7cjs.getEnabledItem.call(void 0, store, state.activeId)) == null ? void 0 : _a.id;
    }),
    ...props,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, setBaseElement, props.ref),
    onKeyDownCapture,
    onKeyUpCapture,
    onFocusCapture,
    onFocus,
    onBlurCapture,
    onKeyDown
  };
  props = _BTARPES4cjs.useFocusable.call(void 0, {
    focusable: _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => composite && (state.virtualFocus || state.activeId === null)),
    ...props
  });
  return props;
});
var Composite = _JBOLBTVUcjs.forwardRef.call(void 0, function Composite2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useComposite(props));
});

// ../ariakit-components/dist/composite/composite-store.js
var NULL_ITEM = { id: null };
function findFirstEnabledItem2(items, excludeId) {
  return items.find((item) => {
    if (excludeId) return !item.disabled && item.id !== excludeId;
    return !item.disabled;
  });
}
function getEnabledItems(items, excludeId) {
  return items.filter((item) => {
    if (excludeId) return !item.disabled && item.id !== excludeId;
    return !item.disabled;
  });
}
function getItemsInRow(items, rowId) {
  return items.filter((item) => item.rowId === rowId);
}
function flipItems(items, activeId, shouldInsertNullItem = false) {
  const index = items.findIndex((item) => item.id === activeId);
  return [
    ...items.slice(index + 1),
    ...shouldInsertNullItem ? [NULL_ITEM] : [],
    ...items.slice(0, index)
  ];
}
function groupItemsByRows2(items) {
  const rows = [];
  for (const item of items) {
    const row = rows.find((currentRow) => {
      var _a;
      return ((_a = currentRow[0]) == null ? void 0 : _a.rowId) === item.rowId;
    });
    if (row) row.push(item);
    else rows.push([item]);
  }
  return rows;
}
function getMaxRowLength(array) {
  let maxLength = 0;
  for (const { length } of array) if (length > maxLength) maxLength = length;
  return maxLength;
}
function createEmptyItem(rowId) {
  return {
    id: "__EMPTY_ITEM__",
    disabled: true,
    rowId
  };
}
function normalizeRows(rows, activeId, focusShift) {
  const maxLength = getMaxRowLength(rows);
  for (const row of rows) for (let i = 0; i < maxLength; i += 1) {
    const item = row[i];
    if (!item || focusShift && item.disabled) {
      const previousItem = i === 0 && focusShift ? findFirstEnabledItem2(row) : row[i - 1];
      row[i] = previousItem && activeId !== previousItem.id && focusShift ? previousItem : createEmptyItem(previousItem == null ? void 0 : previousItem.rowId);
    }
  }
  return rows;
}
function verticalizeItems(items) {
  const rows = groupItemsByRows2(items);
  const maxLength = getMaxRowLength(rows);
  const verticalized = [];
  for (let i = 0; i < maxLength; i += 1) for (const row of rows) {
    const item = row[i];
    if (item) verticalized.push({
      ...item,
      rowId: item.rowId ? `${i}` : void 0
    });
  }
  return verticalized;
}
function createCompositeStore(props = {}) {
  var _a, _b;
  const syncState = (_a = props.store) == null ? void 0 : _a.getState();
  const collection = _42GL4LKIcjs.createCollectionStore.call(void 0, props);
  const activeId = _JBOLBTVUcjs.defaultValue.call(void 0, props.activeId, syncState == null ? void 0 : syncState.activeId, props.defaultActiveId);
  const composite = _FHPV2Q7Ccjs.createStore.call(void 0, {
    ...collection.getState(),
    id: (_b = _JBOLBTVUcjs.defaultValue.call(void 0, props.id, syncState == null ? void 0 : syncState.id)) != null ? _b : `id-${Math.random().toString(36).slice(2, 8)}`,
    activeId,
    baseElement: _JBOLBTVUcjs.defaultValue.call(void 0, syncState == null ? void 0 : syncState.baseElement, null),
    includesBaseElement: _JBOLBTVUcjs.defaultValue.call(void 0, props.includesBaseElement, syncState == null ? void 0 : syncState.includesBaseElement, activeId === null),
    moves: _JBOLBTVUcjs.defaultValue.call(void 0, syncState == null ? void 0 : syncState.moves, 0),
    orientation: _JBOLBTVUcjs.defaultValue.call(void 0, props.orientation, syncState == null ? void 0 : syncState.orientation, "both"),
    rtl: _JBOLBTVUcjs.defaultValue.call(void 0, props.rtl, syncState == null ? void 0 : syncState.rtl, false),
    virtualFocus: _JBOLBTVUcjs.defaultValue.call(void 0, props.virtualFocus, syncState == null ? void 0 : syncState.virtualFocus, false),
    focusLoop: _JBOLBTVUcjs.defaultValue.call(void 0, props.focusLoop, syncState == null ? void 0 : syncState.focusLoop, false),
    focusWrap: _JBOLBTVUcjs.defaultValue.call(void 0, props.focusWrap, syncState == null ? void 0 : syncState.focusWrap, false),
    focusShift: _JBOLBTVUcjs.defaultValue.call(void 0, props.focusShift, syncState == null ? void 0 : syncState.focusShift, false)
  }, collection, props.store);
  _FHPV2Q7Ccjs.setup.call(void 0, composite, () => _FHPV2Q7Ccjs.sync.call(void 0, composite, ["renderedItems", "activeId"], (state) => {
    composite.setState("activeId", (activeId2) => {
      var _a2;
      if (activeId2 !== void 0) return activeId2;
      return (_a2 = findFirstEnabledItem2(state.renderedItems)) == null ? void 0 : _a2.id;
    });
  }));
  const getNextId = (direction = "next", options = {}) => {
    var _a2, _b2, _c, _d;
    const defaultState = composite.getState();
    const { skip = 0, activeId: activeId2 = defaultState.activeId, focusShift = defaultState.focusShift, focusLoop = defaultState.focusLoop, focusWrap = defaultState.focusWrap, includesBaseElement = defaultState.includesBaseElement, renderedItems = defaultState.renderedItems, rtl = defaultState.rtl } = options;
    const isVerticalDirection = direction === "up" || direction === "down";
    const isNextDirection = direction === "next" || direction === "down";
    const canReverse = isNextDirection ? rtl && !isVerticalDirection : !rtl || isVerticalDirection;
    const canShift = focusShift && !skip;
    let items = !isVerticalDirection ? renderedItems : _JBOLBTVUcjs.flatten2DArray.call(void 0, normalizeRows(groupItemsByRows2(renderedItems), activeId2, canShift));
    items = canReverse ? _JBOLBTVUcjs.reverseArray.call(void 0, items) : items;
    items = isVerticalDirection ? verticalizeItems(items) : items;
    if (activeId2 == null) return (_a2 = findFirstEnabledItem2(items)) == null ? void 0 : _a2.id;
    const activeItem = items.find((item) => item.id === activeId2);
    if (!activeItem) return (_b2 = findFirstEnabledItem2(items)) == null ? void 0 : _b2.id;
    const isGrid2 = items.some((item) => item.rowId);
    const activeIndex = items.indexOf(activeItem);
    const nextItems = items.slice(activeIndex + 1);
    const nextItemsInRow = getItemsInRow(nextItems, activeItem.rowId);
    if (skip) {
      const nextEnabledItemsInRow = getEnabledItems(nextItemsInRow, activeId2);
      return (_c = nextEnabledItemsInRow.slice(skip)[0] || nextEnabledItemsInRow[nextEnabledItemsInRow.length - 1]) == null ? void 0 : _c.id;
    }
    const canLoop = focusLoop && (isVerticalDirection ? focusLoop !== "horizontal" : focusLoop !== "vertical");
    const canWrap = isGrid2 && focusWrap && (isVerticalDirection ? focusWrap !== "horizontal" : focusWrap !== "vertical");
    const hasNullItem = isNextDirection ? (!isGrid2 || isVerticalDirection) && canLoop && includesBaseElement : isVerticalDirection ? includesBaseElement : false;
    if (canLoop) return (_d = findFirstEnabledItem2(flipItems(canWrap && !hasNullItem ? items : getItemsInRow(items, activeItem.rowId), activeId2, hasNullItem), activeId2)) == null ? void 0 : _d.id;
    if (canWrap) {
      const nextItem2 = findFirstEnabledItem2(hasNullItem ? nextItemsInRow : nextItems, activeId2);
      return hasNullItem ? (nextItem2 == null ? void 0 : nextItem2.id) || null : nextItem2 == null ? void 0 : nextItem2.id;
    }
    const nextItem = findFirstEnabledItem2(nextItemsInRow, activeId2);
    if (!nextItem && hasNullItem) return null;
    return nextItem == null ? void 0 : nextItem.id;
  };
  return {
    ...collection,
    ...composite,
    setBaseElement: (element) => composite.setState("baseElement", element),
    setActiveId: (id) => composite.setState("activeId", id),
    move: (id) => {
      if (id === void 0) return;
      composite.setState("activeId", id);
      composite.setState("moves", (moves) => moves + 1);
    },
    first: () => {
      var _a2;
      return (_a2 = findFirstEnabledItem2(composite.getState().renderedItems)) == null ? void 0 : _a2.id;
    },
    last: () => {
      var _a2;
      return (_a2 = findFirstEnabledItem2(_JBOLBTVUcjs.reverseArray.call(void 0, composite.getState().renderedItems))) == null ? void 0 : _a2.id;
    },
    next: (options) => {
      if (options !== void 0 && typeof options === "number") options = { skip: options };
      return getNextId("next", options);
    },
    previous: (options) => {
      if (options !== void 0 && typeof options === "number") options = { skip: options };
      return getNextId("previous", options);
    },
    down: (options) => {
      if (options !== void 0 && typeof options === "number") options = { skip: options };
      return getNextId("down", options);
    },
    up: (options) => {
      if (options !== void 0 && typeof options === "number") options = { skip: options };
      return getNextId("up", options);
    }
  };
}

// ../ariakit-react-components/dist/composite/composite-store.js
function useCompositeStoreOptions(props) {
  return {
    id: _JBOLBTVUcjs.useId.call(void 0, props.id),
    ...props
  };
}
function useCompositeStoreProps(store, update, props) {
  store = _42GL4LKIcjs.useCollectionStoreProps.call(void 0, store, update, props);
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "activeId", "setActiveId");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "includesBaseElement");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "virtualFocus");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "orientation");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "rtl");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "focusLoop");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "focusWrap");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "focusShift");
  return store;
}
function useCompositeStore(props = {}) {
  props = useCompositeStoreOptions(props);
  const [store, update] = _FHPV2Q7Ccjs.useStore.call(void 0, createCompositeStore, props);
  return useCompositeStoreProps(store, update, props);
}








exports.useComposite = useComposite; exports.Composite = Composite; exports.createCompositeStore = createCompositeStore; exports.useCompositeStoreOptions = useCompositeStoreOptions; exports.useCompositeStoreProps = useCompositeStoreProps; exports.useCompositeStore = useCompositeStore;
