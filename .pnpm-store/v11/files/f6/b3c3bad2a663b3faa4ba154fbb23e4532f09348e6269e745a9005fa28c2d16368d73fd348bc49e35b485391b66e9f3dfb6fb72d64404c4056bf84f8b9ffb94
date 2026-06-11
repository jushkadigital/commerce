"use strict";Object.defineProperty(exports, "__esModule", {value: true});










var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');













var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/disclosure/disclosure-context.js
var ctx = _JBOLBTVUcjs.createStoreContext.call(void 0, );
var useDisclosureContext = ctx.useContext;
var useDisclosureScopedContext = ctx.useScopedContext;
var useDisclosureProviderContext = ctx.useProviderContext;
var DisclosureContextProvider = ctx.ContextProvider;
var DisclosureScopedContextProvider = ctx.ScopedContextProvider;

// ../ariakit-react-components/dist/dialog/dialog-context.js
var _react = require('react');
var ctx2 = _JBOLBTVUcjs.createStoreContext.call(void 0, [DisclosureContextProvider], [DisclosureScopedContextProvider]);
var useDialogContext = ctx2.useContext;
var useDialogScopedContext = ctx2.useScopedContext;
var useDialogProviderContext = ctx2.useProviderContext;
var DialogContextProvider = ctx2.ContextProvider;
var DialogScopedContextProvider = ctx2.ScopedContextProvider;
var DialogHeadingContext = _react.createContext.call(void 0, void 0);
var DialogDescriptionContext = _react.createContext.call(void 0, void 0);

// ../ariakit-react-components/dist/disclosure/disclosure-content.js

var _jsxruntime = require('react/jsx-runtime');
var _reactdom = require('react-dom');
var TagName = "div";
function afterTimeout(timeoutMs, cb) {
  const timeoutId = setTimeout(cb, timeoutMs);
  return () => clearTimeout(timeoutId);
}
function afterPaint(cb) {
  let raf = requestAnimationFrame(() => {
    raf = requestAnimationFrame(cb);
  });
  return () => cancelAnimationFrame(raf);
}
function parseCSSTime(...times) {
  return times.join(", ").split(", ").reduce((longestTime, currentTimeString) => {
    const multiplier = currentTimeString.endsWith("ms") ? 1 : 1e3;
    const currentTime = Number.parseFloat(currentTimeString || "0s") * multiplier;
    if (currentTime > longestTime) return currentTime;
    return longestTime;
  }, 0);
}
function isHidden(mounted, hidden, alwaysVisible) {
  return !alwaysVisible && hidden !== false && (!mounted || !!hidden);
}
var useDisclosureContent = _JBOLBTVUcjs.createHook.call(void 0, function useDisclosureContent2({ store, alwaysVisible, ...props }) {
  const context = useDisclosureProviderContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "DisclosureContent must receive a `store` prop or be wrapped in a DisclosureProvider component.");
  const ref = _react.useRef.call(void 0, null);
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const [transition, setTransition] = _react.useState.call(void 0, null);
  const open = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "open");
  const mounted = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "mounted");
  const animated = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "animated");
  const contentElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "contentElement");
  const otherElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store.disclosure, "contentElement");
  const hasClosedRef = _react.useRef.call(void 0, false);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    if (!ref.current) return;
    store == null ? void 0 : store.setContentElement(ref.current);
  }, [store]);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    let previousAnimated;
    store == null ? void 0 : store.setState("animated", (animated2) => {
      previousAnimated = animated2;
      return true;
    });
    return () => {
      if (previousAnimated === void 0) return;
      store == null ? void 0 : store.setState("animated", previousAnimated);
    };
  }, [store]);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    if (!animated) {
      if (!open) {
        hasClosedRef.current = true;
        setTransition(null);
      } else if (hasClosedRef.current) {
        hasClosedRef.current = false;
        setTransition("enter");
      }
      return;
    }
    if (!(contentElement == null ? void 0 : contentElement.isConnected)) {
      setTransition(null);
      return;
    }
    return afterPaint(() => {
      setTransition(open ? "enter" : mounted ? "leave" : null);
    });
  }, [
    animated,
    contentElement,
    open,
    mounted
  ]);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    if (!store) return;
    if (!animated) return;
    if (!transition) return;
    if (!contentElement) return;
    const stopAnimation = () => store == null ? void 0 : store.setState("animating", false);
    const stopAnimationSync = () => _reactdom.flushSync.call(void 0, stopAnimation);
    if (transition === "leave" && open) return;
    if (transition === "enter" && !open) return;
    if (typeof animated === "number") return afterTimeout(animated, stopAnimationSync);
    const { transitionDuration, animationDuration, transitionDelay, animationDelay } = getComputedStyle(contentElement);
    const { transitionDuration: transitionDuration2 = "0", animationDuration: animationDuration2 = "0", transitionDelay: transitionDelay2 = "0", animationDelay: animationDelay2 = "0" } = otherElement ? getComputedStyle(otherElement) : {};
    const timeout = parseCSSTime(transitionDelay, animationDelay, transitionDelay2, animationDelay2) + parseCSSTime(transitionDuration, animationDuration, transitionDuration2, animationDuration2);
    if (!timeout) {
      if (transition === "enter") store.setState("animated", false);
      stopAnimation();
      return;
    }
    return afterTimeout(Math.max(timeout - 1e3 / 60, 0), stopAnimationSync);
  }, [
    store,
    animated,
    contentElement,
    otherElement,
    open,
    transition
  ]);
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, DialogScopedContextProvider, {
    value: store,
    children: element
  }), [store]);
  const hidden = isHidden(mounted, props.hidden, alwaysVisible);
  const styleProp = props.style;
  const style = _react.useMemo.call(void 0, () => {
    if (hidden) return {
      ...styleProp,
      display: "none"
    };
    return styleProp;
  }, [hidden, styleProp]);
  props = {
    "data-open": open || void 0,
    "data-enter": transition === "enter" || void 0,
    "data-leave": transition === "leave" || void 0,
    hidden,
    ...props,
    id,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, id ? store.setContentElement : null, ref, props.ref),
    style
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var DisclosureContentImpl = _JBOLBTVUcjs.forwardRef.call(void 0, function DisclosureContentImpl2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useDisclosureContent(props));
});
var DisclosureContent = _JBOLBTVUcjs.forwardRef.call(void 0, function DisclosureContent2({ unmountOnHide, ...props }) {
  const context = useDisclosureProviderContext();
  if (_FHPV2Q7Ccjs.useStoreState.call(void 0, props.store || context, (state) => !unmountOnHide || (state == null ? void 0 : state.mounted)) === false) return null;
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, DisclosureContentImpl, { ...props });
});

// ../ariakit-components/dist/disclosure/disclosure-store.js
function createDisclosureStore(props = {}) {
  const store = _FHPV2Q7Ccjs.mergeStore.call(void 0, props.store, _FHPV2Q7Ccjs.omit.call(void 0, props.disclosure, ["contentElement", "disclosureElement"]));
  _FHPV2Q7Ccjs.throwOnConflictingProps.call(void 0, props, store);
  const syncState = store == null ? void 0 : store.getState();
  const open = _JBOLBTVUcjs.defaultValue.call(void 0, props.open, syncState == null ? void 0 : syncState.open, props.defaultOpen, false);
  const animated = _JBOLBTVUcjs.defaultValue.call(void 0, props.animated, syncState == null ? void 0 : syncState.animated, false);
  const disclosure = _FHPV2Q7Ccjs.createStore.call(void 0, {
    open,
    animated,
    animating: !!animated && open,
    mounted: open,
    contentElement: _JBOLBTVUcjs.defaultValue.call(void 0, syncState == null ? void 0 : syncState.contentElement, null),
    disclosureElement: _JBOLBTVUcjs.defaultValue.call(void 0, syncState == null ? void 0 : syncState.disclosureElement, null)
  }, store);
  _FHPV2Q7Ccjs.setup.call(void 0, disclosure, () => _FHPV2Q7Ccjs.sync.call(void 0, disclosure, ["animated", "animating"], (state) => {
    if (state.animated) return;
    disclosure.setState("animating", false);
  }));
  _FHPV2Q7Ccjs.setup.call(void 0, disclosure, () => _FHPV2Q7Ccjs.subscribe.call(void 0, disclosure, ["open"], () => {
    if (!disclosure.getState().animated) return;
    disclosure.setState("animating", true);
  }));
  _FHPV2Q7Ccjs.setup.call(void 0, disclosure, () => _FHPV2Q7Ccjs.sync.call(void 0, disclosure, ["open", "animating"], (state) => {
    disclosure.setState("mounted", state.open || state.animating);
  }));
  return {
    ...disclosure,
    disclosure: props.disclosure,
    setOpen: (value) => disclosure.setState("open", value),
    show: () => disclosure.setState("open", true),
    hide: () => disclosure.setState("open", false),
    toggle: () => disclosure.setState("open", (open2) => !open2),
    stopAnimation: () => disclosure.setState("animating", false),
    setContentElement: (value) => disclosure.setState("contentElement", value),
    setDisclosureElement: (value) => disclosure.setState("disclosureElement", value)
  };
}

// ../ariakit-react-components/dist/disclosure/disclosure-store.js
function useDisclosureStoreProps(store, update, props) {
  _JBOLBTVUcjs.useUpdateEffect.call(void 0, update, [props.store, props.disclosure]);
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "open", "setOpen");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "mounted", "setMounted");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "animated");
  return Object.assign(store, { disclosure: props.disclosure });
}
function useDisclosureStore(props = {}) {
  const [store, update] = _FHPV2Q7Ccjs.useStore.call(void 0, createDisclosureStore, props);
  return useDisclosureStoreProps(store, update, props);
}


















exports.useDisclosureContext = useDisclosureContext; exports.useDisclosureProviderContext = useDisclosureProviderContext; exports.DisclosureContextProvider = DisclosureContextProvider; exports.useDialogContext = useDialogContext; exports.useDialogScopedContext = useDialogScopedContext; exports.useDialogProviderContext = useDialogProviderContext; exports.DialogContextProvider = DialogContextProvider; exports.DialogScopedContextProvider = DialogScopedContextProvider; exports.DialogHeadingContext = DialogHeadingContext; exports.DialogDescriptionContext = DialogDescriptionContext; exports.isHidden = isHidden; exports.useDisclosureContent = useDisclosureContent; exports.DisclosureContent = DisclosureContent; exports.createDisclosureStore = createDisclosureStore; exports.useDisclosureStoreProps = useDisclosureStoreProps; exports.useDisclosureStore = useDisclosureStore;
