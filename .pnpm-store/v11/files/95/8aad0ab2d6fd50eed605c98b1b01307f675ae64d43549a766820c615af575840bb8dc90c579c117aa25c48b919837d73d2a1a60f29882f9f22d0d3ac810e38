"use strict";Object.defineProperty(exports, "__esModule", {value: true});






var _HCYQ5Z7Zcjs = require('./HCYQ5Z7Z.cjs');


var _AI3BA27Gcjs = require('./AI3BA27G.cjs');


var _QJQWEU4Qcjs = require('./QJQWEU4Q.cjs');






var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');












var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/tooltip/tooltip-context.js
var ctx = _JBOLBTVUcjs.createStoreContext.call(void 0, [_HCYQ5Z7Zcjs.HovercardContextProvider], [_HCYQ5Z7Zcjs.HovercardScopedContextProvider]);
var useTooltipContext = ctx.useContext;
var useTooltipScopedContext = ctx.useScopedContext;
var useTooltipProviderContext = ctx.useProviderContext;
var TooltipContextProvider = ctx.ContextProvider;
var TooltipScopedContextProvider = ctx.ScopedContextProvider;

// ../ariakit-react-components/dist/tooltip/tooltip.js
var _jsxruntime = require('react/jsx-runtime');
var TagName = "div";
var useTooltip = _JBOLBTVUcjs.createHook.call(void 0, function useTooltip2({ store, portal = true, gutter = 8, preserveTabOrder = false, hideOnHoverOutside = true, hideOnInteractOutside = true, ...props }) {
  const context = useTooltipProviderContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "Tooltip must receive a `store` prop or be wrapped in a TooltipProvider component.");
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, TooltipScopedContextProvider, {
    value: store,
    children: element
  }), [store]);
  props = {
    role: _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.type === "description" ? "tooltip" : "none"),
    ...props
  };
  props = _HCYQ5Z7Zcjs.useHovercard.call(void 0, {
    ...props,
    store,
    portal,
    gutter,
    preserveTabOrder,
    hideOnHoverOutside(event) {
      if (_JBOLBTVUcjs.isFalsyBooleanCallback.call(void 0, hideOnHoverOutside, event)) return false;
      const anchorElement = store == null ? void 0 : store.getState().anchorElement;
      if (!anchorElement) return true;
      if ("focusVisible" in anchorElement.dataset) return false;
      return true;
    },
    hideOnInteractOutside: (event) => {
      if (_JBOLBTVUcjs.isFalsyBooleanCallback.call(void 0, hideOnInteractOutside, event)) return false;
      const anchorElement = store == null ? void 0 : store.getState().anchorElement;
      if (!anchorElement) return true;
      if (_JBOLBTVUcjs.contains.call(void 0, anchorElement, event.target)) return false;
      return true;
    }
  });
  return props;
});
var Tooltip = _QJQWEU4Qcjs.createDialogComponent.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function Tooltip2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useTooltip(props));
}), useTooltipProviderContext);

// ../ariakit-react-components/dist/tooltip/tooltip-anchor.js
var _react = require('react');
var TagName2 = "div";
var globalStore = _FHPV2Q7Ccjs.createStore.call(void 0, { activeStore: null });
var hidingStores = /* @__PURE__ */ new WeakSet();
function createRemoveStoreCallback(store) {
  return () => {
    const { activeStore } = globalStore.getState();
    if (activeStore !== store) return;
    globalStore.setState("activeStore", null);
  };
}
function hideStore(store) {
  if (!store) return;
  hidingStores.add(store);
  store.hide();
  queueMicrotask(() => hidingStores.delete(store));
}
var useTooltipAnchor = _JBOLBTVUcjs.createHook.call(void 0, function useTooltipAnchor2({ store, showOnHover = true, ...props }) {
  const context = useTooltipProviderContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "TooltipAnchor must receive a `store` prop or be wrapped in a TooltipProvider component.");
  const canShowOnHoverRef = _react.useRef.call(void 0, false);
  _react.useEffect.call(void 0, () => {
    return _FHPV2Q7Ccjs.sync.call(void 0, store, ["mounted"], (state) => {
      if (state.mounted) return;
      canShowOnHoverRef.current = false;
    });
  }, [store]);
  _react.useEffect.call(void 0, () => {
    if (!store) return;
    const removeStore = createRemoveStoreCallback(store);
    return _JBOLBTVUcjs.chain.call(void 0, removeStore, _FHPV2Q7Ccjs.sync.call(void 0, store, ["mounted"], (state) => {
      if (!store) return;
      if (state.mounted) {
        const { activeStore } = globalStore.getState();
        if (activeStore !== store) {
          if (hidingStores.has(store)) return;
          hideStore(activeStore);
        }
        return globalStore.setState("activeStore", store);
      }
      const id = setTimeout(removeStore, store.getState().skipTimeout);
      return () => clearTimeout(id);
    }));
  }, [store]);
  const onMouseEnterProp = props.onMouseEnter;
  const onMouseEnter = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onMouseEnterProp == null ? void 0 : onMouseEnterProp(event);
    canShowOnHoverRef.current = true;
  });
  const onFocusVisibleProp = props.onFocusVisible;
  const onFocusVisible = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onFocusVisibleProp == null ? void 0 : onFocusVisibleProp(event);
    if (event.defaultPrevented) return;
    store == null ? void 0 : store.setAnchorElement(event.currentTarget);
    store == null ? void 0 : store.show();
  });
  const onBlurProp = props.onBlur;
  const onBlur = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onBlurProp == null ? void 0 : onBlurProp(event);
    if (event.defaultPrevented) return;
    const { activeStore } = globalStore.getState();
    canShowOnHoverRef.current = false;
    if (activeStore === store) globalStore.setState("activeStore", null);
  });
  const type = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "type");
  const contentId = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => {
    var _a;
    return (_a = state.contentElement) == null ? void 0 : _a.id;
  });
  props = {
    "aria-labelledby": type === "label" && props["aria-label"] == null ? contentId : void 0,
    ...props,
    onMouseEnter,
    onFocusVisible,
    onBlur
  };
  props = _HCYQ5Z7Zcjs.useHovercardAnchor.call(void 0, {
    store,
    showOnHover(event) {
      if (!canShowOnHoverRef.current) return false;
      if (_JBOLBTVUcjs.isFalsyBooleanCallback.call(void 0, showOnHover, event)) return false;
      const { activeStore } = globalStore.getState();
      if (!activeStore) return true;
      store == null ? void 0 : store.show();
      return false;
    },
    ...props
  });
  return props;
});
var TooltipAnchor = _JBOLBTVUcjs.forwardRef.call(void 0, function TooltipAnchor2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName2, useTooltipAnchor(props));
});

// ../ariakit-react-components/dist/tooltip/tooltip-arrow.js
var TagName3 = "div";
var useTooltipArrow = _JBOLBTVUcjs.createHook.call(void 0, function useTooltipArrow2({ store, size = 16, ...props }) {
  const context = useTooltipContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "TooltipArrow must be wrapped in a Tooltip component.");
  props = _AI3BA27Gcjs.usePopoverArrow.call(void 0, {
    store,
    size,
    ...props
  });
  return props;
});
var TooltipArrow = _JBOLBTVUcjs.forwardRef.call(void 0, function TooltipArrow2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName3, useTooltipArrow(props));
});

// ../ariakit-components/dist/tooltip/tooltip-store.js
function createTooltipStore(props = {}) {
  var _a;
  if (process.env.NODE_ENV !== "production") {
    if (props.type === "label") console.warn("The `type` option on the tooltip store is deprecated.", "Render a visually hidden label or use the `aria-label` or `aria-labelledby` attributes on the anchor element instead.", "See https://ariakit.com/components/tooltip#tooltip-anchors-must-have-accessible-names");
  }
  const syncState = (_a = props.store) == null ? void 0 : _a.getState();
  const hovercard = _HCYQ5Z7Zcjs.createHovercardStore.call(void 0, {
    ...props,
    placement: _JBOLBTVUcjs.defaultValue.call(void 0, props.placement, syncState == null ? void 0 : syncState.placement, "top"),
    hideTimeout: _JBOLBTVUcjs.defaultValue.call(void 0, props.hideTimeout, syncState == null ? void 0 : syncState.hideTimeout, 0)
  });
  const tooltip = _FHPV2Q7Ccjs.createStore.call(void 0, {
    ...hovercard.getState(),
    type: _JBOLBTVUcjs.defaultValue.call(void 0, props.type, syncState == null ? void 0 : syncState.type, "description"),
    skipTimeout: _JBOLBTVUcjs.defaultValue.call(void 0, props.skipTimeout, syncState == null ? void 0 : syncState.skipTimeout, 300)
  }, hovercard, props.store);
  return {
    ...hovercard,
    ...tooltip
  };
}

// ../ariakit-react-components/dist/tooltip/tooltip-store.js
function useTooltipStoreProps(store, update, props) {
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "type");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "skipTimeout");
  return _HCYQ5Z7Zcjs.useHovercardStoreProps.call(void 0, store, update, props);
}
function useTooltipStore(props = {}) {
  const [store, update] = _FHPV2Q7Ccjs.useStore.call(void 0, createTooltipStore, props);
  return useTooltipStoreProps(store, update, props);
}

// ../ariakit-react-components/dist/tooltip/tooltip-provider.js

function TooltipProvider(props = {}) {
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, TooltipContextProvider, {
    value: useTooltipStore(props),
    children: props.children
  });
}








exports.useTooltipContext = useTooltipContext; exports.Tooltip = Tooltip; exports.TooltipAnchor = TooltipAnchor; exports.TooltipArrow = TooltipArrow; exports.useTooltipStore = useTooltipStore; exports.TooltipProvider = TooltipProvider;
