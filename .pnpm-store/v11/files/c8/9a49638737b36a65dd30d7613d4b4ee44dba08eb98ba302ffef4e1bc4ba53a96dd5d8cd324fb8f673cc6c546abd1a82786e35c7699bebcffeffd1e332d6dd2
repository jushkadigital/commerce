"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _2WBRQ3I7cjs = require('./2WBRQ3I7.cjs');



var _MWZS5XD4cjs = require('./MWZS5XD4.cjs');
















var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/composite/composite-group.js
var TagName = "div";
var useCompositeGroup = _JBOLBTVUcjs.createHook.call(void 0, function useCompositeGroup2({ store, ...props }) {
  props = _MWZS5XD4cjs.useGroup.call(void 0, props);
  return props;
});
var CompositeGroup = _JBOLBTVUcjs.forwardRef.call(void 0, function CompositeGroup2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useCompositeGroup(props));
});

// ../ariakit-react-components/dist/composite/composite-group-label.js
var TagName2 = "div";
var useCompositeGroupLabel = _JBOLBTVUcjs.createHook.call(void 0, function useCompositeGroupLabel2({ store, ...props }) {
  props = _MWZS5XD4cjs.useGroupLabel.call(void 0, props);
  return props;
});
var CompositeGroupLabel = _JBOLBTVUcjs.forwardRef.call(void 0, function CompositeGroupLabel2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName2, useCompositeGroupLabel(props));
});

// ../ariakit-react-components/dist/composite/composite-hover.js
var _react = require('react');
var TagName3 = "div";
function hoveringInside(event) {
  const nextElement = event.relatedTarget;
  if (!_JBOLBTVUcjs.isElement.call(void 0, nextElement)) return false;
  return _JBOLBTVUcjs.contains.call(void 0, event.currentTarget, nextElement);
}
var symbol = /* @__PURE__ */ Symbol("composite-hover");
function movingToAnotherItem(event) {
  const { relatedTarget } = event;
  if (!_JBOLBTVUcjs.isElement.call(void 0, relatedTarget)) return false;
  let dest = relatedTarget;
  do {
    if (_JBOLBTVUcjs.hasOwnProperty.call(void 0, dest, symbol) && dest[symbol]) return true;
    dest = dest.parentElement;
  } while (dest);
  return false;
}
var useCompositeHover = _JBOLBTVUcjs.createHook.call(void 0, function useCompositeHover2({ store, focusOnHover = true, blurOnHoverEnd = !!focusOnHover, ...props }) {
  const context = _2WBRQ3I7cjs.useCompositeScopedContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "CompositeHover must be wrapped in a Composite component.");
  const isMouseMoving = _JBOLBTVUcjs.useIsMouseMoving.call(void 0, );
  const onMouseMoveProp = props.onMouseMove;
  const focusOnHoverProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, focusOnHover);
  const onMouseMove = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onMouseMoveProp == null ? void 0 : onMouseMoveProp(event);
    if (event.defaultPrevented) return;
    if (!isMouseMoving()) return;
    if (!focusOnHoverProp(event)) return;
    if (!_JBOLBTVUcjs.hasFocusWithin.call(void 0, event.currentTarget)) {
      const baseElement = store == null ? void 0 : store.getState().baseElement;
      if (baseElement && !_JBOLBTVUcjs.hasFocus.call(void 0, baseElement)) baseElement.focus();
    }
    store == null ? void 0 : store.setActiveId(event.currentTarget.id);
  });
  const onMouseLeaveProp = props.onMouseLeave;
  const blurOnHoverEndProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, blurOnHoverEnd);
  const onMouseLeave = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    var _a;
    onMouseLeaveProp == null ? void 0 : onMouseLeaveProp(event);
    if (event.defaultPrevented) return;
    if (!isMouseMoving()) return;
    if (hoveringInside(event)) return;
    if (movingToAnotherItem(event)) return;
    if (!focusOnHoverProp(event)) return;
    if (!blurOnHoverEndProp(event)) return;
    store == null ? void 0 : store.setActiveId(null);
    (_a = store == null ? void 0 : store.getState().baseElement) == null ? void 0 : _a.focus();
  });
  const ref = _react.useCallback.call(void 0, (element) => {
    if (!element) return;
    element[symbol] = true;
  }, []);
  props = {
    ...props,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref),
    onMouseMove,
    onMouseLeave
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var CompositeHover = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function CompositeHover2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName3, useCompositeHover(props));
}));








exports.useCompositeGroup = useCompositeGroup; exports.CompositeGroup = CompositeGroup; exports.useCompositeGroupLabel = useCompositeGroupLabel; exports.CompositeGroupLabel = CompositeGroupLabel; exports.useCompositeHover = useCompositeHover; exports.CompositeHover = CompositeHover;
