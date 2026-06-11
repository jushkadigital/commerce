"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _WYI5CKPVcjs = require('./WYI5CKPV.cjs');


var _P7AY4KL3cjs = require('./P7AY4KL3.cjs');


var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');









var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/disclosure/disclosure.js
var _react = require('react');
var TagName = "button";
var symbol = /* @__PURE__ */ Symbol("disclosure");
var useDisclosure = _JBOLBTVUcjs.createHook.call(void 0, function useDisclosure2({ store, toggleOnClick = true, ...props }) {
  var _a;
  const context = _WYI5CKPVcjs.useDisclosureProviderContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "Disclosure must receive a `store` prop or be wrapped in a DisclosureProvider component.");
  const ref = _react.useRef.call(void 0, null);
  const [expanded, setExpanded] = _react.useState.call(void 0, false);
  const disclosureElement = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "disclosureElement");
  const open = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "open");
  _react.useEffect.call(void 0, () => {
    let isCurrentDisclosure = disclosureElement === ref.current;
    if (!(disclosureElement == null ? void 0 : disclosureElement.isConnected)) {
      store == null ? void 0 : store.setDisclosureElement(ref.current);
      isCurrentDisclosure = true;
    }
    setExpanded(open && isCurrentDisclosure);
  }, [
    disclosureElement,
    store,
    open
  ]);
  const onClickProp = props.onClick;
  const toggleOnClickProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, toggleOnClick);
  const [isDuplicate, metadataProps] = _JBOLBTVUcjs.useMetadataProps.call(void 0, props, symbol, true);
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    if (isDuplicate) return;
    if (!toggleOnClickProp(event)) return;
    store == null ? void 0 : store.setDisclosureElement(event.currentTarget);
    store == null ? void 0 : store.toggle();
  });
  props = {
    "aria-expanded": expanded,
    "aria-controls": (_a = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "contentElement")) == null ? void 0 : _a.id,
    ...metadataProps,
    ...props,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref),
    onClick
  };
  props = _P7AY4KL3cjs.useButton.call(void 0, props);
  return props;
});
var Disclosure = _JBOLBTVUcjs.forwardRef.call(void 0, function Disclosure2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useDisclosure(props));
});




exports.useDisclosure = useDisclosure; exports.Disclosure = Disclosure;
