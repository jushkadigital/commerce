"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _DDV252ZYcjs = require('./DDV252ZY.cjs');


var _2WBRQ3I7cjs = require('./2WBRQ3I7.cjs');


var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');





var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/composite/composite-separator.js
var TagName = "hr";
var useCompositeSeparator = _JBOLBTVUcjs.createHook.call(void 0, function useCompositeSeparator2({ store, ...props }) {
  const context = _2WBRQ3I7cjs.useCompositeScopedContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "CompositeSeparator must be wrapped in a Composite component.");
  const orientation = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.orientation === "horizontal" ? "vertical" : "horizontal");
  props = _DDV252ZYcjs.useSeparator.call(void 0, {
    ...props,
    orientation
  });
  return props;
});
var CompositeSeparator = _JBOLBTVUcjs.forwardRef.call(void 0, function CompositeSeparator2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useCompositeSeparator(props));
});




exports.useCompositeSeparator = useCompositeSeparator; exports.CompositeSeparator = CompositeSeparator;
