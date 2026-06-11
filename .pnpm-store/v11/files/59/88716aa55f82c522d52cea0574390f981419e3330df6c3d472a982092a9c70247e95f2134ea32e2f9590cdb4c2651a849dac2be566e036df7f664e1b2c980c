"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _D6USTXKAcjs = require('./D6USTXKA.cjs');


var _FNYFMCD7cjs = require('./FNYFMCD7.cjs');




var _US2XYAXEcjs = require('./US2XYAXE.cjs');



var _ZPWE3FTFcjs = require('./ZPWE3FTF.cjs');



var _2WBRQ3I7cjs = require('./2WBRQ3I7.cjs');


var _VUISVT3Vcjs = require('./VUISVT3V.cjs');


var _42GL4LKIcjs = require('./42GL4LKI.cjs');



var _WYI5CKPVcjs = require('./WYI5CKPV.cjs');










var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');


var _BTARPES4cjs = require('./BTARPES4.cjs');

















var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/tab/tab-context.js
var ctx = _JBOLBTVUcjs.createStoreContext.call(void 0, [_2WBRQ3I7cjs.CompositeContextProvider], [_2WBRQ3I7cjs.CompositeScopedContextProvider]);
var useTabContext = ctx.useContext;
var useTabScopedContext = ctx.useScopedContext;
var useTabProviderContext = ctx.useProviderContext;
var TabContextProvider = ctx.ContextProvider;
var TabScopedContextProvider = ctx.ScopedContextProvider;

// ../ariakit-react-components/dist/tab/tab.js
var _react = require('react');
var _jsxruntime = require('react/jsx-runtime');
var TagName = "button";
var useTab = _JBOLBTVUcjs.createHook.call(void 0, function useTab2({ store, getItem: getItemProp, ...props }) {
  var _a;
  const context = useTabScopedContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "Tab must be wrapped in a TabList component.");
  const defaultId = _JBOLBTVUcjs.useId.call(void 0, );
  const id = props.id || defaultId;
  const dimmed = _JBOLBTVUcjs.disabledFromProps.call(void 0, props);
  const getItem = _react.useCallback.call(void 0, (item) => {
    const nextItem = {
      ...item,
      dimmed
    };
    if (getItemProp) return getItemProp(nextItem);
    return nextItem;
  }, [dimmed, getItemProp]);
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    store == null ? void 0 : store.setSelectedId(id);
  });
  const panelId = _FHPV2Q7Ccjs.useStoreState.call(void 0, store.panels, (state) => {
    var _a2;
    return (_a2 = state.items.find((item) => item.tabId === id)) == null ? void 0 : _a2.id;
  });
  const shouldRegisterItem = defaultId ? props.shouldRegisterItem : false;
  const isActive = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => !!id && state.activeId === id);
  const selected = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => !!id && state.selectedId === id);
  const hasActiveItem = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => !!store.item(state.activeId));
  const canRegisterComposedItem = isActive || selected && !hasActiveItem;
  const accessibleWhenDisabled = selected || ((_a = props.accessibleWhenDisabled) != null ? _a : true);
  if (_FHPV2Q7Ccjs.useStoreState.call(void 0, store.combobox || store.composite, "virtualFocus")) props = {
    ...props,
    tabIndex: -1
  };
  props = {
    role: "tab",
    "aria-selected": selected,
    "aria-controls": panelId || void 0,
    ...props,
    id,
    onClick
  };
  if (store.composite) {
    const defaultProps = {
      id,
      accessibleWhenDisabled,
      store: store.composite,
      shouldRegisterItem: canRegisterComposedItem && shouldRegisterItem,
      rowId: props.rowId,
      render: props.render
    };
    props = {
      ...props,
      render: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _ZPWE3FTFcjs.CompositeItem, {
        ...defaultProps,
        render: store.combobox && store.composite !== store.combobox ? /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _ZPWE3FTFcjs.CompositeItem, {
          ...defaultProps,
          store: store.combobox
        }) : defaultProps.render
      })
    };
  }
  props = _ZPWE3FTFcjs.useCompositeItem.call(void 0, {
    store,
    ...props,
    accessibleWhenDisabled,
    getItem,
    shouldRegisterItem
  });
  return props;
});
var Tab = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function Tab2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useTab(props));
}));

// ../ariakit-react-components/dist/tab/tab-list.js

var TagName2 = "div";
var useTabList = _JBOLBTVUcjs.createHook.call(void 0, function useTabList2({ store, ...props }) {
  const context = useTabProviderContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "TabList must receive a `store` prop or be wrapped in a TabProvider component.");
  const orientation = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.orientation === "both" ? void 0 : state.orientation);
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, TabScopedContextProvider, {
    value: store,
    children: element
  }), [store]);
  if (store.composite) props = {
    focusable: false,
    ...props
  };
  props = {
    role: "tablist",
    "aria-orientation": orientation,
    ...props
  };
  props = _US2XYAXEcjs.useComposite.call(void 0, {
    store,
    ...props
  });
  return props;
});
var TabList = _JBOLBTVUcjs.forwardRef.call(void 0, function TabList2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName2, useTabList(props));
});

// ../ariakit-react-components/dist/tab/tab-panel.js


var TagName3 = "div";
var useTabPanel = _JBOLBTVUcjs.createHook.call(void 0, function useTabPanel2({ store, unmountOnHide, tabId: tabIdProp, getItem: getItemProp, scrollRestoration, scrollElement, ...props }) {
  const context = useTabProviderContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "TabPanel must receive a `store` prop or be wrapped in a TabProvider component.");
  const ref = _react.useRef.call(void 0, null);
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const tabId = _FHPV2Q7Ccjs.useStoreState.call(void 0, store.panels, () => {
    var _a;
    return tabIdProp || ((_a = store == null ? void 0 : store.panels.item(id)) == null ? void 0 : _a.tabId);
  });
  const disclosure = _WYI5CKPVcjs.useDisclosureStore.call(void 0, { open: _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => !!tabId && state.selectedId === tabId) });
  const mounted = _FHPV2Q7Ccjs.useStoreState.call(void 0, disclosure, "mounted");
  const scrollPositionRef = _react.useRef.call(void 0, /* @__PURE__ */ new Map());
  const getScrollElement = _JBOLBTVUcjs.useEvent.call(void 0, () => {
    const panelElement = ref.current;
    if (!panelElement) return null;
    if (!scrollElement) return panelElement;
    if (typeof scrollElement === "function") return scrollElement(panelElement);
    if ("current" in scrollElement) return scrollElement.current;
    return scrollElement;
  });
  _react.useEffect.call(void 0, () => {
    var _a, _b;
    if (!scrollRestoration) return;
    if (!mounted) return;
    const element = getScrollElement();
    if (!element) return;
    if (scrollRestoration === "reset") {
      element.scroll(0, 0);
      return;
    }
    if (!tabId) return;
    const position = scrollPositionRef.current.get(tabId);
    element.scroll((_a = position == null ? void 0 : position.x) != null ? _a : 0, (_b = position == null ? void 0 : position.y) != null ? _b : 0);
    const onScroll = () => {
      scrollPositionRef.current.set(tabId, {
        x: element.scrollLeft,
        y: element.scrollTop
      });
    };
    element.addEventListener("scroll", onScroll);
    return () => {
      element.removeEventListener("scroll", onScroll);
    };
  }, [
    scrollRestoration,
    mounted,
    tabId,
    getScrollElement
  ]);
  const [hasTabbableChildren, setHasTabbableChildren] = _react.useState.call(void 0, false);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    if (!mounted) return;
    const element = ref.current;
    if (!element) return;
    setHasTabbableChildren(!!_JBOLBTVUcjs.getAllTabbableIn.call(void 0, element).length);
  }, [mounted]);
  const getItem = _react.useCallback.call(void 0, (item) => {
    const nextItem = {
      ...item,
      id: id || item.id,
      tabId: tabIdProp
    };
    if (getItemProp) return getItemProp(nextItem);
    return nextItem;
  }, [
    id,
    tabIdProp,
    getItemProp
  ]);
  const onKeyDownProp = props.onKeyDown;
  const onKeyDown = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onKeyDownProp == null ? void 0 : onKeyDownProp(event);
    if (event.defaultPrevented) return;
    if (!(store == null ? void 0 : store.composite)) return;
    const action = {
      ArrowLeft: store.previous,
      ArrowRight: store.next,
      Home: store.first,
      End: store.last
    }[event.key];
    if (!action) return;
    const { selectedId } = store.getState();
    const nextId = action({ activeId: selectedId });
    if (!nextId) return;
    event.preventDefault();
    store.move(nextId);
  });
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, TabScopedContextProvider, {
    value: store,
    children: element
  }), [store]);
  props = {
    role: "tabpanel",
    "aria-labelledby": props["aria-label"] != null ? void 0 : tabId || void 0,
    ...props,
    id,
    children: unmountOnHide && !mounted ? null : props.children,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref),
    onKeyDown
  };
  props = _BTARPES4cjs.useFocusable.call(void 0, {
    focusable: !store.composite && !hasTabbableChildren,
    ...props
  });
  props = _WYI5CKPVcjs.useDisclosureContent.call(void 0, {
    store: disclosure,
    ...props
  });
  props = _VUISVT3Vcjs.useCollectionItem.call(void 0, {
    store: store.panels,
    ...props,
    getItem
  });
  return props;
});
var TabPanel = _JBOLBTVUcjs.forwardRef.call(void 0, function TabPanel2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName3, useTabPanel(props));
});

// ../ariakit-react-components/dist/tab/tab-store.js


// ../ariakit-components/dist/tab/tab-store.js
function getFocusedTab(items) {
  var _a, _b;
  const activeElement = (_b = (_a = items[0]) == null ? void 0 : _a.element) == null ? void 0 : _b.ownerDocument.activeElement;
  if (!activeElement) return;
  return items.find((item) => item.element === activeElement);
}
function getTabById(items, id) {
  if (id == null) return;
  return items.find((item) => item.id === id);
}
function isEnabledTab(item) {
  if (!item) return false;
  if (item.disabled) return false;
  if (item.dimmed) return false;
  return true;
}
function createTabStore({ composite: parentComposite, combobox, ...props } = {}) {
  const independentKeys = [
    "items",
    "renderedItems",
    "moves",
    "orientation",
    "virtualFocus",
    "includesBaseElement",
    "baseElement",
    "focusLoop",
    "focusShift",
    "focusWrap"
  ];
  const store = _FHPV2Q7Ccjs.mergeStore.call(void 0, props.store, _FHPV2Q7Ccjs.omit.call(void 0, parentComposite, independentKeys), _FHPV2Q7Ccjs.omit.call(void 0, combobox, independentKeys));
  const syncState = store == null ? void 0 : store.getState();
  const composite = _US2XYAXEcjs.createCompositeStore.call(void 0, {
    ...props,
    store,
    includesBaseElement: _JBOLBTVUcjs.defaultValue.call(void 0, props.includesBaseElement, syncState == null ? void 0 : syncState.includesBaseElement, false),
    orientation: _JBOLBTVUcjs.defaultValue.call(void 0, props.orientation, syncState == null ? void 0 : syncState.orientation, "horizontal"),
    focusLoop: _JBOLBTVUcjs.defaultValue.call(void 0, props.focusLoop, syncState == null ? void 0 : syncState.focusLoop, true)
  });
  const panels = _42GL4LKIcjs.createCollectionStore.call(void 0, );
  const tab = _FHPV2Q7Ccjs.createStore.call(void 0, {
    ...composite.getState(),
    selectedId: _JBOLBTVUcjs.defaultValue.call(void 0, props.selectedId, syncState == null ? void 0 : syncState.selectedId, props.defaultSelectedId),
    selectOnMove: _JBOLBTVUcjs.defaultValue.call(void 0, props.selectOnMove, syncState == null ? void 0 : syncState.selectOnMove, true)
  }, composite, store);
  _FHPV2Q7Ccjs.setup.call(void 0, tab, () => _FHPV2Q7Ccjs.sync.call(void 0, tab, ["moves"], () => {
    const { activeId, selectOnMove } = tab.getState();
    if (!selectOnMove) return;
    if (!activeId) return;
    const tabItem = composite.item(activeId);
    if (!isEnabledTab(tabItem)) return;
    tab.setState("selectedId", tabItem.id);
  }));
  let syncActiveId = true;
  _FHPV2Q7Ccjs.setup.call(void 0, tab, () => _FHPV2Q7Ccjs.batch.call(void 0, tab, ["selectedId"], (state, prev) => {
    if (!syncActiveId) {
      syncActiveId = true;
      return;
    }
    if (parentComposite && state.selectedId === prev.selectedId) return;
    const { activeId, renderedItems } = tab.getState();
    const focusedTab = getFocusedTab(renderedItems);
    const selectedTab = getTabById(renderedItems, state.selectedId);
    if (focusedTab && isEnabledTab(selectedTab) && activeId !== selectedTab.id) {
      composite.move(selectedTab.id);
      return;
    }
    tab.setState("activeId", state.selectedId);
  }));
  _FHPV2Q7Ccjs.setup.call(void 0, tab, () => _FHPV2Q7Ccjs.sync.call(void 0, tab, ["selectedId", "renderedItems"], (state) => {
    if (state.selectedId !== void 0) return;
    const { activeId, renderedItems } = tab.getState();
    const tabItem = composite.item(activeId);
    if (isEnabledTab(tabItem)) tab.setState("selectedId", tabItem.id);
    else {
      const tabItem2 = renderedItems.find(isEnabledTab);
      tab.setState("selectedId", tabItem2 == null ? void 0 : tabItem2.id);
    }
  }));
  _FHPV2Q7Ccjs.setup.call(void 0, tab, () => _FHPV2Q7Ccjs.sync.call(void 0, tab, ["renderedItems"], (state) => {
    const tabs = state.renderedItems;
    if (!tabs.length) return;
    return _FHPV2Q7Ccjs.sync.call(void 0, panels, ["renderedItems"], (state2) => {
      const items = state2.renderedItems;
      if (!items.some((panel) => !panel.tabId)) return;
      items.forEach((panel, i) => {
        if (panel.tabId) return;
        const tabItem = tabs[i];
        if (!tabItem) return;
        panels.renderItem({
          ...panel,
          tabId: tabItem.id
        });
      });
    });
  }));
  let selectedIdFromSelectedValue = null;
  _FHPV2Q7Ccjs.setup.call(void 0, tab, () => {
    const backupSelectedId = () => {
      selectedIdFromSelectedValue = tab.getState().selectedId;
    };
    const restoreSelectedId = () => {
      syncActiveId = false;
      tab.setState("selectedId", selectedIdFromSelectedValue);
    };
    if (parentComposite && "setSelectElement" in parentComposite) return _JBOLBTVUcjs.chain.call(void 0, _FHPV2Q7Ccjs.sync.call(void 0, parentComposite, ["value"], backupSelectedId), _FHPV2Q7Ccjs.sync.call(void 0, parentComposite, ["mounted"], restoreSelectedId));
    if (!combobox) return;
    return _JBOLBTVUcjs.chain.call(void 0, _FHPV2Q7Ccjs.sync.call(void 0, combobox, ["selectedValue"], backupSelectedId), _FHPV2Q7Ccjs.sync.call(void 0, combobox, ["mounted"], restoreSelectedId));
  });
  return {
    ...composite,
    ...tab,
    panels,
    setSelectedId: (id) => tab.setState("selectedId", id),
    select: (id) => {
      tab.setState("selectedId", id);
      composite.move(id);
    }
  };
}

// ../ariakit-react-components/dist/tab/tab-store.js
function useTabStoreProps(store, update, props) {
  _JBOLBTVUcjs.useUpdateEffect.call(void 0, update, [props.composite, props.combobox]);
  store = _US2XYAXEcjs.useCompositeStoreProps.call(void 0, store, update, props);
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "selectedId", "setSelectedId");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "selectOnMove");
  const [panels, updatePanels] = _FHPV2Q7Ccjs.useStore.call(void 0, () => store.panels, {});
  _JBOLBTVUcjs.useUpdateEffect.call(void 0, updatePanels, [store, updatePanels]);
  return Object.assign(_react.useMemo.call(void 0, () => ({
    ...store,
    panels
  }), [store, panels]), {
    composite: props.composite,
    combobox: props.combobox
  });
}
function useTabStore(props = {}) {
  const combobox = _FNYFMCD7cjs.useComboboxContext.call(void 0, );
  const composite = _D6USTXKAcjs.useSelectContext.call(void 0, ) || combobox;
  props = {
    ...props,
    composite: props.composite !== void 0 ? props.composite : composite,
    combobox: props.combobox !== void 0 ? props.combobox : combobox
  };
  const [store, update] = _FHPV2Q7Ccjs.useStore.call(void 0, createTabStore, props);
  return useTabStoreProps(store, update, props);
}

// ../ariakit-react-components/dist/tab/tab-provider.js

function TabProvider(props = {}) {
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, TabContextProvider, {
    value: useTabStore(props),
    children: props.children
  });
}








exports.useTabContext = useTabContext; exports.Tab = Tab; exports.TabList = TabList; exports.TabPanel = TabPanel; exports.useTabStore = useTabStore; exports.TabProvider = TabProvider;
