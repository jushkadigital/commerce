"use strict";Object.defineProperty(exports, "__esModule", {value: true});








var _FNYFMCD7cjs = require('./FNYFMCD7.cjs');


var _GV4SR2CMcjs = require('./GV4SR2CM.cjs');




var _KFUU3G3Bcjs = require('./KFUU3G3B.cjs');


var _5QRVCRDIcjs = require('./5QRVCRDI.cjs');


var _G2JI2Z7Ucjs = require('./G2JI2Z7U.cjs');




var _JXYV7OWFcjs = require('./JXYV7OWF.cjs');


var _WLHP5OM6cjs = require('./WLHP5OM6.cjs');





var _US2XYAXEcjs = require('./US2XYAXE.cjs');


var _ZPWE3FTFcjs = require('./ZPWE3FTF.cjs');



var _2WBRQ3I7cjs = require('./2WBRQ3I7.cjs');


var _DVB2WSHDcjs = require('./DVB2WSHD.cjs');


var _QJQWEU4Qcjs = require('./QJQWEU4Q.cjs');


var _WYI5CKPVcjs = require('./WYI5CKPV.cjs');


var _P7AY4KL3cjs = require('./P7AY4KL3.cjs');












var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');





































var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/combobox/combobox.js
var _react = require('react');
var TagName = "input";
function isFirstItemAutoSelected(items, activeValue, autoSelect) {
  var _a;
  if (!autoSelect) return false;
  return ((_a = items.find((item) => !item.disabled && item.value)) == null ? void 0 : _a.value) === activeValue;
}
function hasCompletionString(value, activeValue) {
  if (!activeValue) return false;
  if (value == null) return false;
  value = _JBOLBTVUcjs.normalizeString.call(void 0, value);
  return activeValue.length > value.length && activeValue.toLowerCase().indexOf(value.toLowerCase()) === 0;
}
function isInputEvent(event) {
  return event.type === "input";
}
function isAriaAutoCompleteValue(value) {
  return value === "inline" || value === "list" || value === "both" || value === "none";
}
function getDefaultAutoSelectId(items) {
  var _a;
  return (_a = items.find((item) => {
    var _a2;
    if (item.disabled) return false;
    return ((_a2 = item.element) == null ? void 0 : _a2.getAttribute("role")) !== "tab";
  })) == null ? void 0 : _a.id;
}
var useCombobox = _JBOLBTVUcjs.createHook.call(void 0, function useCombobox2({ store, focusable = true, autoSelect: autoSelectProp = false, getAutoSelectId, setValueOnChange, showMinLength = 0, showOnChange, showOnMouseDown, showOnClick = showOnMouseDown, showOnKeyDown, showOnKeyPress = showOnKeyDown, blurActiveItemOnClick, setValueOnClick = true, moveOnKeyPress = true, autoComplete = "list", ...props }) {
  const context = _FNYFMCD7cjs.useComboboxProviderContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "Combobox must receive a `store` prop or be wrapped in a ComboboxProvider component.");
  const ref = _react.useRef.call(void 0, null);
  const [valueUpdated, forceValueUpdate] = _JBOLBTVUcjs.useForceUpdate.call(void 0, );
  const canAutoSelectRef = _react.useRef.call(void 0, false);
  const composingRef = _react.useRef.call(void 0, false);
  const autoSelect = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.virtualFocus && autoSelectProp);
  const inline = autoComplete === "inline" || autoComplete === "both";
  const [canInline, setCanInline] = _react.useState.call(void 0, inline);
  _JBOLBTVUcjs.useUpdateLayoutEffect.call(void 0, () => {
    if (!inline) return;
    setCanInline(true);
  }, [inline]);
  const storeValue = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "value");
  const prevSelectedValueRef = _react.useRef.call(void 0, void 0);
  _react.useEffect.call(void 0, () => {
    return _FHPV2Q7Ccjs.sync.call(void 0, store, ["selectedValue", "activeId"], (_, prev) => {
      prevSelectedValueRef.current = prev.selectedValue;
    });
  }, [store]);
  const inlineActiveValue = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => {
    var _a;
    if (!inline) return;
    if (!canInline) return;
    if (state.activeValue && Array.isArray(state.selectedValue)) {
      if (state.selectedValue.includes(state.activeValue)) return;
      if ((_a = prevSelectedValueRef.current) == null ? void 0 : _a.includes(state.activeValue)) return;
    }
    return state.activeValue;
  });
  const items = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "renderedItems");
  const open = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "open");
  const contentElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "contentElement");
  const value = _react.useMemo.call(void 0, () => {
    if (!inline) return storeValue;
    if (!canInline) return storeValue;
    if (isFirstItemAutoSelected(items, inlineActiveValue, autoSelect)) {
      if (hasCompletionString(storeValue, inlineActiveValue)) return storeValue + ((inlineActiveValue == null ? void 0 : inlineActiveValue.slice(storeValue.length)) || "");
      return storeValue;
    }
    return inlineActiveValue || storeValue;
  }, [
    inline,
    canInline,
    items,
    inlineActiveValue,
    autoSelect,
    storeValue
  ]);
  _react.useEffect.call(void 0, () => {
    const element = ref.current;
    if (!element) return;
    const onCompositeItemMove = () => setCanInline(true);
    element.addEventListener("combobox-item-move", onCompositeItemMove);
    return () => {
      element.removeEventListener("combobox-item-move", onCompositeItemMove);
    };
  }, []);
  _react.useEffect.call(void 0, () => {
    if (!inline) return;
    if (!canInline) return;
    if (!inlineActiveValue) return;
    if (!isFirstItemAutoSelected(items, inlineActiveValue, autoSelect)) return;
    if (!hasCompletionString(storeValue, inlineActiveValue)) return;
    let cleanup = _JBOLBTVUcjs.noop;
    queueMicrotask(() => {
      const element = ref.current;
      if (!element) return;
      const { start: prevStart, end: prevEnd } = _JBOLBTVUcjs.getTextboxSelection.call(void 0, element);
      const nextStart = storeValue.length;
      const nextEnd = inlineActiveValue.length;
      _JBOLBTVUcjs.setSelectionRange.call(void 0, element, nextStart, nextEnd);
      cleanup = () => {
        if (!_JBOLBTVUcjs.hasFocus.call(void 0, element)) return;
        const { start, end } = _JBOLBTVUcjs.getTextboxSelection.call(void 0, element);
        if (start !== nextStart) return;
        if (end !== nextEnd) return;
        _JBOLBTVUcjs.setSelectionRange.call(void 0, element, prevStart, prevEnd);
      };
    });
    return () => cleanup();
  }, [
    valueUpdated,
    inline,
    canInline,
    inlineActiveValue,
    items,
    autoSelect,
    storeValue
  ]);
  const scrollingElementRef = _react.useRef.call(void 0, null);
  const getAutoSelectIdProp = _JBOLBTVUcjs.useEvent.call(void 0, getAutoSelectId);
  const autoSelectIdRef = _react.useRef.call(void 0, null);
  const autoSelectMovedRef = _react.useRef.call(void 0, void 0);
  const userScrolledRef = _react.useRef.call(void 0, false);
  const isAutoScrollingRef = _react.useRef.call(void 0, false);
  _react.useEffect.call(void 0, () => {
    if (!open) return;
    if (!contentElement) return;
    const scrollingElement = _JBOLBTVUcjs.getScrollingElement.call(void 0, contentElement);
    if (!scrollingElement) return;
    scrollingElementRef.current = scrollingElement;
    const onUserScroll = () => {
      canAutoSelectRef.current = false;
      userScrolledRef.current = true;
    };
    const onScroll = () => {
      if (!isAutoScrollingRef.current) userScrolledRef.current = true;
      if (!store) return;
      if (!canAutoSelectRef.current) return;
      const { activeId } = store.getState();
      if (activeId === null) return;
      if (activeId === autoSelectIdRef.current) return;
      canAutoSelectRef.current = false;
    };
    const options = {
      passive: true,
      capture: true
    };
    scrollingElement.addEventListener("wheel", onUserScroll, options);
    scrollingElement.addEventListener("touchmove", onUserScroll, options);
    scrollingElement.addEventListener("scroll", onScroll, options);
    return () => {
      scrollingElement.removeEventListener("wheel", onUserScroll, true);
      scrollingElement.removeEventListener("touchmove", onUserScroll, true);
      scrollingElement.removeEventListener("scroll", onScroll, true);
    };
  }, [
    open,
    contentElement,
    store
  ]);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    userScrolledRef.current = false;
    if (!storeValue) return;
    if (composingRef.current) return;
    canAutoSelectRef.current = true;
  }, [storeValue]);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    if (autoSelect !== "always" && open) return;
    canAutoSelectRef.current = open;
  }, [autoSelect, open]);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    if (open) return;
    autoSelectMovedRef.current = void 0;
  }, [open]);
  const resetValueOnSelect = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "resetValueOnSelect");
  _JBOLBTVUcjs.useUpdateEffect.call(void 0, () => {
    var _a, _b, _c;
    const canAutoSelect = canAutoSelectRef.current;
    if (!store) return;
    if (!open) return;
    if (!canAutoSelect && (!resetValueOnSelect || userScrolledRef.current)) return;
    const { baseElement, contentElement: contentElement2, activeId } = store.getState();
    if (baseElement && !_JBOLBTVUcjs.hasFocus.call(void 0, baseElement)) return;
    if (contentElement2 == null ? void 0 : contentElement2.hasAttribute("data-placing")) {
      const observer = new MutationObserver(forceValueUpdate);
      observer.observe(contentElement2, { attributeFilter: ["data-placing"] });
      return () => observer.disconnect();
    }
    if (autoSelect && canAutoSelect) {
      const userAutoSelectId = getAutoSelectIdProp(items);
      const autoSelectId = userAutoSelectId !== void 0 ? userAutoSelectId : (_a = getDefaultAutoSelectId(items)) != null ? _a : store.first();
      autoSelectIdRef.current = autoSelectId;
      const nextActiveId = autoSelectId != null ? autoSelectId : null;
      const nextActiveValue = (_b = store.item(nextActiveId)) == null ? void 0 : _b.value;
      const moved = autoSelectMovedRef.current;
      if (nextActiveId !== activeId || (moved == null ? void 0 : moved.id) !== nextActiveId || (moved == null ? void 0 : moved.value) !== nextActiveValue) {
        autoSelectMovedRef.current = {
          id: nextActiveId,
          value: nextActiveValue
        };
        store.move(nextActiveId);
      } else store.setState("activeValue", nextActiveValue);
    } else {
      const element = (_c = store.item(activeId || store.first())) == null ? void 0 : _c.element;
      if (element && "scrollIntoView" in element) {
        isAutoScrollingRef.current = true;
        element.scrollIntoView({
          block: "nearest",
          inline: "nearest"
        });
        requestAnimationFrame(() => {
          isAutoScrollingRef.current = false;
        });
      }
    }
  }, [
    store,
    open,
    valueUpdated,
    storeValue,
    autoSelect,
    resetValueOnSelect,
    getAutoSelectIdProp,
    items
  ]);
  _react.useEffect.call(void 0, () => {
    if (!inline) return;
    const combobox = ref.current;
    if (!combobox) return;
    const elements = [combobox, contentElement].filter((value2) => !!value2);
    const onBlur2 = (event) => {
      if (elements.every((el) => _JBOLBTVUcjs.isFocusEventOutside.call(void 0, event, el))) store == null ? void 0 : store.setValue(value);
    };
    for (const element of elements) element.addEventListener("focusout", onBlur2);
    return () => {
      for (const element of elements) element.removeEventListener("focusout", onBlur2);
    };
  }, [
    inline,
    contentElement,
    store,
    value
  ]);
  const canShow = (event) => {
    return event.currentTarget.value.length >= showMinLength;
  };
  const onChangeProp = props.onChange;
  const showOnChangeProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, showOnChange != null ? showOnChange : canShow);
  const setValueOnChangeProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, setValueOnChange != null ? setValueOnChange : !store.tag);
  const onChange = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onChangeProp == null ? void 0 : onChangeProp(event);
    if (event.defaultPrevented) return;
    if (!store) return;
    const currentTarget = event.currentTarget;
    const { value: value2, selectionStart, selectionEnd } = currentTarget;
    const nativeEvent = event.nativeEvent;
    canAutoSelectRef.current = true;
    if (isInputEvent(nativeEvent)) {
      if (nativeEvent.isComposing) {
        canAutoSelectRef.current = false;
        composingRef.current = true;
      }
      if (inline) {
        const textInserted = nativeEvent.inputType === "insertText" || nativeEvent.inputType === "insertCompositionText";
        const caretAtEnd = selectionStart === value2.length;
        setCanInline(textInserted && caretAtEnd);
      }
    }
    if (setValueOnChangeProp(event)) {
      const isSameValue = value2 === store.getState().value;
      store.setValue(value2);
      queueMicrotask(() => {
        _JBOLBTVUcjs.setSelectionRange.call(void 0, currentTarget, selectionStart, selectionEnd);
      });
      if (inline && autoSelect && isSameValue) forceValueUpdate();
    }
    if (showOnChangeProp(event)) store.show();
    if (!autoSelect || !canAutoSelectRef.current) store.setActiveId(null);
  });
  const onCompositionEndProp = props.onCompositionEnd;
  const onCompositionEnd = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    canAutoSelectRef.current = true;
    composingRef.current = false;
    onCompositionEndProp == null ? void 0 : onCompositionEndProp(event);
    if (event.defaultPrevented) return;
    if (!autoSelect) return;
    forceValueUpdate();
  });
  const onMouseDownProp = props.onMouseDown;
  const blurActiveItemOnClickProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, blurActiveItemOnClick != null ? blurActiveItemOnClick : (() => store.getState().includesBaseElement));
  const setValueOnClickProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, setValueOnClick);
  const showOnClickProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, showOnClick != null ? showOnClick : canShow);
  const onMouseDown = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onMouseDownProp == null ? void 0 : onMouseDownProp(event);
    if (event.defaultPrevented) return;
    if (event.button) return;
    if (event.ctrlKey) return;
    if (!store) return;
    if (blurActiveItemOnClickProp(event)) store.setActiveId(null);
    if (setValueOnClickProp(event)) store.setValue(value);
    if (showOnClickProp(event)) _JBOLBTVUcjs.queueBeforeEvent.call(void 0, event.currentTarget, "mouseup", store.show);
  });
  const onKeyDownProp = props.onKeyDown;
  const showOnKeyPressProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, showOnKeyPress != null ? showOnKeyPress : canShow);
  const onKeyDown = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onKeyDownProp == null ? void 0 : onKeyDownProp(event);
    if (!event.repeat) canAutoSelectRef.current = false;
    if (event.defaultPrevented) return;
    if (!store) return;
    const { open: open2 } = store.getState();
    if (open2 && event.key === "Enter") {
      event.preventDefault();
      return;
    }
    if (event.ctrlKey) return;
    if (event.altKey) return;
    if (event.shiftKey) return;
    if (event.metaKey) return;
    if (open2) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      if (showOnKeyPressProp(event)) {
        event.preventDefault();
        store.show();
      }
    }
  });
  const onBlurProp = props.onBlur;
  const onBlur = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    canAutoSelectRef.current = false;
    onBlurProp == null ? void 0 : onBlurProp(event);
    if (event.defaultPrevented) return;
  });
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const ariaAutoComplete = isAriaAutoCompleteValue(autoComplete) ? autoComplete : void 0;
  const isActiveItem = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.activeId === null);
  props = {
    role: "combobox",
    "aria-autocomplete": ariaAutoComplete,
    "aria-haspopup": _JBOLBTVUcjs.getPopupRole.call(void 0, contentElement, "listbox"),
    "aria-expanded": open,
    "aria-controls": contentElement == null ? void 0 : contentElement.id,
    "data-active-item": isActiveItem || void 0,
    value,
    ...props,
    id,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref),
    onChange,
    onCompositionEnd,
    onMouseDown,
    onKeyDown,
    onBlur
  };
  props = _US2XYAXEcjs.useComposite.call(void 0, {
    store,
    focusable,
    ...props,
    moveOnKeyPress: (event) => {
      if (_JBOLBTVUcjs.isFalsyBooleanCallback.call(void 0, moveOnKeyPress, event)) return false;
      if (inline) setCanInline(true);
      return true;
    }
  });
  props = _GV4SR2CMcjs.usePopoverAnchor.call(void 0, {
    store,
    ...props
  });
  return {
    autoComplete: "off",
    ...props
  };
});
var Combobox = _JBOLBTVUcjs.forwardRef.call(void 0, function Combobox2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useCombobox(props));
});

// ../ariakit-react-components/dist/combobox/combobox-cancel.js

var _jsxruntime = require('react/jsx-runtime');
var TagName2 = "button";
var children = /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "svg", {
  "aria-hidden": "true",
  display: "block",
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.5,
  width: "1em",
  height: "1em",
  pointerEvents: "none",
  children: [/* @__PURE__ */ _jsxruntime.jsx.call(void 0, "line", {
    x1: "5",
    y1: "5",
    x2: "11",
    y2: "11"
  }), /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "line", {
    x1: "5",
    y1: "11",
    x2: "11",
    y2: "5"
  })]
});
var useComboboxCancel = _JBOLBTVUcjs.createHook.call(void 0, function useComboboxCancel2({ store, hideWhenEmpty, ...props }) {
  const context = _FNYFMCD7cjs.useComboboxProviderContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "ComboboxCancel must receive a `store` prop or be wrapped in a ComboboxProvider component.");
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    store == null ? void 0 : store.setValue("");
    store == null ? void 0 : store.move(null);
  });
  const comboboxId = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => {
    var _a;
    return (_a = state.baseElement) == null ? void 0 : _a.id;
  });
  const empty = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.value === "");
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => {
    if (!hideWhenEmpty) return element;
    if (empty) return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _react.Fragment, {});
    return element;
  }, [hideWhenEmpty, empty]);
  props = {
    children,
    "aria-label": "Clear input",
    "aria-controls": comboboxId,
    ...props,
    onClick
  };
  props = _P7AY4KL3cjs.useButton.call(void 0, props);
  return props;
});
var ComboboxCancel = _JBOLBTVUcjs.forwardRef.call(void 0, function ComboboxCancel2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName2, useComboboxCancel(props));
});

// ../ariakit-react-components/dist/combobox/combobox-disclosure.js

var TagName3 = "button";
var children2 = /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "svg", {
  "aria-hidden": "true",
  display: "block",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.5,
  viewBox: "0 0 16 16",
  height: "1em",
  width: "1em",
  pointerEvents: "none",
  children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "polyline", { points: "4,6 8,10 12,6" })
});
var useComboboxDisclosure = _JBOLBTVUcjs.createHook.call(void 0, function useComboboxDisclosure2({ store, ...props }) {
  const context = _FNYFMCD7cjs.useComboboxProviderContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "ComboboxDisclosure must receive a `store` prop or be wrapped in a ComboboxProvider component.");
  const onMouseDownProp = props.onMouseDown;
  const onMouseDown = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onMouseDownProp == null ? void 0 : onMouseDownProp(event);
    event.preventDefault();
    store == null ? void 0 : store.move(null);
  });
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    if (!store) return;
    const { baseElement: baseElement2 } = store.getState();
    store.setDisclosureElement(baseElement2);
  });
  const baseElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "baseElement");
  const open = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "open");
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    if (!baseElement) return;
    store.setDisclosureElement(baseElement);
  }, [store, baseElement]);
  props = {
    children: children2,
    tabIndex: -1,
    "aria-label": open ? "Hide popup" : "Show popup",
    "aria-expanded": open,
    ...props,
    onMouseDown,
    onClick
  };
  props = _DVB2WSHDcjs.useDialogDisclosure.call(void 0, {
    store,
    ...props
  });
  return props;
});
var ComboboxDisclosure = _JBOLBTVUcjs.forwardRef.call(void 0, function ComboboxDisclosure2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName3, useComboboxDisclosure(props));
});

// ../ariakit-react-components/dist/combobox/combobox-group.js
var TagName4 = "div";
var useComboboxGroup = _JBOLBTVUcjs.createHook.call(void 0, function useComboboxGroup2({ store, ...props }) {
  const context = _FNYFMCD7cjs.useComboboxScopedContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "ComboboxRow must be wrapped in a ComboboxList or ComboboxPopover component");
  if (_JBOLBTVUcjs.getPopupRole.call(void 0, _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "contentElement")) === "grid") props = {
    role: "rowgroup",
    ...props
  };
  props = _JXYV7OWFcjs.useCompositeGroup.call(void 0, {
    store,
    ...props
  });
  return props;
});
var ComboboxGroup = _JBOLBTVUcjs.forwardRef.call(void 0, function ComboboxGroup2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName4, useComboboxGroup(props));
});

// ../ariakit-react-components/dist/combobox/combobox-group-label.js
var TagName5 = "div";
var useComboboxGroupLabel = _JBOLBTVUcjs.createHook.call(void 0, function useComboboxGroupLabel2(props) {
  props = _JXYV7OWFcjs.useCompositeGroupLabel.call(void 0, props);
  return props;
});
var ComboboxGroupLabel = _JBOLBTVUcjs.forwardRef.call(void 0, function ComboboxGroupLabel2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName5, useComboboxGroupLabel(props));
});

// ../ariakit-react-components/dist/combobox/combobox-item.js


var TagName6 = "div";
function isSelected(storeValue, itemValue) {
  if (itemValue == null) return;
  if (storeValue == null) return false;
  if (Array.isArray(storeValue)) return storeValue.includes(itemValue);
  return storeValue === itemValue;
}
function getItemRole(popupRole) {
  var _a;
  return (_a = {
    menu: "menuitem",
    listbox: "option",
    tree: "treeitem"
  }[popupRole]) != null ? _a : "option";
}
var useComboboxItem = _JBOLBTVUcjs.createHook.call(void 0, function useComboboxItem2({ store, value, hideOnClick, setValueOnClick, selectValueOnClick = true, resetValueOnSelect, focusOnHover = false, moveOnKeyPress = true, getItem: getItemProp, ...props }) {
  var _a;
  const context = _FNYFMCD7cjs.useComboboxScopedContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "ComboboxItem must be wrapped in a ComboboxList or ComboboxPopover component.");
  const { resetValueOnSelectState, multiSelectable, selected } = _FHPV2Q7Ccjs.useStoreStateObject.call(void 0, store, {
    resetValueOnSelectState: "resetValueOnSelect",
    multiSelectable(state) {
      return Array.isArray(state.selectedValue);
    },
    selected(state) {
      return isSelected(state.selectedValue, value);
    }
  });
  const getItem = _react.useCallback.call(void 0, (item) => {
    const nextItem = {
      ...item,
      value
    };
    if (getItemProp) return getItemProp(nextItem);
    return nextItem;
  }, [value, getItemProp]);
  setValueOnClick = setValueOnClick != null ? setValueOnClick : !multiSelectable;
  hideOnClick = hideOnClick != null ? hideOnClick : value != null && !multiSelectable;
  const onClickProp = props.onClick;
  const setValueOnClickProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, setValueOnClick);
  const selectValueOnClickProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, selectValueOnClick);
  const resetValueOnSelectProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, (_a = resetValueOnSelect != null ? resetValueOnSelect : resetValueOnSelectState) != null ? _a : multiSelectable);
  const hideOnClickProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, hideOnClick);
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    if (_JBOLBTVUcjs.isDownloading.call(void 0, event)) return;
    if (_JBOLBTVUcjs.isOpeningInNewTab.call(void 0, event)) return;
    if (value != null) {
      if (selectValueOnClickProp(event)) {
        if (resetValueOnSelectProp(event)) store == null ? void 0 : store.resetValue();
        store == null ? void 0 : store.setSelectedValue((prevValue) => {
          if (!Array.isArray(prevValue)) return value;
          if (prevValue.includes(value)) return prevValue.filter((v) => v !== value);
          return [...prevValue, value];
        });
      }
      if (setValueOnClickProp(event)) store == null ? void 0 : store.setValue(value);
    }
    if (hideOnClickProp(event)) store == null ? void 0 : store.hide();
  });
  const onKeyDownProp = props.onKeyDown;
  const onKeyDown = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onKeyDownProp == null ? void 0 : onKeyDownProp(event);
    if (event.defaultPrevented) return;
    const baseElement = store == null ? void 0 : store.getState().baseElement;
    if (!baseElement) return;
    if (_JBOLBTVUcjs.hasFocus.call(void 0, baseElement)) return;
    if (event.key.length === 1 || event.key === "Backspace" || event.key === "Delete") {
      queueMicrotask(() => baseElement.focus());
      if (_JBOLBTVUcjs.isTextField.call(void 0, baseElement)) store == null ? void 0 : store.setValue(baseElement.value);
    }
  });
  if (multiSelectable && selected != null) props = {
    "aria-selected": selected,
    ...props
  };
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _FNYFMCD7cjs.ComboboxItemValueContext.Provider, {
    value,
    children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _FNYFMCD7cjs.ComboboxItemCheckedContext.Provider, {
      value: selected != null ? selected : false,
      children: element
    })
  }), [value, selected]);
  props = {
    role: getItemRole(_react.useContext.call(void 0, _FNYFMCD7cjs.ComboboxListRoleContext)),
    children: value,
    ...props,
    onClick,
    onKeyDown
  };
  const moveOnKeyPressProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, moveOnKeyPress);
  props = _ZPWE3FTFcjs.useCompositeItem.call(void 0, {
    store,
    ...props,
    getItem,
    moveOnKeyPress: (event) => {
      var _a2;
      if (!moveOnKeyPressProp(event)) return false;
      const moveEvent = new Event("combobox-item-move");
      (_a2 = store == null ? void 0 : store.getState().baseElement) == null ? void 0 : _a2.dispatchEvent(moveEvent);
      return true;
    }
  });
  props = _JXYV7OWFcjs.useCompositeHover.call(void 0, {
    store,
    focusOnHover,
    ...props
  });
  return props;
});
var ComboboxItem = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function ComboboxItem2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName6, useComboboxItem(props));
}));

// ../ariakit-react-components/dist/combobox/combobox-item-check.js

var TagName7 = "span";
var useComboboxItemCheck = _JBOLBTVUcjs.createHook.call(void 0, function useComboboxItemCheck2({ store, checked, ...props }) {
  const context = _react.useContext.call(void 0, _FNYFMCD7cjs.ComboboxItemCheckedContext);
  checked = checked != null ? checked : context;
  props = _5QRVCRDIcjs.useCheckboxCheck.call(void 0, {
    ...props,
    checked
  });
  return props;
});
var ComboboxItemCheck = _JBOLBTVUcjs.forwardRef.call(void 0, function ComboboxItemCheck2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName7, useComboboxItemCheck(props));
});

// ../ariakit-react-components/dist/combobox/combobox-item-value.js


var TagName8 = "span";
function normalizeValue(value) {
  return _JBOLBTVUcjs.normalizeString.call(void 0, value).toLowerCase();
}
function getOffsets(string, values) {
  const offsets = [];
  for (const value of values) {
    let pos = 0;
    const length = value.length;
    while (string.indexOf(value, pos) !== -1) {
      const index = string.indexOf(value, pos);
      if (index !== -1) offsets.push([index, length]);
      pos = index + 1;
    }
  }
  return offsets;
}
function filterOverlappingOffsets(offsets) {
  return offsets.filter(([offset, length], i, arr) => {
    return !arr.some(([o, l], j) => j !== i && o <= offset && o + l >= offset + length);
  });
}
function sortOffsets(offsets) {
  return offsets.sort(([a], [b]) => a - b);
}
function splitValue(itemValue, userValue) {
  if (!itemValue) return itemValue;
  if (!userValue) return itemValue;
  const userValues = _JBOLBTVUcjs.toArray.call(void 0, userValue).filter(Boolean).map(normalizeValue);
  const parts = [];
  const span = (value, autocomplete = false) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "span", {
    "data-autocomplete-value": autocomplete ? "" : void 0,
    "data-user-value": autocomplete ? void 0 : "",
    children: value
  }, parts.length);
  const offsets = sortOffsets(filterOverlappingOffsets(getOffsets(normalizeValue(itemValue), new Set(userValues))));
  const firstEntry = offsets[0];
  if (!firstEntry) {
    parts.push(span(itemValue, true));
    return parts;
  }
  const [firstOffset] = firstEntry;
  [itemValue.slice(0, firstOffset), ...offsets.flatMap(([offset, length], i) => {
    var _a;
    const value = itemValue.slice(offset, offset + length);
    const nextOffset = (_a = offsets[i + 1]) == null ? void 0 : _a[0];
    return [value, itemValue.slice(offset + length, nextOffset)];
  })].forEach((value, i) => {
    if (!value) return;
    parts.push(span(value, i % 2 === 0));
  });
  return parts;
}
var useComboboxItemValue = _JBOLBTVUcjs.createHook.call(void 0, function useComboboxItemValue2({ store, value, userValue, ...props }) {
  const context = _FNYFMCD7cjs.useComboboxScopedContext.call(void 0, );
  store = store || context;
  const itemContext = _react.useContext.call(void 0, _FNYFMCD7cjs.ComboboxItemValueContext);
  const itemValue = value != null ? value : itemContext;
  const inputValue = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => userValue != null ? userValue : state == null ? void 0 : state.value);
  props = {
    children: _react.useMemo.call(void 0, () => {
      if (!itemValue) return;
      if (!inputValue) return itemValue;
      return splitValue(itemValue, inputValue);
    }, [itemValue, inputValue]),
    ...props
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var ComboboxItemValue = _JBOLBTVUcjs.forwardRef.call(void 0, function ComboboxItemValue2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName8, useComboboxItemValue(props));
});

// ../ariakit-react-components/dist/combobox/combobox-label.js
var TagName9 = "label";
var useComboboxLabel = _JBOLBTVUcjs.createHook.call(void 0, function useComboboxLabel2({ store, ...props }) {
  const context = _FNYFMCD7cjs.useComboboxProviderContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "ComboboxLabel must receive a `store` prop or be wrapped in a ComboboxProvider component.");
  props = {
    htmlFor: _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => {
      var _a;
      return (_a = state.baseElement) == null ? void 0 : _a.id;
    }),
    ...props
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var ComboboxLabel = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function ComboboxLabel2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName9, useComboboxLabel(props));
}));

// ../ariakit-react-components/dist/combobox/combobox-list.js


var TagName10 = "div";
var useComboboxList = _JBOLBTVUcjs.createHook.call(void 0, function useComboboxList2({ store, alwaysVisible, ...props }) {
  const scopedContext = _FNYFMCD7cjs.useComboboxScopedContext.call(void 0, true);
  const context = _FNYFMCD7cjs.useComboboxContext.call(void 0, );
  store = store || context;
  const scopedContextSameStore = !!store && store === scopedContext;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "ComboboxList must receive a `store` prop or be wrapped in a ComboboxProvider component.");
  const ref = _react.useRef.call(void 0, null);
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const mounted = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "mounted");
  const hidden = _WYI5CKPVcjs.isHidden.call(void 0, mounted, props.hidden, alwaysVisible);
  const style = hidden ? {
    ...props.style,
    display: "none"
  } : props.style;
  const multiSelectable = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => Array.isArray(state.selectedValue));
  const role = _JBOLBTVUcjs.useAttribute.call(void 0, ref, "role", props.role);
  const ariaMultiSelectable = role === "listbox" || role === "tree" || role === "grid" ? multiSelectable || void 0 : void 0;
  const [hasListboxInside, setHasListboxInside] = _react.useState.call(void 0, false);
  const contentElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "contentElement");
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    if (!mounted) return;
    const element = ref.current;
    if (!element) return;
    if (contentElement !== element) return;
    const callback = () => {
      setHasListboxInside(!!element.querySelector("[role='listbox']"));
    };
    const observer = new MutationObserver(callback);
    observer.observe(element, {
      subtree: true,
      childList: true,
      attributeFilter: ["role"]
    });
    callback();
    return () => observer.disconnect();
  }, [mounted, contentElement]);
  if (!hasListboxInside) props = {
    role: "listbox",
    "aria-multiselectable": ariaMultiSelectable,
    ...props
  };
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _FNYFMCD7cjs.ComboboxScopedContextProvider, {
    value: store,
    children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _FNYFMCD7cjs.ComboboxListRoleContext.Provider, {
      value: role,
      children: element
    })
  }), [store, role]);
  const setContentElement = id && (!scopedContext || !scopedContextSameStore) ? store.setContentElement : null;
  props = {
    hidden,
    ...props,
    id,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, setContentElement, ref, props.ref),
    style
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var ComboboxList = _JBOLBTVUcjs.forwardRef.call(void 0, function ComboboxList2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName10, useComboboxList(props));
});

// ../ariakit-react-components/dist/combobox/combobox-popover.js

var TagName11 = "div";
function isController(target, ...ids) {
  if (!target) return false;
  if ("id" in target) {
    const selector = ids.filter(Boolean).map((id) => `[aria-controls~="${id}"]`).join(", ");
    if (!selector) return false;
    return target.matches(selector);
  }
  return false;
}
var useComboboxPopover = _JBOLBTVUcjs.createHook.call(void 0, function useComboboxPopover2({ store, modal, tabIndex, alwaysVisible, autoFocusOnHide = true, hideOnInteractOutside = true, ...props }) {
  const context = _FNYFMCD7cjs.useComboboxProviderContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "ComboboxPopover must receive a `store` prop or be wrapped in a ComboboxProvider component.");
  const baseElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "baseElement");
  const hiddenByClickOutsideRef = _react.useRef.call(void 0, false);
  const treeSnapshotKey = _FHPV2Q7Ccjs.useStoreState.call(void 0, store.tag, (state) => state == null ? void 0 : state.renderedItems.length);
  props = useComboboxList({
    store,
    alwaysVisible,
    ...props
  });
  props = _KFUU3G3Bcjs.usePopover.call(void 0, {
    store,
    modal,
    alwaysVisible,
    backdrop: false,
    autoFocusOnShow: false,
    finalFocus: baseElement,
    preserveTabOrderAnchor: null,
    unstable_treeSnapshotKey: treeSnapshotKey,
    ...props,
    getPersistentElements() {
      var _a;
      const elements = ((_a = props.getPersistentElements) == null ? void 0 : _a.call(props)) || [];
      if (!modal) return elements;
      if (!store) return elements;
      const { contentElement, baseElement: baseElement2 } = store.getState();
      if (!baseElement2) return elements;
      const doc = _JBOLBTVUcjs.getDocument.call(void 0, baseElement2);
      const selectors = [];
      if (contentElement == null ? void 0 : contentElement.id) selectors.push(`[aria-controls~="${contentElement.id}"]`);
      if (baseElement2 == null ? void 0 : baseElement2.id) selectors.push(`[aria-controls~="${baseElement2.id}"]`);
      if (!selectors.length) return [...elements, baseElement2];
      const selector = selectors.join(",");
      const controlElements = doc.querySelectorAll(selector);
      return [...elements, ...controlElements];
    },
    autoFocusOnHide(element) {
      if (_JBOLBTVUcjs.isFalsyBooleanCallback.call(void 0, autoFocusOnHide, element)) return false;
      if (hiddenByClickOutsideRef.current) {
        hiddenByClickOutsideRef.current = false;
        return false;
      }
      return true;
    },
    hideOnInteractOutside(event) {
      var _a, _b;
      const state = store == null ? void 0 : store.getState();
      const contentId = (_a = state == null ? void 0 : state.contentElement) == null ? void 0 : _a.id;
      const baseId = (_b = state == null ? void 0 : state.baseElement) == null ? void 0 : _b.id;
      if (isController(event.target, contentId, baseId)) return false;
      const result = typeof hideOnInteractOutside === "function" ? hideOnInteractOutside(event) : hideOnInteractOutside;
      if (result) hiddenByClickOutsideRef.current = event.type === "click";
      return result;
    }
  });
  return props;
});
var ComboboxPopover = _QJQWEU4Qcjs.createDialogComponent.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function ComboboxPopover2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName11, useComboboxPopover(props));
}), _FNYFMCD7cjs.useComboboxProviderContext);

// ../ariakit-react-components/dist/tag/tag-context.js

var TagValueContext = _react.createContext.call(void 0, null);
var TagRemoveIdContext = _react.createContext.call(void 0, null);
var ctx = _JBOLBTVUcjs.createStoreContext.call(void 0, [_2WBRQ3I7cjs.CompositeContextProvider], [_2WBRQ3I7cjs.CompositeScopedContextProvider]);
var useTagContext = ctx.useContext;
var useTagScopedContext = ctx.useScopedContext;
var useTagProviderContext = ctx.useProviderContext;
var TagContextProvider = ctx.ContextProvider;
var TagScopedContextProvider = ctx.ScopedContextProvider;

// ../ariakit-components/dist/combobox/combobox-store.js
var isTouchSafari = _JBOLBTVUcjs.isSafari.call(void 0, ) && _JBOLBTVUcjs.isTouchDevice.call(void 0, );
function createComboboxStore({ tag, ...props } = {}) {
  const store = _FHPV2Q7Ccjs.mergeStore.call(void 0, props.store, _FHPV2Q7Ccjs.pick.call(void 0, tag, ["value", "rtl"]));
  _FHPV2Q7Ccjs.throwOnConflictingProps.call(void 0, props, store);
  const tagState = tag == null ? void 0 : tag.getState();
  const syncState = store == null ? void 0 : store.getState();
  const activeId = _JBOLBTVUcjs.defaultValue.call(void 0, props.activeId, syncState == null ? void 0 : syncState.activeId, props.defaultActiveId, null);
  const composite = _US2XYAXEcjs.createCompositeStore.call(void 0, {
    ...props,
    activeId,
    includesBaseElement: _JBOLBTVUcjs.defaultValue.call(void 0, props.includesBaseElement, syncState == null ? void 0 : syncState.includesBaseElement, true),
    orientation: _JBOLBTVUcjs.defaultValue.call(void 0, props.orientation, syncState == null ? void 0 : syncState.orientation, "vertical"),
    focusLoop: _JBOLBTVUcjs.defaultValue.call(void 0, props.focusLoop, syncState == null ? void 0 : syncState.focusLoop, true),
    focusWrap: _JBOLBTVUcjs.defaultValue.call(void 0, props.focusWrap, syncState == null ? void 0 : syncState.focusWrap, true),
    virtualFocus: _JBOLBTVUcjs.defaultValue.call(void 0, props.virtualFocus, syncState == null ? void 0 : syncState.virtualFocus, true)
  });
  const popover = _KFUU3G3Bcjs.createPopoverStore.call(void 0, {
    ...props,
    placement: _JBOLBTVUcjs.defaultValue.call(void 0, props.placement, syncState == null ? void 0 : syncState.placement, "bottom-start")
  });
  const value = _JBOLBTVUcjs.defaultValue.call(void 0, props.value, syncState == null ? void 0 : syncState.value, props.defaultValue, "");
  const selectedValue = _JBOLBTVUcjs.defaultValue.call(void 0, props.selectedValue, syncState == null ? void 0 : syncState.selectedValue, tagState == null ? void 0 : tagState.values, props.defaultSelectedValue, "");
  const multiSelectable = Array.isArray(selectedValue);
  const initialState = {
    ...composite.getState(),
    ...popover.getState(),
    value,
    selectedValue,
    resetValueOnSelect: _JBOLBTVUcjs.defaultValue.call(void 0, props.resetValueOnSelect, syncState == null ? void 0 : syncState.resetValueOnSelect, multiSelectable),
    resetValueOnHide: _JBOLBTVUcjs.defaultValue.call(void 0, props.resetValueOnHide, syncState == null ? void 0 : syncState.resetValueOnHide, multiSelectable && !tag),
    activeValue: syncState == null ? void 0 : syncState.activeValue
  };
  const combobox = _FHPV2Q7Ccjs.createStore.call(void 0, initialState, composite, popover, store);
  if (isTouchSafari) _FHPV2Q7Ccjs.setup.call(void 0, combobox, () => _FHPV2Q7Ccjs.sync.call(void 0, combobox, ["virtualFocus"], () => {
    combobox.setState("virtualFocus", false);
  }));
  _FHPV2Q7Ccjs.setup.call(void 0, combobox, () => {
    if (!tag) return;
    return _JBOLBTVUcjs.chain.call(void 0, _FHPV2Q7Ccjs.sync.call(void 0, combobox, ["selectedValue"], (state) => {
      if (!Array.isArray(state.selectedValue)) return;
      tag.setValues(state.selectedValue);
    }), _FHPV2Q7Ccjs.sync.call(void 0, tag, ["values"], (state) => {
      combobox.setState("selectedValue", state.values);
    }));
  });
  _FHPV2Q7Ccjs.setup.call(void 0, combobox, () => _FHPV2Q7Ccjs.sync.call(void 0, combobox, ["resetValueOnHide", "mounted"], (state) => {
    if (!state.resetValueOnHide) return;
    if (state.mounted) return;
    combobox.setState("value", value);
  }));
  _FHPV2Q7Ccjs.setup.call(void 0, combobox, () => _FHPV2Q7Ccjs.sync.call(void 0, combobox, ["open"], (state) => {
    if (state.open) return;
    combobox.setState("activeId", activeId);
    combobox.setState("moves", 0);
  }));
  _FHPV2Q7Ccjs.setup.call(void 0, combobox, () => _FHPV2Q7Ccjs.sync.call(void 0, combobox, ["moves", "activeId"], (state, prevState) => {
    if (state.moves === prevState.moves) combobox.setState("activeValue", void 0);
  }));
  _FHPV2Q7Ccjs.setup.call(void 0, combobox, () => _FHPV2Q7Ccjs.batch.call(void 0, combobox, ["moves", "renderedItems"], (state, prev) => {
    if (state.moves === prev.moves) return;
    const { activeId: activeId2 } = combobox.getState();
    const activeItem = composite.item(activeId2);
    combobox.setState("activeValue", activeItem == null ? void 0 : activeItem.value);
  }));
  return {
    ...popover,
    ...composite,
    ...combobox,
    tag,
    setValue: (value2) => combobox.setState("value", value2),
    resetValue: () => combobox.setState("value", initialState.value),
    setSelectedValue: (selectedValue2) => combobox.setState("selectedValue", selectedValue2)
  };
}

// ../ariakit-react-components/dist/combobox/combobox-store.js
function useComboboxStoreOptions(props) {
  const tag = useTagContext();
  props = {
    ...props,
    tag: props.tag !== void 0 ? props.tag : tag
  };
  return _US2XYAXEcjs.useCompositeStoreOptions.call(void 0, props);
}
function useComboboxStoreProps(store, update, props) {
  _JBOLBTVUcjs.useUpdateEffect.call(void 0, update, [props.tag]);
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "value", "setValue");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "selectedValue", "setSelectedValue");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "resetValueOnHide");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "resetValueOnSelect");
  return Object.assign(_US2XYAXEcjs.useCompositeStoreProps.call(void 0, _KFUU3G3Bcjs.usePopoverStoreProps.call(void 0, store, update, props), update, props), { tag: props.tag });
}
function useComboboxStore(props = {}) {
  props = useComboboxStoreOptions(props);
  const [store, update] = _FHPV2Q7Ccjs.useStore.call(void 0, createComboboxStore, props);
  return useComboboxStoreProps(store, update, props);
}

// ../ariakit-react-components/dist/combobox/combobox-provider.js

function ComboboxProvider(props = {}) {
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _FNYFMCD7cjs.ComboboxContextProvider, {
    value: useComboboxStore(props),
    children: props.children
  });
}

// ../ariakit-react-components/dist/combobox/combobox-row.js
var TagName12 = "div";
var useComboboxRow = _JBOLBTVUcjs.createHook.call(void 0, function useComboboxRow2({ store, ...props }) {
  const context = _FNYFMCD7cjs.useComboboxScopedContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "ComboboxRow must be wrapped in a ComboboxList or ComboboxPopover component");
  props = {
    role: _JBOLBTVUcjs.getPopupRole.call(void 0, _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "contentElement")) === "grid" ? "row" : "presentation",
    ...props
  };
  props = _G2JI2Z7Ucjs.useCompositeRow.call(void 0, {
    store,
    ...props
  });
  return props;
});
var ComboboxRow = _JBOLBTVUcjs.forwardRef.call(void 0, function ComboboxRow2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName12, useComboboxRow(props));
});

// ../ariakit-react-components/dist/combobox/combobox-separator.js
var TagName13 = "hr";
var useComboboxSeparator = _JBOLBTVUcjs.createHook.call(void 0, function useComboboxSeparator2({ store, ...props }) {
  const context = _FNYFMCD7cjs.useComboboxScopedContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "ComboboxSeparator must be wrapped in a ComboboxList or ComboboxPopover component.");
  props = _WLHP5OM6cjs.useCompositeSeparator.call(void 0, {
    store,
    ...props
  });
  return props;
});
var ComboboxSeparator = _JBOLBTVUcjs.forwardRef.call(void 0, function ComboboxSeparator2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName13, useComboboxSeparator(props));
});

// ../ariakit-react-components/dist/combobox/combobox-value.js
function ComboboxValue({ store, children: children3 } = {}) {
  const context = _FNYFMCD7cjs.useComboboxContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "ComboboxValue must receive a `store` prop or be wrapped in a ComboboxProvider component.");
  const value = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "value");
  if (children3) return children3(value);
  return value;
}


















exports.Combobox = Combobox; exports.ComboboxCancel = ComboboxCancel; exports.ComboboxDisclosure = ComboboxDisclosure; exports.ComboboxGroup = ComboboxGroup; exports.ComboboxGroupLabel = ComboboxGroupLabel; exports.ComboboxItem = ComboboxItem; exports.ComboboxItemCheck = ComboboxItemCheck; exports.ComboboxItemValue = ComboboxItemValue; exports.ComboboxLabel = ComboboxLabel; exports.ComboboxList = ComboboxList; exports.ComboboxPopover = ComboboxPopover; exports.useComboboxStore = useComboboxStore; exports.ComboboxProvider = ComboboxProvider; exports.ComboboxRow = ComboboxRow; exports.ComboboxSeparator = ComboboxSeparator; exports.ComboboxValue = ComboboxValue;
