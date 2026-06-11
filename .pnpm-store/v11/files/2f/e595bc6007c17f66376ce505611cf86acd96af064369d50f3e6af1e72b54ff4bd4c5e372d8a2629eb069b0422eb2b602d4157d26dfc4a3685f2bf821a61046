"use strict";Object.defineProperty(exports, "__esModule", {value: true});


var _2WBRQ3I7cjs = require('./2WBRQ3I7.cjs');


var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');








var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/composite/composite-row.js
var _react = require('react');
var _jsxruntime = require('react/jsx-runtime');
var TagName = "div";
var useCompositeRow = _JBOLBTVUcjs.createHook.call(void 0, function useCompositeRow2({ store, "aria-setsize": ariaSetSize, "aria-posinset": ariaPosInSet, ...props }) {
  const context = _2WBRQ3I7cjs.useCompositeScopedContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "CompositeRow must be wrapped in a Composite component.");
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const baseElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.baseElement || void 0);
  const providerValue = _react.useMemo.call(void 0, () => ({
    id,
    baseElement,
    ariaSetSize,
    ariaPosInSet
  }), [
    id,
    baseElement,
    ariaSetSize,
    ariaPosInSet
  ]);
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _2WBRQ3I7cjs.CompositeRowContext.Provider, {
    value: providerValue,
    children: element
  }), [providerValue]);
  props = {
    ...props,
    id
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var CompositeRow = _JBOLBTVUcjs.forwardRef.call(void 0, function CompositeRow2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useCompositeRow(props));
});




exports.useCompositeRow = useCompositeRow; exports.CompositeRow = CompositeRow;
