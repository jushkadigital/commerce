"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _3B6TF7HKcjs = require('./3B6TF7HK.cjs');














var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/portal/portal-context.js
var _react = require('react');
var PortalContext = _react.createContext.call(void 0, null);

// ../ariakit-react-components/dist/portal/portal.js

var _jsxruntime = require('react/jsx-runtime');
var _reactdom = require('react-dom');
var TagName = "div";
function getRootElement(element) {
  const doc = _JBOLBTVUcjs.getDocument.call(void 0, element);
  const { fullscreenElement } = doc;
  if (fullscreenElement instanceof HTMLElement) return fullscreenElement;
  return doc.body;
}
function getPortalElement(element, portalElement) {
  if (!portalElement) return _JBOLBTVUcjs.getDocument.call(void 0, element).createElement("div");
  if (typeof portalElement === "function") return portalElement(element);
  return portalElement;
}
function getRandomId(prefix = "id") {
  return `${prefix ? `${prefix}-` : ""}${Math.random().toString(36).slice(2, 8)}`;
}
function queueFocus(element) {
  queueMicrotask(() => {
    element == null ? void 0 : element.focus();
  });
}
var usePortal = _JBOLBTVUcjs.createHook.call(void 0, function usePortal2({ preserveTabOrder, preserveTabOrderAnchor, portalElement, portalRef, portal = true, ...props }) {
  const ref = _react.useRef.call(void 0, null);
  const refProp = _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref);
  const context = _react.useContext.call(void 0, PortalContext);
  const [portalNode, setPortalNode] = _react.useState.call(void 0, null);
  const [anchorPortalNode, setAnchorPortalNode] = _react.useState.call(void 0, null);
  const outerBeforeRef = _react.useRef.call(void 0, null);
  const innerBeforeRef = _react.useRef.call(void 0, null);
  const innerAfterRef = _react.useRef.call(void 0, null);
  const outerAfterRef = _react.useRef.call(void 0, null);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    const element = ref.current;
    if (!element || !portal) {
      setPortalNode(null);
      return;
    }
    const portalEl = getPortalElement(element, portalElement);
    if (!portalEl) {
      setPortalNode(null);
      return;
    }
    const isPortalInDocument = portalEl.isConnected;
    if (!isPortalInDocument) (context || getRootElement(element)).appendChild(portalEl);
    if (!portalEl.id) portalEl.id = element.id ? `portal/${element.id}` : getRandomId();
    setPortalNode(portalEl);
    _JBOLBTVUcjs.setRef.call(void 0, portalRef, portalEl);
    if (isPortalInDocument) return;
    return () => {
      portalEl.remove();
      _JBOLBTVUcjs.setRef.call(void 0, portalRef, null);
    };
  }, [
    portal,
    portalElement,
    context,
    portalRef
  ]);
  _react.useEffect.call(void 0, () => {
    if (!portalNode) return;
    if (context) return;
    if (portalElement) return;
    const doc = _JBOLBTVUcjs.getDocument.call(void 0, portalNode);
    const onFullscreenChange = () => {
      const rootElement = getRootElement(portalNode);
      if (portalNode.parentElement !== rootElement) rootElement.appendChild(portalNode);
    };
    onFullscreenChange();
    doc.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      doc.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [
    portalNode,
    context,
    portalElement
  ]);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    if (!portal) return;
    if (!preserveTabOrder) return;
    if (!preserveTabOrderAnchor) return;
    const element = _JBOLBTVUcjs.getDocument.call(void 0, preserveTabOrderAnchor).createElement("span");
    element.style.position = "fixed";
    preserveTabOrderAnchor.insertAdjacentElement("afterend", element);
    setAnchorPortalNode(element);
    return () => {
      element.remove();
      setAnchorPortalNode(null);
    };
  }, [
    portal,
    preserveTabOrder,
    preserveTabOrderAnchor
  ]);
  _react.useEffect.call(void 0, () => {
    if (!portalNode) return;
    if (!preserveTabOrder) return;
    let raf = 0;
    const onFocus = (event) => {
      if (!_JBOLBTVUcjs.isFocusEventOutside.call(void 0, event)) return;
      const focusing = event.type === "focusin";
      cancelAnimationFrame(raf);
      if (focusing) return _JBOLBTVUcjs.restoreFocusIn.call(void 0, portalNode);
      raf = requestAnimationFrame(() => {
        _JBOLBTVUcjs.disableFocusIn.call(void 0, portalNode, true);
      });
    };
    portalNode.addEventListener("focusin", onFocus, true);
    portalNode.addEventListener("focusout", onFocus, true);
    return () => {
      cancelAnimationFrame(raf);
      portalNode.removeEventListener("focusin", onFocus, true);
      portalNode.removeEventListener("focusout", onFocus, true);
    };
  }, [portalNode, preserveTabOrder]);
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => {
    element = /* @__PURE__ */ _jsxruntime.jsx.call(void 0, PortalContext.Provider, {
      value: portalNode || context,
      children: element
    });
    if (!portal) return element;
    if (!portalNode) return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "span", {
      ref: refProp,
      id: props.id,
      style: { position: "fixed" },
      hidden: true
    });
    element = /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, _jsxruntime.Fragment, { children: [
      preserveTabOrder && portalNode && /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _3B6TF7HKcjs.FocusTrap, {
        ref: innerBeforeRef,
        "data-focus-trap": props.id,
        className: "__focus-trap-inner-before",
        onFocus: (event) => {
          if (_JBOLBTVUcjs.isFocusEventOutside.call(void 0, event, portalNode)) queueFocus(_JBOLBTVUcjs.getNextTabbable.call(void 0, ));
          else queueFocus(outerBeforeRef.current);
        }
      }),
      element,
      preserveTabOrder && portalNode && /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _3B6TF7HKcjs.FocusTrap, {
        ref: innerAfterRef,
        "data-focus-trap": props.id,
        className: "__focus-trap-inner-after",
        onFocus: (event) => {
          if (_JBOLBTVUcjs.isFocusEventOutside.call(void 0, event, portalNode)) queueFocus(_JBOLBTVUcjs.getPreviousTabbable.call(void 0, ));
          else queueFocus(outerAfterRef.current);
        }
      })
    ] });
    if (portalNode) element = _reactdom.createPortal.call(void 0, element, portalNode);
    let preserveTabOrderElement = /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, _jsxruntime.Fragment, { children: [
      preserveTabOrder && portalNode && /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _3B6TF7HKcjs.FocusTrap, {
        ref: outerBeforeRef,
        "data-focus-trap": props.id,
        className: "__focus-trap-outer-before",
        onFocus: (event) => {
          if (!(event.relatedTarget === outerAfterRef.current) && _JBOLBTVUcjs.isFocusEventOutside.call(void 0, event, portalNode)) queueFocus(innerBeforeRef.current);
          else queueFocus(_JBOLBTVUcjs.getPreviousTabbable.call(void 0, ));
        }
      }),
      preserveTabOrder && /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "span", {
        "aria-owns": portalNode == null ? void 0 : portalNode.id,
        style: { position: "fixed" }
      }),
      preserveTabOrder && portalNode && /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _3B6TF7HKcjs.FocusTrap, {
        ref: outerAfterRef,
        "data-focus-trap": props.id,
        className: "__focus-trap-outer-after",
        onFocus: (event) => {
          if (_JBOLBTVUcjs.isFocusEventOutside.call(void 0, event, portalNode)) queueFocus(innerAfterRef.current);
          else {
            const nextTabbable = _JBOLBTVUcjs.getNextTabbable.call(void 0, );
            if (nextTabbable === innerBeforeRef.current) {
              requestAnimationFrame(() => {
                var _a;
                return (_a = _JBOLBTVUcjs.getNextTabbable.call(void 0, )) == null ? void 0 : _a.focus();
              });
              return;
            }
            queueFocus(nextTabbable);
          }
        }
      })
    ] });
    if (anchorPortalNode && preserveTabOrder) preserveTabOrderElement = _reactdom.createPortal.call(void 0, preserveTabOrderElement, anchorPortalNode);
    return /* @__PURE__ */ _jsxruntime.jsxs.call(void 0, _jsxruntime.Fragment, { children: [preserveTabOrderElement, element] });
  }, [
    portalNode,
    context,
    portal,
    props.id,
    preserveTabOrder,
    anchorPortalNode
  ]);
  props = {
    ...props,
    ref: refProp
  };
  return props;
});
var Portal = _JBOLBTVUcjs.forwardRef.call(void 0, function Portal2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, usePortal(props));
});





exports.PortalContext = PortalContext; exports.usePortal = usePortal; exports.Portal = Portal;
