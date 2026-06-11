"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _WLHP5OM6cjs = require('./WLHP5OM6.cjs');




var _US2XYAXEcjs = require('./US2XYAXE.cjs');


var _ZPWE3FTFcjs = require('./ZPWE3FTF.cjs');





var _2WBRQ3I7cjs = require('./2WBRQ3I7.cjs');



var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');


















var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/toolbar/toolbar-context.js
var ctx = _JBOLBTVUcjs.createStoreContext.call(void 0, [_2WBRQ3I7cjs.CompositeContextProvider], [_2WBRQ3I7cjs.CompositeScopedContextProvider]);
var useToolbarContext = ctx.useContext;
var useToolbarScopedContext = ctx.useScopedContext;
var useToolbarProviderContext = ctx.useProviderContext;
var ToolbarContextProvider = ctx.ContextProvider;
var ToolbarScopedContextProvider = ctx.ScopedContextProvider;

// ../ariakit-components/dist/toolbar/toolbar-store.js
function createToolbarStore(props = {}) {
  var _a;
  const syncState = (_a = props.store) == null ? void 0 : _a.getState();
  return _US2XYAXEcjs.createCompositeStore.call(void 0, {
    ...props,
    orientation: _JBOLBTVUcjs.defaultValue.call(void 0, props.orientation, syncState == null ? void 0 : syncState.orientation, "horizontal"),
    focusLoop: _JBOLBTVUcjs.defaultValue.call(void 0, props.focusLoop, syncState == null ? void 0 : syncState.focusLoop, true)
  });
}

// ../ariakit-react-components/dist/toolbar/toolbar-store.js
function useToolbarStoreProps(store, update, props) {
  return _US2XYAXEcjs.useCompositeStoreProps.call(void 0, store, update, props);
}
function useToolbarStore(props = {}) {
  const [store, update] = _FHPV2Q7Ccjs.useStore.call(void 0, createToolbarStore, props);
  return useToolbarStoreProps(store, update, props);
}

// ../ariakit-react-components/dist/toolbar/toolbar.js
var _jsxruntime = require('react/jsx-runtime');
var TagName = "div";
var useToolbar = _JBOLBTVUcjs.createHook.call(void 0, function useToolbar2({ store: storeProp, orientation: orientationProp, virtualFocus, focusLoop, rtl, ...props }) {
  const context = useToolbarProviderContext();
  storeProp = storeProp || context;
  const store = useToolbarStore({
    store: storeProp,
    orientation: orientationProp,
    virtualFocus,
    focusLoop,
    rtl
  });
  const orientation = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.orientation === "both" ? void 0 : state.orientation);
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, ToolbarScopedContextProvider, {
    value: store,
    children: element
  }), [store]);
  props = {
    role: "toolbar",
    "aria-orientation": orientation,
    ...props
  };
  props = _US2XYAXEcjs.useComposite.call(void 0, {
    store,
    ...props
  });
  return props;
});
var Toolbar = _JBOLBTVUcjs.forwardRef.call(void 0, function Toolbar2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useToolbar(props));
});

// ../ariakit-react-components/dist/composite/composite-container.js
var _react = require('react');
var TagName2 = "div";
function getFirstTabbable(container) {
  _JBOLBTVUcjs.restoreFocusIn.call(void 0, container);
  const tabbable = _JBOLBTVUcjs.getFirstTabbableIn.call(void 0, container);
  _JBOLBTVUcjs.disableFocusIn.call(void 0, container);
  return tabbable;
}
var useCompositeContainer = _JBOLBTVUcjs.createHook.call(void 0, function useCompositeContainer2({ store, ...props }) {
  const context = _2WBRQ3I7cjs.useCompositeScopedContext.call(void 0, );
  store = store || context;
  const ref = _react.useRef.call(void 0, null);
  const isOpenRef = _react.useRef.call(void 0, false);
  const open = (collapseToEnd = false) => {
    const container = ref.current;
    if (!container) return;
    _JBOLBTVUcjs.restoreFocusIn.call(void 0, container);
    const tabbable = _JBOLBTVUcjs.getFirstTabbableIn.call(void 0, container);
    if (!tabbable) {
      _JBOLBTVUcjs.disableFocusIn.call(void 0, container);
      return;
    }
    isOpenRef.current = true;
    queueMicrotask(() => {
      tabbable.focus();
      if (_JBOLBTVUcjs.isTextField.call(void 0, tabbable) || tabbable.isContentEditable) _2WBRQ3I7cjs.selectTextField.call(void 0, tabbable, collapseToEnd);
    });
  };
  const close = () => {
    const container = ref.current;
    if (!container) return;
    isOpenRef.current = false;
    _JBOLBTVUcjs.disableFocusIn.call(void 0, container);
  };
  const renderedItems = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "renderedItems");
  _react.useEffect.call(void 0, () => {
    const container = ref.current;
    if (!container) return;
    if (!isOpenRef.current && (renderedItems == null ? void 0 : renderedItems.length)) _JBOLBTVUcjs.disableFocusIn.call(void 0, container);
  }, [renderedItems]);
  const onFocusProp = props.onFocus;
  const onFocus = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onFocusProp == null ? void 0 : onFocusProp(event);
    if (event.defaultPrevented) return;
    if (!store) return;
    const isOpen = isOpenRef.current;
    if (_JBOLBTVUcjs.isSelfTarget.call(void 0, event)) {
      isOpenRef.current = false;
      const { baseElement } = store.getState();
      const containers = baseElement == null ? void 0 : baseElement.querySelectorAll("[data-composite-container]");
      if (containers) for (const container of containers) _JBOLBTVUcjs.disableFocusIn.call(void 0, container);
    } else if (!isOpen) {
      isOpenRef.current = true;
      _JBOLBTVUcjs.restoreFocusIn.call(void 0, event.currentTarget);
      store == null ? void 0 : store.setState("moves", 0);
    }
  });
  const onBlurProp = props.onBlur;
  const onBlur = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onBlurProp == null ? void 0 : onBlurProp(event);
    if (event.defaultPrevented) return;
    if (_JBOLBTVUcjs.isFocusEventOutside.call(void 0, event)) close();
  });
  const onKeyDownProp = props.onKeyDown;
  const onKeyDown = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onKeyDownProp == null ? void 0 : onKeyDownProp(event);
    if (event.defaultPrevented) return;
    if (event.altKey) return;
    if (event.ctrlKey) return;
    if (event.metaKey) return;
    if (event.shiftKey) return;
    const container = event.currentTarget;
    if (_JBOLBTVUcjs.isSelfTarget.call(void 0, event)) {
      if (event.key.length === 1 && event.key !== " ") {
        const tabbable = getFirstTabbable(container);
        if (!tabbable) return;
        if (_JBOLBTVUcjs.isTextField.call(void 0, tabbable) || tabbable.isContentEditable) {
          event.stopPropagation();
          open();
        }
      } else if (event.key === "Delete" || event.key === "Backspace") {
        const tabbable = getFirstTabbable(container);
        if (!tabbable) return;
        if (_JBOLBTVUcjs.isTextField.call(void 0, tabbable) || tabbable.isContentEditable) {
          open();
          const onInput = () => queueMicrotask(() => container.focus());
          container.addEventListener("input", onInput, { once: true });
        }
      }
    } else if (event.key === "Escape") queueMicrotask(() => container.focus());
    else if (event.key === "Enter") {
      const target = event.target;
      if (target.tagName === "INPUT" && !_JBOLBTVUcjs.isButton.call(void 0, target) || target.tagName === "TEXTAREA" || target.isContentEditable) {
        event.preventDefault();
        queueMicrotask(() => container.focus());
      }
    }
  });
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    if (_JBOLBTVUcjs.isSelfTarget.call(void 0, event) && !event.detail) open(true);
  });
  props = {
    "data-composite-container": "",
    ...props,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref),
    onFocus,
    onBlur,
    onKeyDown,
    onClick
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var CompositeContainer = _JBOLBTVUcjs.forwardRef.call(void 0, function CompositeContainer2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName2, useCompositeContainer(props));
});

// ../ariakit-react-components/dist/toolbar/toolbar-item.js
var TagName3 = "button";
var useToolbarItem = _JBOLBTVUcjs.createHook.call(void 0, function useToolbarItem2({ store, ...props }) {
  const context = useToolbarContext();
  store = store || context;
  props = _ZPWE3FTFcjs.useCompositeItem.call(void 0, {
    store,
    ...props
  });
  return props;
});
var ToolbarItem = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function ToolbarItem2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName3, useToolbarItem(props));
}));

// ../ariakit-react-components/dist/toolbar/toolbar-container.js
var TagName4 = "div";
var useToolbarContainer = _JBOLBTVUcjs.createHook.call(void 0, function useToolbarContainer2({ store, ...props }) {
  const context = useToolbarContext();
  store = store || context;
  props = useCompositeContainer({
    store,
    ...props
  });
  props = useToolbarItem({
    store,
    ...props
  });
  return props;
});
var ToolbarContainer = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function ToolbarContainer2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName4, useToolbarContainer(props));
}));

// ../ariakit-react-components/dist/toolbar/toolbar-input.js
var TagName5 = "input";
var useToolbarInput = _JBOLBTVUcjs.createHook.call(void 0, function useToolbarInput2({ store, ...props }) {
  const context = useToolbarContext();
  store = store || context;
  props = useToolbarItem({
    store,
    ...props
  });
  return props;
});
var ToolbarInput = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function ToolbarInput2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName5, useToolbarInput(props));
}));

// ../ariakit-react-components/dist/toolbar/toolbar-provider.js

function ToolbarProvider(props = {}) {
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, ToolbarContextProvider, {
    value: useToolbarStore(props),
    children: props.children
  });
}

// ../ariakit-react-components/dist/toolbar/toolbar-separator.js
var TagName6 = "hr";
var useToolbarSeparator = _JBOLBTVUcjs.createHook.call(void 0, function useToolbarSeparator2({ store, ...props }) {
  const context = useToolbarContext();
  store = store || context;
  props = _WLHP5OM6cjs.useCompositeSeparator.call(void 0, {
    store,
    ...props
  });
  return props;
});
var ToolbarSeparator = _JBOLBTVUcjs.forwardRef.call(void 0, function ToolbarSeparator2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName6, useToolbarSeparator(props));
});










exports.useToolbarContext = useToolbarContext; exports.useToolbarStore = useToolbarStore; exports.Toolbar = Toolbar; exports.ToolbarItem = ToolbarItem; exports.ToolbarContainer = ToolbarContainer; exports.ToolbarInput = ToolbarInput; exports.ToolbarProvider = ToolbarProvider; exports.ToolbarSeparator = ToolbarSeparator;
