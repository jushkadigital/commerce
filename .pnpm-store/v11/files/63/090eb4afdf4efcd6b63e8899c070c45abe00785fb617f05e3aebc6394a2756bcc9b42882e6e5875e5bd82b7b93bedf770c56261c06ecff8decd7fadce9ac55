"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _BTARPES4cjs = require('./BTARPES4.cjs');














var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/command/command.js
var _react = require('react');
var TagName = "button";
function isNativeClick(event) {
  if (!event.isTrusted) return false;
  const element = event.currentTarget;
  if (event.key === "Enter") return _JBOLBTVUcjs.isButton.call(void 0, element) || element.tagName === "SUMMARY" || element.tagName === "A";
  if (event.key === " ") return _JBOLBTVUcjs.isButton.call(void 0, element) || element.tagName === "SUMMARY" || element.tagName === "INPUT" || element.tagName === "SELECT";
  return false;
}
var symbol = /* @__PURE__ */ Symbol("command");
var useCommand = _JBOLBTVUcjs.createHook.call(void 0, function useCommand2({ clickOnEnter = true, clickOnSpace = true, ...props }) {
  const ref = _react.useRef.call(void 0, null);
  const [isNativeButton, setIsNativeButton] = _react.useState.call(void 0, false);
  _react.useEffect.call(void 0, () => {
    if (!ref.current) return;
    setIsNativeButton(_JBOLBTVUcjs.isButton.call(void 0, ref.current));
  }, []);
  const [active, setActive] = _react.useState.call(void 0, false);
  const activeRef = _react.useRef.call(void 0, false);
  const disabled = _JBOLBTVUcjs.disabledFromProps.call(void 0, props);
  const [isDuplicate, metadataProps] = _JBOLBTVUcjs.useMetadataProps.call(void 0, props, symbol, true);
  const onKeyDownProp = props.onKeyDown;
  const onKeyDown = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onKeyDownProp == null ? void 0 : onKeyDownProp(event);
    const element = event.currentTarget;
    if (event.defaultPrevented) return;
    if (isDuplicate) return;
    if (disabled) return;
    if (!_JBOLBTVUcjs.isSelfTarget.call(void 0, event)) return;
    if (_JBOLBTVUcjs.isTextField.call(void 0, element)) return;
    if (element.isContentEditable) return;
    const isEnter = clickOnEnter && event.key === "Enter";
    const isSpace = clickOnSpace && event.key === " ";
    const shouldPreventEnter = event.key === "Enter" && !clickOnEnter;
    const shouldPreventSpace = event.key === " " && !clickOnSpace;
    if (shouldPreventEnter || shouldPreventSpace) {
      event.preventDefault();
      return;
    }
    if (isEnter || isSpace) {
      const nativeClick = isNativeClick(event);
      if (isEnter) {
        if (!nativeClick) {
          event.preventDefault();
          const { view, ...eventInit } = event;
          const click = () => _JBOLBTVUcjs.fireClickEvent.call(void 0, element, eventInit);
          if (_JBOLBTVUcjs.isFirefox.call(void 0, )) _JBOLBTVUcjs.queueBeforeEvent.call(void 0, element, "keyup", click);
          else queueMicrotask(click);
        }
      } else if (isSpace) {
        activeRef.current = true;
        if (!nativeClick) {
          event.preventDefault();
          setActive(true);
        }
      }
    }
  });
  const onKeyUpProp = props.onKeyUp;
  const onKeyUp = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onKeyUpProp == null ? void 0 : onKeyUpProp(event);
    if (event.defaultPrevented) return;
    if (isDuplicate) return;
    if (disabled) return;
    if (event.metaKey) return;
    const isSpace = clickOnSpace && event.key === " ";
    if (activeRef.current && isSpace) {
      activeRef.current = false;
      if (!isNativeClick(event)) {
        event.preventDefault();
        setActive(false);
        const element = event.currentTarget;
        const { view, ...eventInit } = event;
        queueMicrotask(() => _JBOLBTVUcjs.fireClickEvent.call(void 0, element, eventInit));
      }
    }
  });
  props = {
    "data-active": active || void 0,
    type: isNativeButton ? "button" : void 0,
    ...metadataProps,
    ...props,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref),
    onKeyDown,
    onKeyUp
  };
  props = _BTARPES4cjs.useFocusable.call(void 0, props);
  return props;
});
var Command = _JBOLBTVUcjs.forwardRef.call(void 0, function Command2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useCommand(props));
});




exports.useCommand = useCommand; exports.Command = Command;
