"use strict";Object.defineProperty(exports, "__esModule", {value: true});




var _HCYQ5Z7Zcjs = require('./HCYQ5Z7Z.cjs');


var _AI3BA27Gcjs = require('./AI3BA27G.cjs');


var _DVB2WSHDcjs = require('./DVB2WSHD.cjs');


var _OP2QHIHDcjs = require('./OP2QHIHD.cjs');


var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');











var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/hovercard/hovercard-arrow.js
var TagName = "div";
var useHovercardArrow = _JBOLBTVUcjs.createHook.call(void 0, function useHovercardArrow2({ store, ...props }) {
  const context = _HCYQ5Z7Zcjs.useHovercardContext.call(void 0, );
  store = store || context;
  props = _AI3BA27Gcjs.usePopoverArrow.call(void 0, {
    store,
    ...props
  });
  return props;
});
var HovercardArrow = _JBOLBTVUcjs.forwardRef.call(void 0, function HovercardArrow2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useHovercardArrow(props));
});

// ../ariakit-react-components/dist/hovercard/hovercard-disclosure.js
var _react = require('react');
var _jsxruntime = require('react/jsx-runtime');
var TagName2 = "button";
var useHovercardDisclosure = _JBOLBTVUcjs.createHook.call(void 0, function useHovercardDisclosure2({ store, ...props }) {
  const context = _HCYQ5Z7Zcjs.useHovercardProviderContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "HovercardDisclosure must receive a `store` prop or be wrapped in a HovercardProvider component.");
  const [visible, setVisible] = _react.useState.call(void 0, false);
  _react.useEffect.call(void 0, () => {
    if (!visible) return;
    const onBlur = (event) => {
      if (!store) return;
      const nextActiveElement = event.relatedTarget;
      if (_JBOLBTVUcjs.isNode.call(void 0, nextActiveElement)) {
        const { anchorElement: anchor, popoverElement: popover, disclosureElement: disclosure } = store.getState();
        if (anchor && _JBOLBTVUcjs.contains.call(void 0, anchor, nextActiveElement)) return;
        if (popover && _JBOLBTVUcjs.contains.call(void 0, popover, nextActiveElement)) return;
        if (disclosure && _JBOLBTVUcjs.contains.call(void 0, disclosure, nextActiveElement)) return;
        if (_JBOLBTVUcjs.isElement.call(void 0, nextActiveElement) && nextActiveElement.hasAttribute("data-focus-trap")) return;
      }
      setVisible(false);
    };
    return _JBOLBTVUcjs.addGlobalEventListener.call(void 0, "focusout", onBlur, true);
  }, [visible, store]);
  _react.useEffect.call(void 0, () => {
    return _FHPV2Q7Ccjs.sync.call(void 0, store, ["anchorElement"], (state) => {
      const anchor = state.anchorElement;
      if (!anchor) return;
      const observer = new MutationObserver(() => {
        if (!anchor.hasAttribute("data-focus-visible")) return;
        setVisible(true);
      });
      observer.observe(anchor, { attributeFilter: ["data-focus-visible"] });
      return () => observer.disconnect();
    });
  }, [store]);
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    store == null ? void 0 : store.setAutoFocusOnShow(true);
  });
  const onFocusProp = props.onFocus;
  const onFocus = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onFocusProp == null ? void 0 : onFocusProp(event);
    if (event.defaultPrevented) return;
    setVisible(true);
  });
  const { style } = _OP2QHIHDcjs.useVisuallyHidden.call(void 0, );
  if (!visible) props = {
    ...props,
    style: {
      ...style,
      ...props.style
    }
  };
  props = {
    children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "svg", {
      display: "block",
      fill: "none",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: 1.5,
      viewBox: "0 0 16 16",
      height: "1em",
      width: "1em",
      children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "polyline", { points: "4,6 8,10 12,6" })
    }),
    ...props,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, store.setDisclosureElement, props.ref),
    onClick,
    onFocus
  };
  props = _DVB2WSHDcjs.useDialogDisclosure.call(void 0, {
    store,
    ...props
  });
  return props;
});
var HovercardDisclosure = _JBOLBTVUcjs.forwardRef.call(void 0, function HovercardDisclosure2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName2, useHovercardDisclosure(props));
});

// ../ariakit-react-components/dist/hovercard/hovercard-provider.js

function HovercardProvider(props = {}) {
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _HCYQ5Z7Zcjs.HovercardContextProvider, {
    value: _HCYQ5Z7Zcjs.useHovercardStore.call(void 0, props),
    children: props.children
  });
}





exports.HovercardArrow = HovercardArrow; exports.HovercardDisclosure = HovercardDisclosure; exports.HovercardProvider = HovercardProvider;
