"use strict";Object.defineProperty(exports, "__esModule", {value: true});



var _US2XYAXEcjs = require('./US2XYAXE.cjs');



var _2WBRQ3I7cjs = require('./2WBRQ3I7.cjs');




var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');







var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/menubar/menubar-context.js
var menubar = _JBOLBTVUcjs.createStoreContext.call(void 0, [_2WBRQ3I7cjs.CompositeContextProvider], [_2WBRQ3I7cjs.CompositeScopedContextProvider]);
var useMenubarContext = menubar.useContext;
var useMenubarScopedContext = menubar.useScopedContext;
var useMenubarProviderContext = menubar.useProviderContext;
var MenubarContextProvider = menubar.ContextProvider;
var MenubarScopedContextProvider = menubar.ScopedContextProvider;

// ../ariakit-components/dist/menubar/menubar-store.js
function createMenubarStore(props = {}) {
  var _a;
  const syncState = (_a = props.store) == null ? void 0 : _a.getState();
  const composite = _US2XYAXEcjs.createCompositeStore.call(void 0, {
    ...props,
    orientation: _JBOLBTVUcjs.defaultValue.call(void 0, props.orientation, syncState == null ? void 0 : syncState.orientation, "horizontal"),
    focusLoop: _JBOLBTVUcjs.defaultValue.call(void 0, props.focusLoop, syncState == null ? void 0 : syncState.focusLoop, true)
  });
  const menubar2 = _FHPV2Q7Ccjs.createStore.call(void 0, { ...composite.getState() }, composite, props.store);
  return {
    ...composite,
    ...menubar2
  };
}

// ../ariakit-react-components/dist/menubar/menubar-store.js
function useMenubarStoreProps(store, update, props) {
  return _US2XYAXEcjs.useCompositeStoreProps.call(void 0, store, update, props);
}
function useMenubarStore(props = {}) {
  const [store, update] = _FHPV2Q7Ccjs.useStore.call(void 0, createMenubarStore, props);
  return useMenubarStoreProps(store, update, props);
}

// ../ariakit-react-components/dist/menubar/menubar.js
var _jsxruntime = require('react/jsx-runtime');
var TagName = "div";
var useMenubar = _JBOLBTVUcjs.createHook.call(void 0, function useMenubar2({ store: storeProp, composite = true, orientation: orientationProp, virtualFocus, focusLoop, rtl, ...props }) {
  const context = useMenubarProviderContext();
  storeProp = storeProp || context;
  const store = useMenubarStore({
    store: storeProp,
    orientation: orientationProp,
    virtualFocus,
    focusLoop,
    rtl
  });
  const orientation = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => !composite || state.orientation === "both" ? void 0 : state.orientation);
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, MenubarScopedContextProvider, {
    value: store,
    children: element
  }), [store]);
  if (composite) props = {
    role: "menubar",
    "aria-orientation": orientation,
    ...props
  };
  props = _US2XYAXEcjs.useComposite.call(void 0, {
    store,
    composite,
    ...props
  });
  return props;
});
var Menubar = _JBOLBTVUcjs.forwardRef.call(void 0, function Menubar2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useMenubar(props));
});

// ../ariakit-react-components/dist/menubar/menubar-provider.js

function MenubarProvider(props = {}) {
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, MenubarContextProvider, {
    value: useMenubarStore(props),
    children: props.children
  });
}








exports.useMenubarContext = useMenubarContext; exports.useMenubarScopedContext = useMenubarScopedContext; exports.useMenubarStore = useMenubarStore; exports.useMenubar = useMenubar; exports.Menubar = Menubar; exports.MenubarProvider = MenubarProvider;
