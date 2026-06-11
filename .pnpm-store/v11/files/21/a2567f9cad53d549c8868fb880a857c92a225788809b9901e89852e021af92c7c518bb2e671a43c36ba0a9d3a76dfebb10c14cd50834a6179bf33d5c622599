"use strict";Object.defineProperty(exports, "__esModule", {value: true});







var _D6USTXKAcjs = require('./D6USTXKA.cjs');



var _I6N3772Ncjs = require('./I6N3772N.cjs');



var _ULDO57DJcjs = require('./ULDO57DJ.cjs');


var _FNYFMCD7cjs = require('./FNYFMCD7.cjs');




var _KFUU3G3Bcjs = require('./KFUU3G3B.cjs');


var _5QRVCRDIcjs = require('./5QRVCRDI.cjs');


var _IGWSYIUYcjs = require('./IGWSYIUY.cjs');


var _G2JI2Z7Ucjs = require('./G2JI2Z7U.cjs');




var _JXYV7OWFcjs = require('./JXYV7OWF.cjs');


var _WLHP5OM6cjs = require('./WLHP5OM6.cjs');





var _US2XYAXEcjs = require('./US2XYAXE.cjs');


var _ZPWE3FTFcjs = require('./ZPWE3FTF.cjs');


var _QJQWEU4Qcjs = require('./QJQWEU4Q.cjs');


var _WYI5CKPVcjs = require('./WYI5CKPV.cjs');












var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');

























var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/select/select-arrow.js
var TagName = "span";
var useSelectArrow = _JBOLBTVUcjs.createHook.call(void 0, function useSelectArrow2({ store, ...props }) {
  const context = _D6USTXKAcjs.useSelectContext.call(void 0, );
  store = store || context;
  props = _I6N3772Ncjs.usePopoverDisclosureArrow.call(void 0, {
    store,
    ...props
  });
  return props;
});
var SelectArrow = _JBOLBTVUcjs.forwardRef.call(void 0, function SelectArrow2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useSelectArrow(props));
});

// ../ariakit-react-components/dist/select/select.js
var _react = require('react');
var _jsxruntime = require('react/jsx-runtime');
var TagName2 = "button";
function getSelectedValues(select) {
  return Array.from(select.selectedOptions).map((option) => option.value);
}
function nextWithValue(store, next) {
  return () => {
    const nextId = next();
    if (!nextId) return;
    let i = 0;
    let nextItem = store.item(nextId);
    const firstItem = nextItem;
    while (nextItem && nextItem.value == null) {
      const nextId2 = next(++i);
      if (!nextId2) return;
      nextItem = store.item(nextId2);
      if (nextItem === firstItem) break;
    }
    return nextItem == null ? void 0 : nextItem.id;
  };
}
var useSelect = _JBOLBTVUcjs.createHook.call(void 0, function useSelect2({ store, name, form, required, showOnKeyDown = true, moveOnKeyDown = true, toggleOnPress = true, toggleOnClick = toggleOnPress, ...props }) {
  const context = _D6USTXKAcjs.useSelectProviderContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "Select must receive a `store` prop or be wrapped in a SelectProvider component.");
  const onKeyDownProp = props.onKeyDown;
  const showOnKeyDownProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, showOnKeyDown);
  const moveOnKeyDownProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, moveOnKeyDown);
  const dir = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "placement").split("-")[0];
  const value = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "value");
  const multiSelectable = Array.isArray(value);
  const onKeyDown = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    var _a;
    onKeyDownProp == null ? void 0 : onKeyDownProp(event);
    if (event.defaultPrevented) return;
    if (!store) return;
    const { orientation, items: items2, activeId } = store.getState();
    const isVertical = orientation !== "horizontal";
    const isHorizontal = orientation !== "vertical";
    const isGrid = !!((_a = items2.find((item) => !item.disabled && item.value != null)) == null ? void 0 : _a.rowId);
    const getId = {
      ArrowUp: (isGrid || isVertical) && nextWithValue(store, store.up),
      ArrowRight: (isGrid || isHorizontal) && nextWithValue(store, store.next),
      ArrowDown: (isGrid || isVertical) && nextWithValue(store, store.down),
      ArrowLeft: (isGrid || isHorizontal) && nextWithValue(store, store.previous)
    }[event.key];
    if (getId && moveOnKeyDownProp(event)) {
      event.preventDefault();
      store.move(getId());
    }
    const isTopOrBottom = dir === "top" || dir === "bottom";
    if ({
      ArrowDown: isTopOrBottom,
      ArrowUp: isTopOrBottom,
      ArrowLeft: dir === "left",
      ArrowRight: dir === "right"
    }[event.key] && showOnKeyDownProp(event)) {
      event.preventDefault();
      store.move(activeId);
      _JBOLBTVUcjs.queueBeforeEvent.call(void 0, event.currentTarget, "keyup", store.show);
    }
  });
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _D6USTXKAcjs.SelectScopedContextProvider, {
    value: store,
    children: element
  }), [store]);
  const [autofill, setAutofill] = _react.useState.call(void 0, false);
  const nativeSelectChangedRef = _react.useRef.call(void 0, false);
  _react.useEffect.call(void 0, () => {
    const nativeSelectChanged = nativeSelectChangedRef.current;
    nativeSelectChangedRef.current = false;
    if (nativeSelectChanged) return;
    setAutofill(false);
  }, [value]);
  const labelId = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => {
    var _a;
    return (_a = state.labelElement) == null ? void 0 : _a.id;
  });
  const label = props["aria-label"];
  const labelledBy = props["aria-labelledby"] || labelId;
  const items = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => {
    if (!name) return;
    return state.items;
  });
  const values = _react.useMemo.call(void 0, () => {
    return [...new Set(items == null ? void 0 : items.map((i) => i.value).filter((v) => v != null))];
  }, [items]);
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => {
    if (!name) return element;
    return /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, _jsxruntime.Fragment, { children: [/* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "select", {
      style: {
        border: 0,
        clip: "rect(0 0 0 0)",
        height: "1px",
        margin: "-1px",
        overflow: "hidden",
        padding: 0,
        position: "absolute",
        whiteSpace: "nowrap",
        width: "1px"
      },
      tabIndex: -1,
      "aria-hidden": true,
      "aria-label": label,
      "aria-labelledby": label != null ? void 0 : labelledBy,
      name,
      form,
      required,
      disabled: props.disabled,
      value,
      multiple: multiSelectable,
      onFocus: () => {
        var _a;
        return (_a = store == null ? void 0 : store.getState().selectElement) == null ? void 0 : _a.focus();
      },
      onChange: (event) => {
        nativeSelectChangedRef.current = true;
        setAutofill(true);
        store == null ? void 0 : store.setValue(multiSelectable ? getSelectedValues(event.target) : event.target.value);
      },
      children: [_JBOLBTVUcjs.toArray.call(void 0, value).map((value2) => {
        if (value2 == null) return null;
        if (values.includes(value2)) return null;
        return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "option", {
          value: value2,
          children: value2
        }, value2);
      }), values.map((value2) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "option", {
        value: value2,
        children: value2
      }, value2))]
    }), element] });
  }, [
    store,
    label,
    labelledBy,
    name,
    form,
    required,
    value,
    multiSelectable,
    values,
    props.disabled
  ]);
  const children = /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, _jsxruntime.Fragment, { children: [value, /* @__PURE__ */ _jsxruntime.jsx.call(void 0, SelectArrow, {})] });
  const contentElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "contentElement");
  props = {
    role: "combobox",
    "aria-autocomplete": "none",
    "aria-labelledby": props["aria-label"] != null ? void 0 : labelId,
    "aria-haspopup": _JBOLBTVUcjs.getPopupRole.call(void 0, contentElement, "listbox"),
    "data-autofill": autofill || void 0,
    "data-name": name,
    children,
    ...props,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, store.setSelectElement, props.ref),
    onKeyDown
  };
  props = _I6N3772Ncjs.usePopoverDisclosure.call(void 0, {
    store,
    toggleOnClick,
    ...props
  });
  props = _IGWSYIUYcjs.useCompositeTypeahead.call(void 0, {
    store,
    ...props
  });
  return props;
});
var Select = _JBOLBTVUcjs.forwardRef.call(void 0, function Select2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName2, useSelect(props));
});

// ../ariakit-react-components/dist/select/select-dismiss.js
var TagName3 = "button";
var useSelectDismiss = _JBOLBTVUcjs.createHook.call(void 0, function useSelectDismiss2({ store, ...props }) {
  const context = _D6USTXKAcjs.useSelectScopedContext.call(void 0, );
  store = store || context;
  props = _ULDO57DJcjs.usePopoverDismiss.call(void 0, {
    store,
    ...props
  });
  return props;
});
var SelectDismiss = _JBOLBTVUcjs.forwardRef.call(void 0, function SelectDismiss2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName3, useSelectDismiss(props));
});

// ../ariakit-react-components/dist/select/select-group.js
var TagName4 = "div";
var useSelectGroup = _JBOLBTVUcjs.createHook.call(void 0, function useSelectGroup2(props) {
  props = _JXYV7OWFcjs.useCompositeGroup.call(void 0, props);
  return props;
});
var SelectGroup = _JBOLBTVUcjs.forwardRef.call(void 0, function SelectGroup2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName4, useSelectGroup(props));
});

// ../ariakit-react-components/dist/select/select-group-label.js
var TagName5 = "div";
var useSelectGroupLabel = _JBOLBTVUcjs.createHook.call(void 0, function useSelectGroupLabel2(props) {
  props = _JXYV7OWFcjs.useCompositeGroupLabel.call(void 0, props);
  return props;
});
var SelectGroupLabel = _JBOLBTVUcjs.forwardRef.call(void 0, function SelectGroupLabel2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName5, useSelectGroupLabel(props));
});

// ../ariakit-react-components/dist/select/select-heading.js

var TagName6 = "h1";
var useSelectHeading = _JBOLBTVUcjs.createHook.call(void 0, function useSelectHeading2(props) {
  const [, setHeadingId] = _react.useContext.call(void 0, _D6USTXKAcjs.SelectHeadingContext) || [];
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    setHeadingId == null ? void 0 : setHeadingId(id);
    return () => setHeadingId == null ? void 0 : setHeadingId(void 0);
  }, [setHeadingId, id]);
  props = {
    ...props,
    id
  };
  props = _ULDO57DJcjs.usePopoverHeading.call(void 0, props);
  return props;
});
var SelectHeading = _JBOLBTVUcjs.forwardRef.call(void 0, function SelectHeading2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName6, useSelectHeading(props));
});

// ../ariakit-react-components/dist/select/select-item.js


var TagName7 = "div";
function isSelected(storeValue, itemValue) {
  if (itemValue == null) return;
  if (storeValue == null) return false;
  if (Array.isArray(storeValue)) return storeValue.includes(itemValue);
  return storeValue === itemValue;
}
var useSelectItem = _JBOLBTVUcjs.createHook.call(void 0, function useSelectItem2({ store, value, getItem: getItemProp, hideOnClick, setValueOnClick = value != null, preventScrollOnKeyDown = true, focusOnHover = true, ...props }) {
  var _a;
  const context = _D6USTXKAcjs.useSelectScopedContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "SelectItem must be wrapped in a SelectList or SelectPopover component.");
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const disabled = _JBOLBTVUcjs.disabledFromProps.call(void 0, props);
  const { listElement, multiSelectable, selected, autoFocus } = _FHPV2Q7Ccjs.useStoreStateObject.call(void 0, store, {
    listElement: "listElement",
    multiSelectable(state) {
      return Array.isArray(state.value);
    },
    selected(state) {
      return isSelected(state.value, value);
    },
    autoFocus(state) {
      if (value == null) return false;
      if (state.value == null) return false;
      if (state.activeId !== id && (store == null ? void 0 : store.item(state.activeId))) return false;
      if (Array.isArray(state.value)) return state.value[state.value.length - 1] === value;
      return state.value === value;
    }
  });
  const virtualFocus = _FHPV2Q7Ccjs.useStoreState.call(void 0, store == null ? void 0 : store.combobox, "virtualFocus");
  const getItem = _react.useCallback.call(void 0, (item) => {
    const nextItem = {
      ...item,
      value: disabled ? void 0 : value
    };
    if (getItemProp) return getItemProp(nextItem);
    return nextItem;
  }, [
    disabled,
    value,
    getItemProp
  ]);
  hideOnClick = hideOnClick != null ? hideOnClick : value != null && !multiSelectable;
  const onClickProp = props.onClick;
  const setValueOnClickProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, setValueOnClick);
  const hideOnClickProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, hideOnClick);
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    if (_JBOLBTVUcjs.isDownloading.call(void 0, event)) return;
    if (_JBOLBTVUcjs.isOpeningInNewTab.call(void 0, event)) return;
    if (setValueOnClickProp(event) && value != null) store == null ? void 0 : store.setValue((prevValue) => {
      if (!Array.isArray(prevValue)) return value;
      if (prevValue.includes(value)) return prevValue.filter((v) => v !== value);
      return [...prevValue, value];
    });
    if (hideOnClickProp(event)) store == null ? void 0 : store.hide();
  });
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _D6USTXKAcjs.SelectItemCheckedContext.Provider, {
    value: selected != null ? selected : false,
    children: element
  }), [selected]);
  const shouldAutoFocus = (_a = props.autoFocus) != null ? _a : autoFocus;
  props = {
    role: _JBOLBTVUcjs.getPopupItemRole.call(void 0, listElement),
    "aria-selected": selected,
    children: value,
    ...props,
    id,
    autoFocus: virtualFocus === false ? false : shouldAutoFocus,
    "data-autofocus": shouldAutoFocus || void 0,
    onClick
  };
  props = _ZPWE3FTFcjs.useCompositeItem.call(void 0, {
    store,
    getItem,
    preventScrollOnKeyDown,
    ...props
  });
  const focusOnHoverProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, focusOnHover);
  props = _JXYV7OWFcjs.useCompositeHover.call(void 0, {
    store,
    ...props,
    focusOnHover(event) {
      if (!focusOnHoverProp(event)) return false;
      return store.getState().open;
    }
  });
  return props;
});
var SelectItem = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function SelectItem2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName7, useSelectItem(props));
}));

// ../ariakit-react-components/dist/select/select-item-check.js

var TagName8 = "span";
var useSelectItemCheck = _JBOLBTVUcjs.createHook.call(void 0, function useSelectItemCheck2({ store, checked, ...props }) {
  const context = _react.useContext.call(void 0, _D6USTXKAcjs.SelectItemCheckedContext);
  checked = checked != null ? checked : context;
  props = _5QRVCRDIcjs.useCheckboxCheck.call(void 0, {
    ...props,
    checked
  });
  return props;
});
var SelectItemCheck = _JBOLBTVUcjs.forwardRef.call(void 0, function SelectItemCheck2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName8, useSelectItemCheck(props));
});

// ../ariakit-react-components/dist/select/select-label.js
var TagName9 = "div";
var useSelectLabel = _JBOLBTVUcjs.createHook.call(void 0, function useSelectLabel2({ store, ...props }) {
  const context = _D6USTXKAcjs.useSelectProviderContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "SelectLabel must receive a `store` prop or be wrapped in a SelectProvider component.");
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    queueMicrotask(() => {
      var _a;
      (_a = store == null ? void 0 : store.getState().selectElement) == null ? void 0 : _a.focus();
    });
  });
  props = {
    ...props,
    id,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, store.setLabelElement, props.ref),
    onClick,
    style: {
      cursor: "default",
      ...props.style
    }
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var SelectLabel = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function SelectLabel2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName9, useSelectLabel(props));
}));

// ../ariakit-react-components/dist/select/select-list.js


var TagName10 = "div";
var SelectListContext = _react.createContext.call(void 0, null);
var useSelectList = _JBOLBTVUcjs.createHook.call(void 0, function useSelectList2({ store, resetOnEscape = true, hideOnEnter = true, focusOnMove = true, composite, alwaysVisible, ...props }) {
  const context = _D6USTXKAcjs.useSelectContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "SelectList must receive a `store` prop or be wrapped in a SelectProvider component.");
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const value = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "value");
  const multiSelectable = Array.isArray(value);
  const [defaultValue2, setDefaultValue] = _react.useState.call(void 0, value);
  const mounted = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "mounted");
  _react.useEffect.call(void 0, () => {
    if (mounted) return;
    setDefaultValue(value);
  }, [mounted, value]);
  resetOnEscape = resetOnEscape && !multiSelectable;
  const onKeyDownProp = props.onKeyDown;
  const resetOnEscapeProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, resetOnEscape);
  const hideOnEnterProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, hideOnEnter);
  const onKeyDown = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onKeyDownProp == null ? void 0 : onKeyDownProp(event);
    if (event.defaultPrevented) return;
    if (event.key === "Escape" && resetOnEscapeProp(event)) store == null ? void 0 : store.setValue(defaultValue2);
    if (event.key === " " || event.key === "Enter") {
      if (_JBOLBTVUcjs.isSelfTarget.call(void 0, event) && hideOnEnterProp(event)) {
        event.preventDefault();
        store == null ? void 0 : store.hide();
      }
    }
  });
  const headingContext = _react.useContext.call(void 0, _D6USTXKAcjs.SelectHeadingContext);
  const headingState = _react.useState.call(void 0, );
  const [headingId, setHeadingId] = headingContext || headingState;
  const headingContextValue = _react.useMemo.call(void 0, () => [headingId, setHeadingId], [headingId, setHeadingId]);
  const [childStore, setChildStore] = _react.useState.call(void 0, null);
  const setStore = _react.useContext.call(void 0, SelectListContext);
  _react.useEffect.call(void 0, () => {
    if (!setStore) return;
    setStore(store);
    return () => setStore(null);
  }, [setStore, store]);
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element2) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _D6USTXKAcjs.SelectScopedContextProvider, {
    value: store,
    children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, SelectListContext.Provider, {
      value: setChildStore,
      children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _D6USTXKAcjs.SelectHeadingContext.Provider, {
        value: headingContextValue,
        children: element2
      })
    })
  }), [store, headingContextValue]);
  const hasCombobox = !!store.combobox;
  composite = composite != null ? composite : !hasCombobox && childStore !== store;
  const [element, setElement] = _JBOLBTVUcjs.useTransactionState.call(void 0, composite ? store.setListElement : null);
  const role = _JBOLBTVUcjs.useAttribute.call(void 0, element, "role", props.role);
  const ariaMultiSelectable = composite || role === "listbox" || role === "menu" || role === "tree" || role === "grid" ? multiSelectable || void 0 : void 0;
  const hidden = _WYI5CKPVcjs.isHidden.call(void 0, mounted, props.hidden, alwaysVisible);
  const style = hidden ? {
    ...props.style,
    display: "none"
  } : props.style;
  if (composite) props = {
    role: "listbox",
    "aria-multiselectable": ariaMultiSelectable,
    ...props
  };
  const labelId = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => {
    var _a;
    return headingId || ((_a = state.labelElement) == null ? void 0 : _a.id);
  });
  props = {
    "aria-labelledby": props["aria-label"] != null ? void 0 : labelId,
    hidden,
    ...props,
    id,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, setElement, props.ref),
    style,
    onKeyDown
  };
  props = _US2XYAXEcjs.useComposite.call(void 0, {
    store,
    ...props,
    composite
  });
  props = _IGWSYIUYcjs.useCompositeTypeahead.call(void 0, {
    store,
    typeahead: !hasCombobox,
    ...props
  });
  return props;
});
var SelectList = _JBOLBTVUcjs.forwardRef.call(void 0, function SelectList2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName10, useSelectList(props));
});

// ../ariakit-react-components/dist/select/select-popover.js
var TagName11 = "div";
var useSelectPopover = _JBOLBTVUcjs.createHook.call(void 0, function useSelectPopover2({ store, alwaysVisible, ...props }) {
  const context = _D6USTXKAcjs.useSelectProviderContext.call(void 0, );
  store = store || context;
  props = useSelectList({
    store,
    alwaysVisible,
    ...props
  });
  props = _KFUU3G3Bcjs.usePopover.call(void 0, {
    store,
    alwaysVisible,
    ...props
  });
  return props;
});
var SelectPopover = _QJQWEU4Qcjs.createDialogComponent.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function SelectPopover2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName11, useSelectPopover(props));
}), _D6USTXKAcjs.useSelectProviderContext);

// ../ariakit-components/dist/select/select-store.js
function createSelectStore({ combobox, ...props } = {}) {
  const store = _FHPV2Q7Ccjs.mergeStore.call(void 0, props.store, _FHPV2Q7Ccjs.omit.call(void 0, combobox, [
    "value",
    "items",
    "renderedItems",
    "baseElement",
    "arrowElement",
    "anchorElement",
    "contentElement",
    "popoverElement",
    "disclosureElement"
  ]));
  _FHPV2Q7Ccjs.throwOnConflictingProps.call(void 0, props, store);
  const syncState = store.getState();
  const composite = _US2XYAXEcjs.createCompositeStore.call(void 0, {
    ...props,
    store,
    virtualFocus: _JBOLBTVUcjs.defaultValue.call(void 0, props.virtualFocus, syncState.virtualFocus, true),
    includesBaseElement: _JBOLBTVUcjs.defaultValue.call(void 0, props.includesBaseElement, syncState.includesBaseElement, false),
    activeId: _JBOLBTVUcjs.defaultValue.call(void 0, props.activeId, syncState.activeId, props.defaultActiveId, null),
    orientation: _JBOLBTVUcjs.defaultValue.call(void 0, props.orientation, syncState.orientation, "vertical")
  });
  const popover = _KFUU3G3Bcjs.createPopoverStore.call(void 0, {
    ...props,
    store,
    placement: _JBOLBTVUcjs.defaultValue.call(void 0, props.placement, syncState.placement, "bottom-start")
  });
  const initialValue = /* @__PURE__ */ new String("");
  const initialState = {
    ...composite.getState(),
    ...popover.getState(),
    value: _JBOLBTVUcjs.defaultValue.call(void 0, props.value, syncState.value, props.defaultValue, initialValue),
    setValueOnMove: _JBOLBTVUcjs.defaultValue.call(void 0, props.setValueOnMove, syncState.setValueOnMove, false),
    labelElement: _JBOLBTVUcjs.defaultValue.call(void 0, syncState.labelElement, null),
    selectElement: _JBOLBTVUcjs.defaultValue.call(void 0, syncState.selectElement, null),
    listElement: _JBOLBTVUcjs.defaultValue.call(void 0, syncState.listElement, null)
  };
  const select = _FHPV2Q7Ccjs.createStore.call(void 0, initialState, composite, popover, store);
  _FHPV2Q7Ccjs.setup.call(void 0, select, () => _FHPV2Q7Ccjs.sync.call(void 0, select, ["value", "items"], (state) => {
    if (state.value !== initialValue) return;
    if (!state.items.length) return;
    const item = state.items.find((item2) => !item2.disabled && item2.value != null);
    if ((item == null ? void 0 : item.value) == null) return;
    select.setState("value", item.value);
  }));
  _FHPV2Q7Ccjs.setup.call(void 0, select, () => _FHPV2Q7Ccjs.sync.call(void 0, select, ["mounted"], (state) => {
    if (state.mounted) return;
    select.setState("activeId", initialState.activeId);
  }));
  _FHPV2Q7Ccjs.setup.call(void 0, select, () => _FHPV2Q7Ccjs.sync.call(void 0, select, [
    "mounted",
    "items",
    "value"
  ], (state) => {
    if (combobox) return;
    if (state.mounted) return;
    const values = _JBOLBTVUcjs.toArray.call(void 0, state.value);
    const lastValue = values[values.length - 1];
    if (lastValue == null) return;
    const item = state.items.find((item2) => !item2.disabled && item2.value === lastValue);
    if (!item) return;
    select.setState("activeId", item.id);
  }));
  _FHPV2Q7Ccjs.setup.call(void 0, select, () => _FHPV2Q7Ccjs.batch.call(void 0, select, ["setValueOnMove", "moves"], (state) => {
    const { mounted, value, activeId } = select.getState();
    if (!state.setValueOnMove && mounted) return;
    if (Array.isArray(value)) return;
    if (!state.moves) return;
    if (!activeId) return;
    const item = composite.item(activeId);
    if (!item || item.disabled || item.value == null) return;
    select.setState("value", item.value);
  }));
  return {
    ...composite,
    ...popover,
    ...select,
    combobox,
    setValue: (value) => select.setState("value", value),
    setLabelElement: (element) => select.setState("labelElement", element),
    setSelectElement: (element) => select.setState("selectElement", element),
    setListElement: (element) => select.setState("listElement", element)
  };
}

// ../ariakit-react-components/dist/select/select-store.js
function useSelectStoreOptions(props) {
  const combobox = _FNYFMCD7cjs.useComboboxProviderContext.call(void 0, );
  props = {
    ...props,
    combobox: props.combobox !== void 0 ? props.combobox : combobox
  };
  return _US2XYAXEcjs.useCompositeStoreOptions.call(void 0, props);
}
function useSelectStoreProps(store, update, props) {
  _JBOLBTVUcjs.useUpdateEffect.call(void 0, update, [props.combobox]);
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "value", "setValue");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "setValueOnMove");
  return Object.assign(_KFUU3G3Bcjs.usePopoverStoreProps.call(void 0, _US2XYAXEcjs.useCompositeStoreProps.call(void 0, store, update, props), update, props), { combobox: props.combobox });
}
function useSelectStore(props = {}) {
  props = useSelectStoreOptions(props);
  const [store, update] = _FHPV2Q7Ccjs.useStore.call(void 0, createSelectStore, props);
  return useSelectStoreProps(store, update, props);
}

// ../ariakit-react-components/dist/select/select-provider.js

function SelectProvider(props = {}) {
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _D6USTXKAcjs.SelectContextProvider, {
    value: useSelectStore(props),
    children: props.children
  });
}

// ../ariakit-react-components/dist/select/select-row.js
var TagName12 = "div";
var useSelectRow = _JBOLBTVUcjs.createHook.call(void 0, function useSelectRow2({ store, ...props }) {
  const context = _D6USTXKAcjs.useSelectContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "SelectRow must be wrapped in a SelectList or SelectPopover component");
  props = {
    role: _JBOLBTVUcjs.getPopupRole.call(void 0, _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "listElement")) === "grid" ? "row" : "presentation",
    ...props
  };
  props = _G2JI2Z7Ucjs.useCompositeRow.call(void 0, {
    store,
    ...props
  });
  return props;
});
var SelectRow = _JBOLBTVUcjs.forwardRef.call(void 0, function SelectRow2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName12, useSelectRow(props));
});

// ../ariakit-react-components/dist/select/select-separator.js
var TagName13 = "hr";
var useSelectSeparator = _JBOLBTVUcjs.createHook.call(void 0, function useSelectSeparator2({ store, ...props }) {
  const context = _D6USTXKAcjs.useSelectContext.call(void 0, );
  store = store || context;
  props = _WLHP5OM6cjs.useCompositeSeparator.call(void 0, {
    store,
    ...props
  });
  return props;
});
var SelectSeparator = _JBOLBTVUcjs.forwardRef.call(void 0, function SelectSeparator2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName13, useSelectSeparator(props));
});

// ../ariakit-react-components/dist/select/select-value.js
function SelectValue({ store, fallback, children } = {}) {
  const context = _D6USTXKAcjs.useSelectContext.call(void 0, );
  store = store || context;
  const value = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => {
    if (!(state == null ? void 0 : state.value.length)) return fallback;
    return state.value;
  });
  if (children) return children(value || "");
  return value;
}


















exports.SelectArrow = SelectArrow; exports.Select = Select; exports.SelectDismiss = SelectDismiss; exports.SelectGroup = SelectGroup; exports.SelectGroupLabel = SelectGroupLabel; exports.SelectHeading = SelectHeading; exports.SelectItem = SelectItem; exports.SelectItemCheck = SelectItemCheck; exports.SelectLabel = SelectLabel; exports.SelectList = SelectList; exports.SelectPopover = SelectPopover; exports.useSelectStore = useSelectStore; exports.SelectProvider = SelectProvider; exports.SelectRow = SelectRow; exports.SelectSeparator = SelectSeparator; exports.SelectValue = SelectValue;
