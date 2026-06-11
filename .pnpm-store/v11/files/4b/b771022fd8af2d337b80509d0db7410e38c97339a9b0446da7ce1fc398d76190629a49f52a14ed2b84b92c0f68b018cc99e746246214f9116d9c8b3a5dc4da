"use strict";Object.defineProperty(exports, "__esModule", {value: true});




var _42GL4LKIcjs = require('./42GL4LKI.cjs');






var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/collection/collection.js
var _jsxruntime = require('react/jsx-runtime');
var TagName = "div";
var useCollection = _JBOLBTVUcjs.createHook.call(void 0, function useCollection2({ store, ...props }) {
  const context = _42GL4LKIcjs.useCollectionProviderContext.call(void 0, );
  store = store || context;
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _42GL4LKIcjs.CollectionScopedContextProvider, {
    value: store,
    children: element
  }), [store]);
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var Collection = _JBOLBTVUcjs.forwardRef.call(void 0, function Collection2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useCollection(props));
});

// ../ariakit-react-components/dist/collection/collection-provider.js

function CollectionProvider(props = {}) {
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _42GL4LKIcjs.CollectionContextProvider, {
    value: _42GL4LKIcjs.useCollectionStore.call(void 0, props),
    children: props.children
  });
}




exports.Collection = Collection; exports.CollectionProvider = CollectionProvider;
