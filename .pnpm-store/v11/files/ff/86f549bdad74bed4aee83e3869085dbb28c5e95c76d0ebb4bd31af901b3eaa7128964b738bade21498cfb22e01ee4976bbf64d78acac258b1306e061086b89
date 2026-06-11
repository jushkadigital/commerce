"use strict";Object.defineProperty(exports, "__esModule", {value: true});







var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/group/group-label-context.js
var _react = require('react');
var GroupLabelContext = _react.createContext.call(void 0, void 0);

// ../ariakit-react-components/dist/group/group.js

var _jsxruntime = require('react/jsx-runtime');
var TagName = "div";
var useGroup = _JBOLBTVUcjs.createHook.call(void 0, function useGroup2(props) {
  const [labelId, setLabelId] = _react.useState.call(void 0, );
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, GroupLabelContext.Provider, {
    value: setLabelId,
    children: element
  }), []);
  props = {
    role: "group",
    "aria-labelledby": props["aria-label"] != null ? void 0 : labelId,
    ...props
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var Group = _JBOLBTVUcjs.forwardRef.call(void 0, function Group2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useGroup(props));
});

// ../ariakit-react-components/dist/group/group-label.js

var TagName2 = "div";
var useGroupLabel = _JBOLBTVUcjs.createHook.call(void 0, function useGroupLabel2(props) {
  const setLabelId = _react.useContext.call(void 0, GroupLabelContext);
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  _JBOLBTVUcjs.useSafeLayoutEffect.call(void 0, () => {
    setLabelId == null ? void 0 : setLabelId(id);
    return () => setLabelId == null ? void 0 : setLabelId(void 0);
  }, [setLabelId, id]);
  props = {
    "aria-hidden": true,
    ...props,
    id
  };
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, props);
});
var GroupLabel = _JBOLBTVUcjs.forwardRef.call(void 0, function GroupLabel2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName2, useGroupLabel(props));
});






exports.useGroup = useGroup; exports.Group = Group; exports.useGroupLabel = useGroupLabel; exports.GroupLabel = GroupLabel;
