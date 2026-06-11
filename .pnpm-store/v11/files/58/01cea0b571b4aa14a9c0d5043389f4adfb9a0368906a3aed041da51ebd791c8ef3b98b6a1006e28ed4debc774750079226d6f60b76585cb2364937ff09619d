"use strict";Object.defineProperty(exports, "__esModule", {value: true});





var _I4JS2KAFcjs = require('./I4JS2KAF.cjs');



var _I6N3772Ncjs = require('./I6N3772N.cjs');


var _M6YHODMVcjs = require('./M6YHODMV.cjs');




var _P6Y2DILAcjs = require('./P6Y2DILA.cjs');







var _HCYQ5Z7Zcjs = require('./HCYQ5Z7Z.cjs');


var _AI3BA27Gcjs = require('./AI3BA27G.cjs');



var _IEVLYJJPcjs = require('./IEVLYJJP.cjs');


var _FNYFMCD7cjs = require('./FNYFMCD7.cjs');


var _5QRVCRDIcjs = require('./5QRVCRDI.cjs');


var _IGWSYIUYcjs = require('./IGWSYIUY.cjs');




var _JXYV7OWFcjs = require('./JXYV7OWF.cjs');


var _WLHP5OM6cjs = require('./WLHP5OM6.cjs');




var _US2XYAXEcjs = require('./US2XYAXE.cjs');


var _ZPWE3FTFcjs = require('./ZPWE3FTF.cjs');



var _2WBRQ3I7cjs = require('./2WBRQ3I7.cjs');


var _QJQWEU4Qcjs = require('./QJQWEU4Q.cjs');


var _CKHOJYDQcjs = require('./CKHOJYDQ.cjs');


var _WYI5CKPVcjs = require('./WYI5CKPV.cjs');











var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');



























var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/menu/menu-context.js
var _react = require('react');
var menu = _JBOLBTVUcjs.createStoreContext.call(void 0, [_2WBRQ3I7cjs.CompositeContextProvider, _HCYQ5Z7Zcjs.HovercardContextProvider], [_2WBRQ3I7cjs.CompositeScopedContextProvider, _HCYQ5Z7Zcjs.HovercardScopedContextProvider]);
var useMenuContext = menu.useContext;
var useMenuScopedContext = menu.useScopedContext;
var useMenuProviderContext = menu.useProviderContext;
var MenuContextProvider = menu.ContextProvider;
var MenuScopedContextProvider = menu.ScopedContextProvider;
var useMenuBarContext = _I4JS2KAFcjs.useMenubarContext;
var MenuItemCheckedContext = _react.createContext.call(void 0, void 0);
var MenuListHiddenContext = _react.createContext.call(void 0, false);

// ../ariakit-react-components/dist/menu/menu-list.js

var _jsxruntime = require('react/jsx-runtime');
var TagName = "div";
function useAriaLabelledBy({ store, ...props }) {
  const [id, setId] = _react.useState.call(void 0, void 0);
  const label = props["aria-label"];
  const disclosureElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "disclosureElement");
  const contentElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "contentElement");
  _react.useEffect.call(void 0, () => {
    const disclosure = disclosureElement;
    if (!disclosure) return;
    const menu2 = contentElement;
    if (!menu2) return;
    if (label || menu2.hasAttribute("aria-label")) setId(void 0);
    else if (disclosure.id) setId(disclosure.id);
  }, [
    label,
    disclosureElement,
    contentElement
  ]);
  return id;
}
var useMenuList = _JBOLBTVUcjs.createHook.call(void 0, function useMenuList2({ store, alwaysVisible, composite, ...props }) {
  const context = useMenuProviderContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "MenuList must receive a `store` prop or be wrapped in a MenuProvider component.");
  const parentMenu = store.parent;
  const parentMenubar = store.menubar;
  const hasParentMenu = !!parentMenu;
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const onKeyDownProp = props.onKeyDown;
  const dir = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.placement.split("-")[0]);
  const orientation = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.orientation === "both" ? void 0 : state.orientation);
  const isHorizontal = orientation !== "vertical";
  const isMenubarHorizontal = _FHPV2Q7Ccjs.useStoreState.call(void 0, parentMenubar, (state) => !!state && state.orientation !== "vertical");
  const onKeyDown = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onKeyDownProp == null ? void 0 : onKeyDownProp(event);
    if (event.defaultPrevented) return;
    if (hasParentMenu || parentMenubar && !isHorizontal) {
      const action = {
        ArrowRight: () => dir === "left" && !isHorizontal,
        ArrowLeft: () => dir === "right" && !isHorizontal,
        ArrowUp: () => dir === "bottom" && isHorizontal,
        ArrowDown: () => dir === "top" && isHorizontal
      }[event.key];
      if (action == null ? void 0 : action()) {
        event.stopPropagation();
        event.preventDefault();
        return store == null ? void 0 : store.hide();
      }
    }
    if (parentMenubar) {
      const action = {
        ArrowRight: () => {
          if (!isMenubarHorizontal) return;
          return parentMenubar.next();
        },
        ArrowLeft: () => {
          if (!isMenubarHorizontal) return;
          return parentMenubar.previous();
        },
        ArrowDown: () => {
          if (isMenubarHorizontal) return;
          return parentMenubar.next();
        },
        ArrowUp: () => {
          if (isMenubarHorizontal) return;
          return parentMenubar.previous();
        }
      }[event.key];
      const id2 = action == null ? void 0 : action();
      if (id2 !== void 0) {
        event.stopPropagation();
        event.preventDefault();
        parentMenubar.move(id2);
      }
    }
  });
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, MenuScopedContextProvider, {
    value: store,
    children: element
  }), [store]);
  const ariaLabelledBy = useAriaLabelledBy({
    store,
    ...props
  });
  const hidden = _WYI5CKPVcjs.isHidden.call(void 0, _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "mounted"), props.hidden, alwaysVisible);
  const style = hidden ? {
    ...props.style,
    display: "none"
  } : props.style;
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, MenuListHiddenContext.Provider, {
    value: hidden,
    children: element
  }), [hidden]);
  props = {
    "aria-labelledby": ariaLabelledBy,
    hidden,
    ...props,
    id,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, id ? store.setContentElement : null, props.ref),
    style,
    onKeyDown
  };
  const hasCombobox = !!store.combobox;
  composite = composite != null ? composite : !hasCombobox;
  if (composite) props = {
    role: "menu",
    "aria-orientation": orientation,
    ...props
  };
  props = _US2XYAXEcjs.useComposite.call(void 0, {
    store,
    composite,
    ...props
  });
  props = _IGWSYIUYcjs.useCompositeTypeahead.call(void 0, {
    store,
    typeahead: !hasCombobox,
    ...props
  });
  return props;
});
var MenuList = _JBOLBTVUcjs.forwardRef.call(void 0, function MenuList2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useMenuList(props));
});

// ../ariakit-react-components/dist/menu/menu.js

var TagName2 = "div";
var useMenu = _JBOLBTVUcjs.createHook.call(void 0, function useMenu2({ store, modal: modalProp = false, portal = modalProp, hideOnEscape = true, autoFocusOnShow = true, hideOnHoverOutside, alwaysVisible, ...props }) {
  const context = useMenuProviderContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "Menu must receive a `store` prop or be wrapped in a MenuProvider component.");
  const ref = _react.useRef.call(void 0, null);
  const parentMenu = store.parent;
  const parentMenubar = store.menubar;
  const hasParentMenu = !!parentMenu;
  const parentIsMenubar = !!parentMenubar && !hasParentMenu;
  const modal = hasParentMenu ? false : modalProp;
  props = {
    ...props,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref)
  };
  const { "aria-labelledby": ariaLabelledBy, ...menuListProps } = useMenuList({
    store,
    alwaysVisible,
    ...props
  });
  props = menuListProps;
  const [initialFocusRef, setInitialFocusRef] = _react.useState.call(void 0, );
  const autoFocusOnShowState = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "autoFocusOnShow");
  const initialFocus = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "initialFocus");
  const baseElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "baseElement");
  const items = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "renderedItems");
  _react.useEffect.call(void 0, () => {
    let cleaning = false;
    setInitialFocusRef((prevInitialFocusRef) => {
      var _a, _b, _c;
      if (cleaning) return;
      if (modal && ((_a = prevInitialFocusRef == null ? void 0 : prevInitialFocusRef.current) == null ? void 0 : _a.isConnected)) return prevInitialFocusRef;
      if (!autoFocusOnShowState) return;
      let element;
      switch (initialFocus) {
        case "first":
          element = ((_b = items.find((item) => !item.disabled && item.element)) == null ? void 0 : _b.element) || null;
          break;
        case "last":
          element = ((_c = [...items].reverse().find((item) => !item.disabled && item.element)) == null ? void 0 : _c.element) || null;
          break;
        default:
          element = baseElement;
      }
      if (element && element === (prevInitialFocusRef == null ? void 0 : prevInitialFocusRef.current)) return prevInitialFocusRef;
      const ref2 = _react.createRef.call(void 0, );
      ref2.current = element;
      return ref2;
    });
    return () => {
      cleaning = true;
    };
  }, [
    store,
    modal,
    autoFocusOnShowState,
    initialFocus,
    items,
    baseElement
  ]);
  const canAutoFocusOnShow = !!initialFocusRef || !!props.initialFocus || modal;
  const autoFocusOnShowProp = autoFocusOnShow === false ? false : canAutoFocusOnShow && autoFocusOnShow;
  const contentElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store.combobox || store, "contentElement");
  const parentContentElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, (parentMenu == null ? void 0 : parentMenu.combobox) || parentMenu, "contentElement");
  const preserveTabOrderAnchor = _react.useMemo.call(void 0, () => {
    if (!parentContentElement) return;
    if (!contentElement) return;
    const role = contentElement.getAttribute("role");
    const parentRole = parentContentElement.getAttribute("role");
    if ((parentRole === "menu" || parentRole === "menubar") && role === "menu") return;
    return parentContentElement;
  }, [contentElement, parentContentElement]);
  if (preserveTabOrderAnchor !== void 0) props = {
    preserveTabOrderAnchor,
    ...props
  };
  props = _HCYQ5Z7Zcjs.useHovercard.call(void 0, {
    store,
    alwaysVisible,
    initialFocus: initialFocusRef,
    autoFocusOnShow: autoFocusOnShowProp,
    ...props,
    hideOnEscape(event) {
      if (_JBOLBTVUcjs.isFalsyBooleanCallback.call(void 0, hideOnEscape, event)) return false;
      store == null ? void 0 : store.hideAll();
      return true;
    },
    hideOnHoverOutside(event) {
      const disclosureElement = store == null ? void 0 : store.getState().disclosureElement;
      const getHideOnHoverOutside = () => {
        if (typeof hideOnHoverOutside === "function") return hideOnHoverOutside(event);
        if (hideOnHoverOutside != null) return hideOnHoverOutside;
        if (hasParentMenu) return true;
        if (!parentIsMenubar) return false;
        if (!disclosureElement) return true;
        if (_JBOLBTVUcjs.hasFocusWithin.call(void 0, disclosureElement)) return false;
        return true;
      };
      if (!getHideOnHoverOutside()) return false;
      if (event.defaultPrevented) return true;
      if (!hasParentMenu) return true;
      if (!disclosureElement) return true;
      _JBOLBTVUcjs.fireEvent.call(void 0, disclosureElement, "mouseout", event);
      if (!_JBOLBTVUcjs.hasFocusWithin.call(void 0, disclosureElement)) return true;
      requestAnimationFrame(() => {
        if (_JBOLBTVUcjs.hasFocusWithin.call(void 0, disclosureElement)) return;
        store == null ? void 0 : store.hide();
      });
      return false;
    },
    modal,
    portal,
    backdrop: hasParentMenu ? false : props.backdrop
  });
  props = {
    "aria-labelledby": ariaLabelledBy,
    ...props
  };
  return props;
});
var Menu = _QJQWEU4Qcjs.createDialogComponent.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function Menu2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName2, useMenu(props));
}), useMenuProviderContext);

// ../ariakit-react-components/dist/menu/menu-arrow.js
var TagName3 = "div";
var useMenuArrow = _JBOLBTVUcjs.createHook.call(void 0, function useMenuArrow2({ store, ...props }) {
  const context = useMenuContext();
  store = store || context;
  return _AI3BA27Gcjs.usePopoverArrow.call(void 0, {
    store,
    ...props
  });
});
var MenuArrow = _JBOLBTVUcjs.forwardRef.call(void 0, function MenuArrow2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName3, useMenuArrow(props));
});

// ../ariakit-react-components/dist/menu/menu-bar.js

var TagName4 = "div";
var useMenuBar = _JBOLBTVUcjs.createHook.call(void 0, function useMenuBar2(props) {
  _react.useEffect.call(void 0, () => {
    if (process.env.NODE_ENV !== "production") console.warn("MenuBar is deprecated. Use Menubar instead.", "See https://ariakit.com/reference/menubar");
  }, []);
  return _I4JS2KAFcjs.useMenubar.call(void 0, props);
});
var MenuBar = _JBOLBTVUcjs.forwardRef.call(void 0, function MenuBar2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName4, useMenuBar(props));
});

// ../ariakit-react-components/dist/menu/menu-bar-provider.js


function MenuBarProvider(props = {}) {
  _react.useEffect.call(void 0, () => {
    if (process.env.NODE_ENV !== "production") console.warn("MenuBarProvider is deprecated. Use MenubarProvider instead.", "See https://ariakit.com/reference/menubar-provider");
  }, []);
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _I4JS2KAFcjs.MenubarProvider, { ...props });
}

// ../ariakit-react-components/dist/menu/menu-bar-store.js

function useMenuBarStore(props = {}) {
  _react.useEffect.call(void 0, () => {
    if (process.env.NODE_ENV !== "production") console.warn("useMenuBarStore is deprecated. Use useMenubarStore instead.", "See https://ariakit.com/reference/use-menubar-store");
  }, []);
  return _I4JS2KAFcjs.useMenubarStore.call(void 0, props);
}

// ../ariakit-react-components/dist/menu/menu-button.js


var TagName5 = "button";
function getInitialFocus(event, dir) {
  return {
    ArrowDown: dir === "bottom" || dir === "top" ? "first" : false,
    ArrowUp: dir === "bottom" || dir === "top" ? "last" : false,
    ArrowRight: dir === "right" ? "first" : false,
    ArrowLeft: dir === "left" ? "first" : false
  }[event.key];
}
function hasActiveItem(items, excludeElement) {
  return !!(items == null ? void 0 : items.some((item) => {
    if (!item.element) return false;
    if (item.element === excludeElement) return false;
    return item.element.getAttribute("aria-expanded") === "true";
  }));
}
var useMenuButton = _JBOLBTVUcjs.createHook.call(void 0, function useMenuButton2({ store, focusable, accessibleWhenDisabled, showOnHover, ...props }) {
  const context = useMenuProviderContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "MenuButton must receive a `store` prop or be wrapped in a MenuProvider component.");
  const ref = _react.useRef.call(void 0, null);
  const parentMenu = store.parent;
  const parentMenubar = store.menubar;
  const hasParentMenu = !!parentMenu;
  const parentIsMenubar = !!parentMenubar && !hasParentMenu;
  const disabled = _JBOLBTVUcjs.disabledFromProps.call(void 0, props);
  const isDisabled = (element) => disabled || _JBOLBTVUcjs.disabledFromElement.call(void 0, element);
  const showMenu = () => {
    const trigger = ref.current;
    if (!trigger) return;
    store == null ? void 0 : store.setDisclosureElement(trigger);
    store == null ? void 0 : store.setAnchorElement(trigger);
    store == null ? void 0 : store.show();
  };
  const onFocusProp = props.onFocus;
  const onFocus = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onFocusProp == null ? void 0 : onFocusProp(event);
    if (isDisabled(event.currentTarget)) return;
    if (event.defaultPrevented) return;
    store == null ? void 0 : store.setAutoFocusOnShow(false);
    store == null ? void 0 : store.setActiveId(null);
    if (!parentMenubar) return;
    if (!parentIsMenubar) return;
    const { items } = parentMenubar.getState();
    if (hasActiveItem(items, event.currentTarget)) showMenu();
  });
  const dir = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.placement.split("-")[0]);
  const onKeyDownProp = props.onKeyDown;
  const onKeyDown = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onKeyDownProp == null ? void 0 : onKeyDownProp(event);
    if (isDisabled(event.currentTarget)) return;
    if (event.defaultPrevented) return;
    const initialFocus = getInitialFocus(event, dir);
    if (initialFocus) {
      event.preventDefault();
      const { open } = store.getState();
      if (open) {
        const id2 = initialFocus === "last" ? store.last() : store.first();
        store.move(id2);
        return;
      }
      showMenu();
      store == null ? void 0 : store.setAutoFocusOnShow(true);
      store == null ? void 0 : store.setInitialFocus(initialFocus);
    }
  });
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    if (!store) return;
    const isKeyboardClick = !event.detail;
    const { open } = store.getState();
    if (!open || isKeyboardClick) {
      if (!hasParentMenu || isKeyboardClick) store.setAutoFocusOnShow(true);
      store.setInitialFocus(isKeyboardClick ? "first" : "container");
    }
    if (hasParentMenu) showMenu();
  });
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, MenuContextProvider, {
    value: store,
    children: element
  }), [store]);
  if (hasParentMenu) props = {
    ...props,
    render: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _CKHOJYDQcjs.Role.div, { render: props.render })
  };
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const parentContentElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, (parentMenu == null ? void 0 : parentMenu.combobox) || parentMenu, "contentElement");
  props = {
    role: hasParentMenu || parentIsMenubar ? _JBOLBTVUcjs.getPopupItemRole.call(void 0, parentContentElement, "menuitem") : void 0,
    "aria-haspopup": _JBOLBTVUcjs.getPopupRole.call(void 0, _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "contentElement"), !!store.combobox ? "dialog" : "menu"),
    ...props,
    id,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref),
    onFocus,
    onKeyDown,
    onClick
  };
  props = _HCYQ5Z7Zcjs.useHovercardAnchor.call(void 0, {
    store,
    focusable,
    accessibleWhenDisabled,
    ...props,
    showOnHover: (event) => {
      const getShowOnHover = () => {
        if (typeof showOnHover === "function") return showOnHover(event);
        if (showOnHover != null) return showOnHover;
        if (hasParentMenu) return true;
        if (!parentMenubar) return false;
        const { items } = parentMenubar.getState();
        return parentIsMenubar && hasActiveItem(items);
      };
      if (!getShowOnHover()) return false;
      const parent = parentIsMenubar ? parentMenubar : parentMenu;
      if (!parent) return true;
      parent.setActiveId(event.currentTarget.id);
      return true;
    }
  });
  props = _I6N3772Ncjs.usePopoverDisclosure.call(void 0, {
    store,
    toggleOnClick: !hasParentMenu,
    focusable,
    accessibleWhenDisabled,
    ...props
  });
  props = _IGWSYIUYcjs.useCompositeTypeahead.call(void 0, {
    store,
    typeahead: parentIsMenubar,
    ...props
  });
  return props;
});
var MenuButton = _JBOLBTVUcjs.forwardRef.call(void 0, function MenuButton2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName5, useMenuButton(props));
});

// ../ariakit-react-components/dist/menu/menu-button-arrow.js
var TagName6 = "span";
var useMenuButtonArrow = _JBOLBTVUcjs.createHook.call(void 0, function useMenuButtonArrow2({ store, ...props }) {
  const context = useMenuContext();
  store = store || context;
  props = _I6N3772Ncjs.usePopoverDisclosureArrow.call(void 0, {
    store,
    ...props
  });
  return props;
});
var MenuButtonArrow = _JBOLBTVUcjs.forwardRef.call(void 0, function MenuButtonArrow2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName6, useMenuButtonArrow(props));
});

// ../ariakit-react-components/dist/menu/menu-description.js
var TagName7 = "p";
var useMenuDescription = _JBOLBTVUcjs.createHook.call(void 0, function useMenuDescription2(props) {
  props = _P6Y2DILAcjs.useHovercardDescription.call(void 0, props);
  return props;
});
var MenuDescription = _JBOLBTVUcjs.forwardRef.call(void 0, function MenuDescription2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName7, useMenuDescription(props));
});

// ../ariakit-react-components/dist/menu/menu-dismiss.js
var TagName8 = "button";
var useMenuDismiss = _JBOLBTVUcjs.createHook.call(void 0, function useMenuDismiss2({ store, ...props }) {
  const context = useMenuScopedContext();
  store = store || context;
  props = _P6Y2DILAcjs.useHovercardDismiss.call(void 0, {
    store,
    ...props
  });
  return props;
});
var MenuDismiss = _JBOLBTVUcjs.forwardRef.call(void 0, function MenuDismiss2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName8, useMenuDismiss(props));
});

// ../ariakit-react-components/dist/menu/menu-group.js
var TagName9 = "div";
var useMenuGroup = _JBOLBTVUcjs.createHook.call(void 0, function useMenuGroup2(props) {
  props = _JXYV7OWFcjs.useCompositeGroup.call(void 0, props);
  return props;
});
var MenuGroup = _JBOLBTVUcjs.forwardRef.call(void 0, function MenuGroup2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName9, useMenuGroup(props));
});

// ../ariakit-react-components/dist/menu/menu-group-label.js
var TagName10 = "div";
var useMenuGroupLabel = _JBOLBTVUcjs.createHook.call(void 0, function useMenuGroupLabel2(props) {
  props = _JXYV7OWFcjs.useCompositeGroupLabel.call(void 0, props);
  return props;
});
var MenuGroupLabel = _JBOLBTVUcjs.forwardRef.call(void 0, function MenuGroupLabel2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName10, useMenuGroupLabel(props));
});

// ../ariakit-react-components/dist/menu/menu-heading.js
var TagName11 = "h1";
var useMenuHeading = _JBOLBTVUcjs.createHook.call(void 0, function useMenuHeading2(props) {
  props = _P6Y2DILAcjs.useHovercardHeading.call(void 0, props);
  return props;
});
var MenuHeading = _JBOLBTVUcjs.forwardRef.call(void 0, function MenuHeading2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName11, useMenuHeading(props));
});

// ../ariakit-react-components/dist/menu/menu-item.js

var TagName12 = "div";
function menuHasFocus(baseElement, items, currentTarget) {
  var _a, _b;
  if (!baseElement) return false;
  if (_JBOLBTVUcjs.hasFocusWithin.call(void 0, baseElement)) return true;
  const expandedMenuId = (_b = (_a = items == null ? void 0 : items.find((item) => {
    var _a2;
    if (item.element === currentTarget) return false;
    return ((_a2 = item.element) == null ? void 0 : _a2.getAttribute("aria-expanded")) === "true";
  })) == null ? void 0 : _a.element) == null ? void 0 : _b.getAttribute("aria-controls");
  if (!expandedMenuId) return false;
  const expandedMenu = _JBOLBTVUcjs.getDocument.call(void 0, baseElement).getElementById(expandedMenuId);
  if (!expandedMenu) return false;
  if (_JBOLBTVUcjs.hasFocusWithin.call(void 0, expandedMenu)) return true;
  return !!expandedMenu.querySelector("[role=menuitem][aria-expanded=true]");
}
var useMenuItem = _JBOLBTVUcjs.createHook.call(void 0, function useMenuItem2({ store, hideOnClick = true, preventScrollOnKeyDown = true, focusOnHover, blurOnHoverEnd, ...props }) {
  const menuContext = useMenuScopedContext(true);
  const menubarContext = _I4JS2KAFcjs.useMenubarScopedContext.call(void 0, );
  store = store || menuContext || menubarContext;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "MenuItem must be wrapped in a MenuList, Menu or Menubar component");
  const onClickProp = props.onClick;
  const hideOnClickProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, hideOnClick);
  const hideMenu = "hideAll" in store ? store.hideAll : void 0;
  const isWithinMenu = !!hideMenu;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    if (_JBOLBTVUcjs.isDownloading.call(void 0, event)) return;
    if (_JBOLBTVUcjs.isOpeningInNewTab.call(void 0, event)) return;
    if (!hideMenu) return;
    const popupType = event.currentTarget.getAttribute("aria-haspopup");
    if (popupType && popupType !== "false") return;
    if (!hideOnClickProp(event)) return;
    hideMenu();
  });
  const contentElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => "contentElement" in state ? state.contentElement : null);
  const menuListHidden = _react.useContext.call(void 0, MenuListHiddenContext);
  props = {
    role: _JBOLBTVUcjs.getPopupItemRole.call(void 0, contentElement, "menuitem"),
    ...props,
    onClick
  };
  props = _ZPWE3FTFcjs.useCompositeItem.call(void 0, {
    store,
    preventScrollOnKeyDown,
    ...props,
    shouldRegisterItem: menuListHidden ? false : props.shouldRegisterItem
  });
  props = _JXYV7OWFcjs.useCompositeHover.call(void 0, {
    store,
    ...props,
    focusOnHover(event) {
      const getFocusOnHover = () => {
        if (typeof focusOnHover === "function") return focusOnHover(event);
        if (focusOnHover != null) return focusOnHover;
        return true;
      };
      if (!store) return false;
      if (!getFocusOnHover()) return false;
      const { baseElement, items } = store.getState();
      if (isWithinMenu) {
        if (event.currentTarget.hasAttribute("aria-expanded")) event.currentTarget.focus();
        return true;
      }
      if (menuHasFocus(baseElement, items, event.currentTarget)) {
        event.currentTarget.focus();
        return true;
      }
      return false;
    },
    blurOnHoverEnd(event) {
      if (typeof blurOnHoverEnd === "function") return blurOnHoverEnd(event);
      if (blurOnHoverEnd != null) return blurOnHoverEnd;
      return isWithinMenu;
    }
  });
  return props;
});
var MenuItem = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function MenuItem2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName12, useMenuItem(props));
}));

// ../ariakit-react-components/dist/menu/menu-item-check.js

var TagName13 = "span";
var useMenuItemCheck = _JBOLBTVUcjs.createHook.call(void 0, function useMenuItemCheck2({ store, checked, ...props }) {
  const context = _react.useContext.call(void 0, MenuItemCheckedContext);
  checked = checked != null ? checked : context;
  props = _5QRVCRDIcjs.useCheckboxCheck.call(void 0, {
    ...props,
    checked
  });
  return props;
});
var MenuItemCheck = _JBOLBTVUcjs.forwardRef.call(void 0, function MenuItemCheck2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName13, useMenuItemCheck(props));
});

// ../ariakit-react-components/dist/menu/menu-item-checkbox.js

var TagName14 = "div";
function getPrimitiveValue(value) {
  if (Array.isArray(value)) return value.toString();
  return value;
}
function getValue(storeValue, value, checked) {
  if (value === void 0) {
    if (Array.isArray(storeValue)) return storeValue;
    return !!checked;
  }
  const primitiveValue = getPrimitiveValue(value);
  if (!Array.isArray(storeValue)) {
    if (checked) return primitiveValue;
    return storeValue === primitiveValue ? false : storeValue;
  }
  if (checked) {
    if (storeValue.includes(primitiveValue)) return storeValue;
    return [...storeValue, primitiveValue];
  }
  return storeValue.filter((v) => v !== primitiveValue);
}
var useMenuItemCheckbox = _JBOLBTVUcjs.createHook.call(void 0, function useMenuItemCheckbox2({ store, name, value, checked, defaultChecked: defaultCheckedProp, hideOnClick = false, ...props }) {
  const context = useMenuScopedContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "MenuItemCheckbox must be wrapped in a MenuList or Menu component");
  const defaultChecked = _JBOLBTVUcjs.useInitialValue.call(void 0, defaultCheckedProp);
  _react.useEffect.call(void 0, () => {
    store == null ? void 0 : store.setValue(name, (prevValue = []) => {
      if (!defaultChecked) return prevValue;
      return getValue(prevValue, value, true);
    });
  }, [
    store,
    name,
    value,
    defaultChecked
  ]);
  _react.useEffect.call(void 0, () => {
    if (checked === void 0) return;
    store == null ? void 0 : store.setValue(name, (prevValue) => {
      return getValue(prevValue, value, checked);
    });
  }, [
    store,
    name,
    value,
    checked
  ]);
  const checkboxStore = _IEVLYJJPcjs.useCheckboxStore.call(void 0, {
    value: _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.values[name]),
    setValue(internalValue) {
      store == null ? void 0 : store.setValue(name, () => {
        if (checked === void 0) return internalValue;
        const nextValue = getValue(internalValue, value, checked);
        if (!Array.isArray(nextValue)) return nextValue;
        if (!Array.isArray(internalValue)) return nextValue;
        if (_JBOLBTVUcjs.shallowEqual.call(void 0, internalValue, nextValue)) return internalValue;
        return nextValue;
      });
    }
  });
  props = {
    role: "menuitemcheckbox",
    ...props
  };
  props = _IEVLYJJPcjs.useCheckbox.call(void 0, {
    store: checkboxStore,
    name,
    value,
    checked,
    ...props
  });
  props = useMenuItem({
    store,
    hideOnClick,
    ...props
  });
  return props;
});
var MenuItemCheckbox = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function MenuItemCheckbox2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName14, useMenuItemCheckbox(props));
}));

// ../ariakit-react-components/dist/menu/menu-item-radio.js


var TagName15 = "div";
function getValue2(prevValue, value, checked) {
  if (checked === void 0) return prevValue;
  if (checked) return value;
  return prevValue === value ? false : prevValue;
}
var useMenuItemRadio = _JBOLBTVUcjs.createHook.call(void 0, function useMenuItemRadio2({ store, name, value, checked, onChange: onChangeProp, hideOnClick = false, ...props }) {
  const context = useMenuScopedContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "MenuItemRadio must be wrapped in a MenuList or Menu component");
  const defaultChecked = _JBOLBTVUcjs.useInitialValue.call(void 0, props.defaultChecked);
  _react.useEffect.call(void 0, () => {
    store == null ? void 0 : store.setValue(name, (prevValue = false) => {
      return getValue2(prevValue, value, defaultChecked);
    });
  }, [
    store,
    name,
    value,
    defaultChecked
  ]);
  _react.useEffect.call(void 0, () => {
    if (checked === void 0) return;
    store == null ? void 0 : store.setValue(name, (prevValue) => {
      return getValue2(prevValue, value, checked);
    });
  }, [
    store,
    name,
    value,
    checked
  ]);
  const isChecked = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.values[name] === value);
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, MenuItemCheckedContext.Provider, {
    value: isChecked,
    children: element
  }), [isChecked]);
  props = {
    role: "menuitemradio",
    ...props
  };
  props = _M6YHODMVcjs.useRadio.call(void 0, {
    name,
    value,
    checked: isChecked,
    onChange(event) {
      onChangeProp == null ? void 0 : onChangeProp(event);
      if (event.defaultPrevented) return;
      const element = event.currentTarget;
      store == null ? void 0 : store.setValue(name, (prevValue) => {
        return getValue2(prevValue, value, checked != null ? checked : element.checked);
      });
    },
    ...props
  });
  props = useMenuItem({
    store,
    hideOnClick,
    ...props
  });
  return props;
});
var MenuItemRadio = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function MenuItemRadio2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName15, useMenuItemRadio(props));
}));

// ../ariakit-components/dist/menu/menu-store.js
function createMenuStore({ combobox, parent, menubar, ...props } = {}) {
  const parentIsMenubar = !!menubar && !parent;
  const store = _FHPV2Q7Ccjs.mergeStore.call(void 0, props.store, _FHPV2Q7Ccjs.pick.call(void 0, parent, ["values"]), _FHPV2Q7Ccjs.omit.call(void 0, combobox, [
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
    orientation: _JBOLBTVUcjs.defaultValue.call(void 0, props.orientation, syncState.orientation, "vertical")
  });
  const hovercard = _HCYQ5Z7Zcjs.createHovercardStore.call(void 0, {
    ...props,
    store,
    placement: _JBOLBTVUcjs.defaultValue.call(void 0, props.placement, syncState.placement, "bottom-start"),
    timeout: _JBOLBTVUcjs.defaultValue.call(void 0, props.timeout, syncState.timeout, parentIsMenubar ? 0 : 150),
    hideTimeout: _JBOLBTVUcjs.defaultValue.call(void 0, props.hideTimeout, syncState.hideTimeout, 0)
  });
  const menu2 = _FHPV2Q7Ccjs.createStore.call(void 0, {
    ...composite.getState(),
    ...hovercard.getState(),
    initialFocus: _JBOLBTVUcjs.defaultValue.call(void 0, syncState.initialFocus, "container"),
    values: _JBOLBTVUcjs.defaultValue.call(void 0, props.values, syncState.values, props.defaultValues, {})
  }, composite, hovercard, store);
  _FHPV2Q7Ccjs.setup.call(void 0, menu2, () => _FHPV2Q7Ccjs.sync.call(void 0, menu2, ["mounted"], (state) => {
    if (state.mounted) return;
    menu2.setState("activeId", null);
  }));
  _FHPV2Q7Ccjs.setup.call(void 0, menu2, () => _FHPV2Q7Ccjs.sync.call(void 0, parent, ["orientation"], (state) => {
    menu2.setState("placement", state.orientation === "vertical" ? "right-start" : "bottom-start");
  }));
  return {
    ...composite,
    ...hovercard,
    ...menu2,
    combobox,
    parent,
    menubar,
    hideAll: () => {
      hovercard.hide();
      parent == null ? void 0 : parent.hideAll();
    },
    setInitialFocus: (value) => menu2.setState("initialFocus", value),
    setValues: (values) => menu2.setState("values", values),
    setValue: (name, value) => {
      if (name === "__proto__") return;
      if (name === "constructor") return;
      if (Array.isArray(name)) return;
      menu2.setState("values", (values) => {
        const prevValue = values[name];
        const nextValue = _JBOLBTVUcjs.applyState.call(void 0, value, prevValue);
        if (nextValue === prevValue) return values;
        return {
          ...values,
          [name]: nextValue !== void 0 && nextValue
        };
      });
    }
  };
}

// ../ariakit-react-components/dist/menu/menu-store.js
function useMenuStoreProps(store, update, props) {
  _JBOLBTVUcjs.useUpdateEffect.call(void 0, update, [
    props.combobox,
    props.parent,
    props.menubar
  ]);
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "values", "setValues");
  return Object.assign(_HCYQ5Z7Zcjs.useHovercardStoreProps.call(void 0, _US2XYAXEcjs.useCompositeStoreProps.call(void 0, store, update, props), update, props), {
    combobox: props.combobox,
    parent: props.parent,
    menubar: props.menubar
  });
}
function useMenuStore(props = {}) {
  const parent = useMenuContext();
  const menubar = _I4JS2KAFcjs.useMenubarContext.call(void 0, );
  const combobox = _FNYFMCD7cjs.useComboboxProviderContext.call(void 0, );
  props = {
    ...props,
    parent: props.parent !== void 0 ? props.parent : parent,
    menubar: props.menubar !== void 0 ? props.menubar : menubar,
    combobox: props.combobox !== void 0 ? props.combobox : combobox
  };
  const [store, update] = _FHPV2Q7Ccjs.useStore.call(void 0, createMenuStore, props);
  return useMenuStoreProps(store, update, props);
}

// ../ariakit-react-components/dist/menu/menu-provider.js

function MenuProvider(props = {}) {
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, MenuContextProvider, {
    value: useMenuStore(props),
    children: props.children
  });
}

// ../ariakit-react-components/dist/menu/menu-separator.js
var TagName16 = "hr";
var useMenuSeparator = _JBOLBTVUcjs.createHook.call(void 0, function useMenuSeparator2({ store, ...props }) {
  const context = useMenuContext();
  store = store || context;
  props = _WLHP5OM6cjs.useCompositeSeparator.call(void 0, {
    store,
    ...props
  });
  return props;
});
var MenuSeparator = _JBOLBTVUcjs.forwardRef.call(void 0, function MenuSeparator2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName16, useMenuSeparator(props));
});
























exports.useMenuContext = useMenuContext; exports.useMenuBarContext = useMenuBarContext; exports.MenuList = MenuList; exports.Menu = Menu; exports.MenuArrow = MenuArrow; exports.MenuBar = MenuBar; exports.MenuBarProvider = MenuBarProvider; exports.useMenuBarStore = useMenuBarStore; exports.MenuButton = MenuButton; exports.MenuButtonArrow = MenuButtonArrow; exports.MenuDescription = MenuDescription; exports.MenuDismiss = MenuDismiss; exports.MenuGroup = MenuGroup; exports.MenuGroupLabel = MenuGroupLabel; exports.MenuHeading = MenuHeading; exports.MenuItem = MenuItem; exports.MenuItemCheck = MenuItemCheck; exports.MenuItemCheckbox = MenuItemCheckbox; exports.MenuItemRadio = MenuItemRadio; exports.useMenuStore = useMenuStore; exports.MenuProvider = MenuProvider; exports.MenuSeparator = MenuSeparator;
