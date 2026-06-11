"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _ZPWE3FTFcjs = require('./ZPWE3FTF.cjs');



var _2WBRQ3I7cjs = require('./2WBRQ3I7.cjs');


var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');













var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/radio/radio-context.js
var ctx = _JBOLBTVUcjs.createStoreContext.call(void 0, [_2WBRQ3I7cjs.CompositeContextProvider], [_2WBRQ3I7cjs.CompositeScopedContextProvider]);
var useRadioContext = ctx.useContext;
var useRadioScopedContext = ctx.useScopedContext;
var useRadioProviderContext = ctx.useProviderContext;
var RadioContextProvider = ctx.ContextProvider;
var RadioScopedContextProvider = ctx.ScopedContextProvider;

// ../ariakit-react-components/dist/radio/radio.js
var _react = require('react');
var TagName = "input";
function getIsChecked(value, storeValue) {
  if (storeValue === void 0) return;
  if (value != null && storeValue != null) return storeValue === value;
  return !!storeValue;
}
function isNativeRadio(tagName, type) {
  return tagName === "input" && (!type || type === "radio");
}
var useRadio = _JBOLBTVUcjs.createHook.call(void 0, function useRadio2({ store, name: nameProp, value, checked, ...props }) {
  const context = useRadioContext();
  store = store || context;
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const ref = _react.useRef.call(void 0, null);
  const isChecked = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => checked != null ? checked : getIsChecked(value, state == null ? void 0 : state.value));
  const storeId = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state == null ? void 0 : state.id);
  const name = nameProp != null ? nameProp : storeId;
  _react.useEffect.call(void 0, () => {
    if (!id) return;
    if (!isChecked) return;
    if ((store == null ? void 0 : store.getState().activeId) === id) return;
    store == null ? void 0 : store.setActiveId(id);
  }, [
    store,
    isChecked,
    id
  ]);
  const onChangeProp = props.onChange;
  const nativeRadio = isNativeRadio(_JBOLBTVUcjs.useTagName.call(void 0, ref, TagName), props.type);
  const disabled = _JBOLBTVUcjs.disabledFromProps.call(void 0, props);
  const [propertyUpdated, schedulePropertyUpdate] = _JBOLBTVUcjs.useForceUpdate.call(void 0, );
  _react.useEffect.call(void 0, () => {
    const element = ref.current;
    if (!element) return;
    if (nativeRadio) return;
    if (isChecked !== void 0) element.checked = isChecked;
    if (name !== void 0) element.name = name;
    if (value !== void 0) element.value = `${value}`;
  }, [
    propertyUpdated,
    nativeRadio,
    isChecked,
    name,
    value
  ]);
  const onChange = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if ((store == null ? void 0 : store.getState().value) === value) return;
    if (!nativeRadio) {
      event.currentTarget.checked = true;
      schedulePropertyUpdate();
    }
    onChangeProp == null ? void 0 : onChangeProp(event);
    if (event.defaultPrevented) return;
    store == null ? void 0 : store.setValue(value);
  });
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    if (nativeRadio) return;
    onChange(event);
  });
  const onFocusProp = props.onFocus;
  const onFocus = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onFocusProp == null ? void 0 : onFocusProp(event);
    if (event.defaultPrevented) return;
    if (!nativeRadio) return;
    if (!store) return;
    const { moves, activeId } = store.getState();
    if (!moves) return;
    if (id && activeId !== id) return;
    onChange(event);
  });
  props = {
    role: !nativeRadio ? "radio" : void 0,
    type: nativeRadio ? "radio" : void 0,
    "aria-checked": isChecked,
    ...props,
    id,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref),
    onChange,
    onClick,
    onFocus
  };
  props = _ZPWE3FTFcjs.useCompositeItem.call(void 0, {
    store,
    clickOnEnter: !nativeRadio,
    ...props
  });
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, {
    name: nativeRadio ? name : void 0,
    value: nativeRadio ? value : void 0,
    checked: isChecked,
    ...props
  });
});
var Radio = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function Radio2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useRadio(props));
}));








exports.useRadioContext = useRadioContext; exports.useRadioProviderContext = useRadioProviderContext; exports.RadioContextProvider = RadioContextProvider; exports.RadioScopedContextProvider = RadioScopedContextProvider; exports.useRadio = useRadio; exports.Radio = Radio;
