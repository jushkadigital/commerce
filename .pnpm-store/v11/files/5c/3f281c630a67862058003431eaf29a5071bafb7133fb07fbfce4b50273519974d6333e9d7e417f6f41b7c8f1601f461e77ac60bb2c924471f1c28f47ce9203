"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _42GL4LKIcjs = require('./42GL4LKI.cjs');








var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/collection/collection-item.js
var _react = require('react');
var TagName = "div";
var useCollectionItem = _JBOLBTVUcjs.createHook.call(void 0, function useCollectionItem2({ store, shouldRegisterItem = true, getItem = _JBOLBTVUcjs.identity, element, ...props }) {
  const context = _42GL4LKIcjs.useCollectionContext.call(void 0, );
  store = store || context;
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const ref = _react.useRef.call(void 0, element);
  _react.useEffect.call(void 0, () => {
    const element2 = ref.current;
    if (!id) return;
    if (!element2) return;
    if (!shouldRegisterItem) return;
    const item = getItem({
      id,
      element: element2
    });
    return store == null ? void 0 : store.renderItem(item);
  }, [
    id,
    shouldRegisterItem,
    getItem,
    store
  ]);
  props = {
    ...props,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref)
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var CollectionItem = _JBOLBTVUcjs.forwardRef.call(void 0, function CollectionItem2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useCollectionItem(props));
});




exports.useCollectionItem = useCollectionItem; exports.CollectionItem = CollectionItem;
