"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _7SEEXNY6cjs = require('./7SEEXNY6.cjs');



var _WYI5CKPVcjs = require('./WYI5CKPV.cjs');


var _P7AY4KL3cjs = require('./P7AY4KL3.cjs');







var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/dialog/dialog-dismiss.js
var _react = require('react');
var _jsxruntime = require('react/jsx-runtime');
var TagName = "button";
var useDialogDismiss = _JBOLBTVUcjs.createHook.call(void 0, function useDialogDismiss2({ store, ...props }) {
  const context = _WYI5CKPVcjs.useDialogScopedContext.call(void 0, );
  store = store || context;
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    store == null ? void 0 : store.hide();
  });
  props = {
    "data-dialog-dismiss": "",
    children: _react.useMemo.call(void 0, () => /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "svg", {
      "aria-label": "Dismiss popup",
      display: "block",
      fill: "none",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: 1.5,
      viewBox: "0 0 16 16",
      height: "1em",
      width: "1em",
      children: [/* @__PURE__ */ _jsxruntime.jsx.call(void 0, "line", {
        x1: "4",
        y1: "4",
        x2: "12",
        y2: "12"
      }), /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "line", {
        x1: "4",
        y1: "12",
        x2: "12",
        y2: "4"
      })]
    }), []),
    ...props,
    onClick
  };
  props = _P7AY4KL3cjs.useButton.call(void 0, props);
  return props;
});
var DialogDismiss = _JBOLBTVUcjs.forwardRef.call(void 0, function DialogDismiss2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useDialogDismiss(props));
});

// ../ariakit-react-components/dist/dialog/dialog-heading.js

var TagName2 = "h1";
var useDialogHeading = _JBOLBTVUcjs.createHook.call(void 0, function useDialogHeading2({ store, ...props }) {
  const setHeadingId = _react.useContext.call(void 0, _WYI5CKPVcjs.DialogHeadingContext);
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    setHeadingId == null ? void 0 : setHeadingId(id);
    return () => setHeadingId == null ? void 0 : setHeadingId(void 0);
  }, [setHeadingId, id]);
  props = {
    ...props,
    id
  };
  props = _7SEEXNY6cjs.useHeading.call(void 0, props);
  return props;
});
var DialogHeading = _JBOLBTVUcjs.forwardRef.call(void 0, function DialogHeading2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName2, useDialogHeading(props));
});






exports.useDialogDismiss = useDialogDismiss; exports.DialogDismiss = DialogDismiss; exports.useDialogHeading = useDialogHeading; exports.DialogHeading = DialogHeading;
