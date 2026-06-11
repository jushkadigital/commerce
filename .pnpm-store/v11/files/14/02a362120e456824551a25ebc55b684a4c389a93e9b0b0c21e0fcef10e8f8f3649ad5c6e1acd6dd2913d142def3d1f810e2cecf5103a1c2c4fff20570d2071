"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _3B6TF7HKcjs = require('./3B6TF7HK.cjs');








var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/focus-trap/focus-trap-region.js
var _react = require('react');
var _jsxruntime = require('react/jsx-runtime');
var TagName = "div";
var useFocusTrapRegion = _JBOLBTVUcjs.createHook.call(void 0, function useFocusTrapRegion2({ enabled = false, ...props }) {
  const ref = _react.useRef.call(void 0, null);
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => {
    const renderFocusTrap = () => {
      if (!enabled) return null;
      return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _3B6TF7HKcjs.FocusTrap, { onFocus: (event) => {
        const container = ref.current;
        if (!container) return;
        const tabbables = _JBOLBTVUcjs.getAllTabbableIn.call(void 0, container, true);
        const first = tabbables[0];
        const last = tabbables[tabbables.length - 1];
        if (!tabbables.length) {
          container.focus();
          return;
        }
        if (event.relatedTarget === first) last == null ? void 0 : last.focus();
        else first == null ? void 0 : first.focus();
      } });
    };
    return /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, _jsxruntime.Fragment, { children: [
      renderFocusTrap(),
      element,
      renderFocusTrap()
    ] });
  }, [enabled]);
  props = {
    ...props,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref)
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var FocusTrapRegion = _JBOLBTVUcjs.forwardRef.call(void 0, function FocusTrapRegion2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useFocusTrapRegion(props));
});



exports.FocusTrapRegion = FocusTrapRegion;
