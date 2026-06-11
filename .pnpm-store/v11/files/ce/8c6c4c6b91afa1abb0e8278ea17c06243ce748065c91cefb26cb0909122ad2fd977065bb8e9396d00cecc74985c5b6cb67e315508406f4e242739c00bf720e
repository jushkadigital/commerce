"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _GV4SR2CMcjs = require('./GV4SR2CM.cjs');




var _KDVG735Hcjs = require('./KDVG735H.cjs');


var _DVB2WSHDcjs = require('./DVB2WSHD.cjs');


var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');








var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/popover/popover-disclosure.js
var _jsxruntime = require('react/jsx-runtime');
var TagName = "button";
var usePopoverDisclosure = _JBOLBTVUcjs.createHook.call(void 0, function usePopoverDisclosure2({ store, ...props }) {
  const context = _KDVG735Hcjs.usePopoverProviderContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "PopoverDisclosure must receive a `store` prop or be wrapped in a PopoverProvider component.");
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    store == null ? void 0 : store.setAnchorElement(event.currentTarget);
    onClickProp == null ? void 0 : onClickProp(event);
  });
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _KDVG735Hcjs.PopoverScopedContextProvider, {
    value: store,
    children: element
  }), [store]);
  props = {
    ...props,
    onClick
  };
  props = _GV4SR2CMcjs.usePopoverAnchor.call(void 0, {
    store,
    ...props
  });
  props = _DVB2WSHDcjs.useDialogDisclosure.call(void 0, {
    store,
    ...props
  });
  return props;
});
var PopoverDisclosure = _JBOLBTVUcjs.forwardRef.call(void 0, function PopoverDisclosure2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, usePopoverDisclosure(props));
});

// ../ariakit-react-components/dist/popover/popover-disclosure-arrow.js
var _react = require('react');

var TagName2 = "span";
var pointsMap = {
  top: "4,10 8,6 12,10",
  right: "6,4 10,8 6,12",
  bottom: "4,6 8,10 12,6",
  left: "10,4 6,8 10,12"
};
var usePopoverDisclosureArrow = _JBOLBTVUcjs.createHook.call(void 0, function usePopoverDisclosureArrow2({ store, placement, ...props }) {
  const context = _KDVG735Hcjs.usePopoverContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "PopoverDisclosureArrow must be wrapped in a PopoverDisclosure component.");
  const points = pointsMap[_FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => placement || state.placement).split("-")[0]];
  props = {
    children: _react.useMemo.call(void 0, () => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "svg", {
      display: "block",
      fill: "none",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: 1.5,
      viewBox: "0 0 16 16",
      height: "1em",
      width: "1em",
      children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "polyline", { points })
    }), [points]),
    "aria-hidden": true,
    ...props,
    style: {
      width: "1em",
      height: "1em",
      pointerEvents: "none",
      ...props.style
    }
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var PopoverDisclosureArrow = _JBOLBTVUcjs.forwardRef.call(void 0, function PopoverDisclosureArrow2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName2, usePopoverDisclosureArrow(props));
});






exports.usePopoverDisclosure = usePopoverDisclosure; exports.PopoverDisclosure = PopoverDisclosure; exports.usePopoverDisclosureArrow = usePopoverDisclosureArrow; exports.PopoverDisclosureArrow = PopoverDisclosureArrow;
