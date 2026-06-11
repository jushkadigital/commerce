"use strict";Object.defineProperty(exports, "__esModule", {value: true});



var _M6YHODMVcjs = require('./M6YHODMV.cjs');





var _US2XYAXEcjs = require('./US2XYAXE.cjs');




var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');







var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/radio/radio-group.js
var _jsxruntime = require('react/jsx-runtime');
var TagName = "div";
var useRadioGroup = _JBOLBTVUcjs.createHook.call(void 0, function useRadioGroup2({ store, ...props }) {
  const context = _M6YHODMVcjs.useRadioProviderContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "RadioGroup must receive a `store` prop or be wrapped in a RadioProvider component.");
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _M6YHODMVcjs.RadioScopedContextProvider, {
    value: store,
    children: element
  }), [store]);
  props = {
    role: "radiogroup",
    ...props
  };
  props = _US2XYAXEcjs.useComposite.call(void 0, {
    store,
    ...props
  });
  return props;
});
var RadioGroup = _JBOLBTVUcjs.forwardRef.call(void 0, function RadioGroup2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useRadioGroup(props));
});

// ../ariakit-components/dist/radio/radio-store.js
function createRadioStore(props = {}) {
  var _a;
  const syncState = (_a = props.store) == null ? void 0 : _a.getState();
  const composite = _US2XYAXEcjs.createCompositeStore.call(void 0, {
    ...props,
    focusLoop: _JBOLBTVUcjs.defaultValue.call(void 0, props.focusLoop, syncState == null ? void 0 : syncState.focusLoop, true)
  });
  const radio = _FHPV2Q7Ccjs.createStore.call(void 0, {
    ...composite.getState(),
    value: _JBOLBTVUcjs.defaultValue.call(void 0, props.value, syncState == null ? void 0 : syncState.value, props.defaultValue, null)
  }, composite, props.store);
  return {
    ...composite,
    ...radio,
    setValue: (value) => radio.setState("value", value)
  };
}

// ../ariakit-react-components/dist/radio/radio-store.js
function useRadioStoreProps(store, update, props) {
  store = _US2XYAXEcjs.useCompositeStoreProps.call(void 0, store, update, props);
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "value", "setValue");
  return store;
}
function useRadioStore(props = {}) {
  props = _US2XYAXEcjs.useCompositeStoreOptions.call(void 0, props);
  const [store, update] = _FHPV2Q7Ccjs.useStore.call(void 0, createRadioStore, props);
  return useRadioStoreProps(store, update, props);
}

// ../ariakit-react-components/dist/radio/radio-provider.js

function RadioProvider(props = {}) {
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _M6YHODMVcjs.RadioContextProvider, {
    value: useRadioStore(props),
    children: props.children
  });
}





exports.RadioGroup = RadioGroup; exports.useRadioStore = useRadioStore; exports.RadioProvider = RadioProvider;
