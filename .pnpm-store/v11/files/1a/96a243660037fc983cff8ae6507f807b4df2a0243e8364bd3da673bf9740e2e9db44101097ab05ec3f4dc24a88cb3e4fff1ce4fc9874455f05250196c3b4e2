"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _KDVG735Hcjs = require('./KDVG735H.cjs');


var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');











var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/popover/popover-arrow-path.js
var POPOVER_ARROW_PATH = "M23 27.8C24.1 29 26.4 30 28 30H30H0H2C3.7 30 5.9 29 7 27.8L14 20.6C14.7 19.8 15.3 19.8 16 20.6L23 27.8Z";

// ../ariakit-react-components/dist/popover/popover-arrow.js
var _react = require('react');
var _jsxruntime = require('react/jsx-runtime');
var TagName = "div";
var defaultSize = 30;
var halfDefaultSize = defaultSize / 2;
var rotateMap = {
  top: `rotate(180 ${halfDefaultSize} ${halfDefaultSize})`,
  right: `rotate(-90 ${halfDefaultSize} ${halfDefaultSize})`,
  bottom: `rotate(0 ${halfDefaultSize} ${halfDefaultSize})`,
  left: `rotate(90 ${halfDefaultSize} ${halfDefaultSize})`
};
function useComputedStyle(store) {
  const [style, setStyle] = _react.useState.call(void 0, );
  const contentElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "contentElement");
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    if (!contentElement) return;
    setStyle(_JBOLBTVUcjs.getWindow.call(void 0, contentElement).getComputedStyle(contentElement));
  }, [contentElement]);
  return style;
}
function getRingWidth(style) {
  var _a;
  if (!style) return;
  return (_a = style.getPropertyValue("box-shadow").match(/0px 0px 0px ([^0]+px)/)) == null ? void 0 : _a[1];
}
function getBorderColor(dir, style) {
  if (!style) return;
  const borderColor = style.getPropertyValue(`border-${dir}-color`);
  if (borderColor) return borderColor;
  const match = style.getPropertyValue("box-shadow").match(/0px 0px 0px [^,]+/);
  if (!match) return;
  return match[0].replace(/^0px 0px 0px\s+[^\s,]+/, "").trim() || void 0;
}
var usePopoverArrow = _JBOLBTVUcjs.createHook.call(void 0, function usePopoverArrow2({ store, size = defaultSize, borderWidth: borderWidthProp, ...props }) {
  const context = _KDVG735Hcjs.usePopoverContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "PopoverArrow must be wrapped in a Popover component.");
  const dir = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.currentPlacement.split("-")[0]);
  const maskId = _JBOLBTVUcjs.useId.call(void 0, );
  const style = useComputedStyle(store);
  const stroke = getBorderColor(dir, style) || "none";
  const fill = (style == null ? void 0 : style.getPropertyValue("background-color")) || "none";
  const [borderWidth, isRing] = _react.useMemo.call(void 0, () => {
    if (borderWidthProp != null) return [borderWidthProp, false];
    if (!style) return [0, false];
    const ringWidth = getRingWidth(style);
    if (ringWidth) return [Number.parseInt(ringWidth, 10), true];
    const borderWidth2 = style.getPropertyValue(`border-${dir}-width`);
    if (borderWidth2) {
      const parsed = Number.parseFloat(borderWidth2);
      if (!Number.isNaN(parsed)) return [Math.ceil(parsed), false];
    }
    return [0, false];
  }, [
    borderWidthProp,
    style,
    dir
  ]);
  const strokeWidth = borderWidth * 2 * (defaultSize / size);
  const transform = rotateMap[dir];
  props = {
    children: _react.useMemo.call(void 0, () => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "svg", {
      display: "block",
      viewBox: "0 0 30 30",
      children: /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, "g", {
        transform,
        children: [
          !isRing && /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "path", {
            fill: "none",
            stroke: fill,
            d: "M23 27.8C24.1 29 26.4 30 28 30H30H0H2C3.7 30 5.9 29 7 27.8L14 20.6C14.7 19.8 15.3 19.8 16 20.6L23 27.8Z",
            mask: `url(#${maskId})`
          }),
          /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "path", {
            fill: "none",
            d: POPOVER_ARROW_PATH,
            mask: `url(#${maskId})`
          }),
          /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "path", {
            stroke: "none",
            d: POPOVER_ARROW_PATH
          }),
          /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "mask", {
            id: maskId,
            maskUnits: "userSpaceOnUse",
            children: /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "rect", {
              x: "-15",
              y: "0",
              width: "60",
              height: "30",
              fill: "white",
              stroke: "black"
            })
          })
        ]
      })
    }), [
      transform,
      isRing,
      fill,
      maskId
    ]),
    "aria-hidden": true,
    ...props,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, store.setArrowElement, props.ref),
    style: {
      position: "absolute",
      fontSize: size,
      width: "1em",
      height: "1em",
      pointerEvents: "none",
      fill,
      stroke,
      strokeWidth,
      ...props.style
    }
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var PopoverArrow = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function PopoverArrow2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, usePopoverArrow(props));
}));




exports.usePopoverArrow = usePopoverArrow; exports.PopoverArrow = PopoverArrow;
