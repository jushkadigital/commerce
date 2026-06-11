"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _NBAYASRCcjs = require('./NBAYASRC.cjs');


var _WYI5CKPVcjs = require('./WYI5CKPV.cjs');


var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');






var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/dialog/dialog-disclosure.js
var TagName = "button";
var useDialogDisclosure = _JBOLBTVUcjs.createHook.call(void 0, function useDialogDisclosure2({ store, ...props }) {
  const context = _WYI5CKPVcjs.useDialogProviderContext.call(void 0, );
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "DialogDisclosure must receive a `store` prop or be wrapped in a DialogProvider component.");
  props = {
    "aria-haspopup": _JBOLBTVUcjs.getPopupRole.call(void 0, _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "contentElement"), "dialog"),
    ...props
  };
  props = _NBAYASRCcjs.useDisclosure.call(void 0, {
    store,
    ...props
  });
  return props;
});
var DialogDisclosure = _JBOLBTVUcjs.forwardRef.call(void 0, function DialogDisclosure2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useDialogDisclosure(props));
});




exports.useDialogDisclosure = useDialogDisclosure; exports.DialogDisclosure = DialogDisclosure;
