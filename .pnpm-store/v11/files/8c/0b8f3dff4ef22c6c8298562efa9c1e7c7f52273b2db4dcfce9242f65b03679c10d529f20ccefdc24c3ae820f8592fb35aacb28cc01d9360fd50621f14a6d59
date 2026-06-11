"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _WYI5CKPVcjs = require('./WYI5CKPV.cjs');







var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/dialog/dialog-description.js
var _react = require('react');
var TagName = "p";
var useDialogDescription = _JBOLBTVUcjs.createHook.call(void 0, function useDialogDescription2({ store, ...props }) {
  const setDescriptionId = _react.useContext.call(void 0, _WYI5CKPVcjs.DialogDescriptionContext);
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    setDescriptionId == null ? void 0 : setDescriptionId(id);
    return () => setDescriptionId == null ? void 0 : setDescriptionId(void 0);
  }, [setDescriptionId, id]);
  props = {
    ...props,
    id
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var DialogDescription = _JBOLBTVUcjs.forwardRef.call(void 0, function DialogDescription2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useDialogDescription(props));
});




exports.useDialogDescription = useDialogDescription; exports.DialogDescription = DialogDescription;
