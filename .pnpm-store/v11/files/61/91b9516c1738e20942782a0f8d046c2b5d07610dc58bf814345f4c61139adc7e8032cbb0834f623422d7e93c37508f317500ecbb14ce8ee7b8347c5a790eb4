"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _X4U3XKYQcjs = require('./X4U3XKYQ.cjs');






var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');


var _TMY4OIYCcjs = require('./TMY4OIYC.cjs');














var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/checkbox/checkbox-context.js
var ctx = _JBOLBTVUcjs.createStoreContext.call(void 0, );
var useCheckboxContext = ctx.useContext;
var useCheckboxScopedContext = ctx.useScopedContext;
var useCheckboxProviderContext = ctx.useProviderContext;
var CheckboxContextProvider = ctx.ContextProvider;
var CheckboxScopedContextProvider = ctx.ScopedContextProvider;

// ../ariakit-react-components/dist/checkbox/checkbox.js
var _react = require('react');
var _jsxruntime = require('react/jsx-runtime');
var TagName = "input";
function setMixed(element, mixed) {
  if (mixed) element.indeterminate = true;
  else if (element.indeterminate) element.indeterminate = false;
}
function isNativeCheckbox(tagName, type) {
  return tagName === "input" && (!type || type === "checkbox");
}
function getPrimitiveValue(value) {
  if (Array.isArray(value)) return value.toString();
  return value;
}
var useCheckbox = _JBOLBTVUcjs.createHook.call(void 0, function useCheckbox2({ store, name, value: valueProp, checked: checkedProp, defaultChecked, ...props }) {
  const context = useCheckboxContext();
  store = store || context;
  const [_checked, setChecked] = _react.useState.call(void 0, defaultChecked != null ? defaultChecked : false);
  const checked = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => {
    if (checkedProp !== void 0) return checkedProp;
    if ((state == null ? void 0 : state.value) === void 0) return _checked;
    if (valueProp != null) {
      if (Array.isArray(state.value)) {
        const primitiveValue = getPrimitiveValue(valueProp);
        return state.value.includes(primitiveValue);
      }
      return state.value === valueProp;
    }
    if (Array.isArray(state.value)) return false;
    if (typeof state.value === "boolean") return state.value;
    return false;
  });
  const ref = _react.useRef.call(void 0, null);
  const nativeCheckbox = isNativeCheckbox(_JBOLBTVUcjs.useTagName.call(void 0, ref, TagName), props.type);
  const mixed = checked ? checked === "mixed" : void 0;
  const isChecked = checked === "mixed" ? false : checked;
  const disabled = _JBOLBTVUcjs.disabledFromProps.call(void 0, props);
  const [propertyUpdated, schedulePropertyUpdate] = _JBOLBTVUcjs.useForceUpdate.call(void 0, );
  _react.useEffect.call(void 0, () => {
    const element = ref.current;
    if (!element) return;
    setMixed(element, mixed);
    if (nativeCheckbox) return;
    element.checked = isChecked;
    if (name !== void 0) element.name = name;
    if (valueProp !== void 0) element.value = String(valueProp);
  }, [
    propertyUpdated,
    mixed,
    nativeCheckbox,
    isChecked,
    name,
    valueProp
  ]);
  const onChangeProp = props.onChange;
  const onChange = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    if (disabled) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    setMixed(event.currentTarget, mixed);
    if (!nativeCheckbox) {
      event.currentTarget.checked = !event.currentTarget.checked;
      schedulePropertyUpdate();
    }
    onChangeProp == null ? void 0 : onChangeProp(event);
    if (event.defaultPrevented) return;
    const elementChecked = event.currentTarget.checked;
    setChecked(elementChecked);
    store == null ? void 0 : store.setValue((prevValue) => {
      if (valueProp == null) return elementChecked;
      const primitiveValue = getPrimitiveValue(valueProp);
      if (!Array.isArray(prevValue)) return prevValue === primitiveValue ? false : primitiveValue;
      if (elementChecked) {
        if (prevValue.includes(primitiveValue)) return prevValue;
        return [...prevValue, primitiveValue];
      }
      return prevValue.filter((v) => v !== primitiveValue);
    });
  });
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    if (nativeCheckbox) return;
    onChange(event);
  });
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _X4U3XKYQcjs.CheckboxCheckedContext.Provider, {
    value: isChecked,
    children: element
  }), [isChecked]);
  props = {
    role: !nativeCheckbox ? "checkbox" : void 0,
    type: nativeCheckbox ? "checkbox" : void 0,
    "aria-checked": checked,
    ...props,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref),
    onChange,
    onClick
  };
  props = _TMY4OIYCcjs.useCommand.call(void 0, {
    clickOnEnter: !nativeCheckbox,
    ...props
  });
  return _JBOLBTVUcjs.removeUndefinedValues.call(void 0, {
    name: nativeCheckbox ? name : void 0,
    value: nativeCheckbox ? valueProp : void 0,
    checked: isChecked,
    ...props
  });
});
var Checkbox = _JBOLBTVUcjs.forwardRef.call(void 0, function Checkbox2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useCheckbox(props));
});

// ../ariakit-components/dist/checkbox/checkbox-store.js
function createCheckboxStore(props = {}) {
  var _a;
  _FHPV2Q7Ccjs.throwOnConflictingProps.call(void 0, props, props.store);
  const syncState = (_a = props.store) == null ? void 0 : _a.getState();
  const checkbox = _FHPV2Q7Ccjs.createStore.call(void 0, { value: _JBOLBTVUcjs.defaultValue.call(void 0, props.value, syncState == null ? void 0 : syncState.value, props.defaultValue, false) }, props.store);
  return {
    ...checkbox,
    setValue: (value) => checkbox.setState("value", value)
  };
}

// ../ariakit-react-components/dist/checkbox/checkbox-store.js
function useCheckboxStoreProps(store, update, props) {
  _JBOLBTVUcjs.useUpdateEffect.call(void 0, update, [props.store]);
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "value", "setValue");
  return store;
}
function useCheckboxStore(props = {}) {
  const [store, update] = _FHPV2Q7Ccjs.useStore.call(void 0, createCheckboxStore, props);
  return useCheckboxStoreProps(store, update, props);
}







exports.useCheckboxContext = useCheckboxContext; exports.CheckboxContextProvider = CheckboxContextProvider; exports.useCheckbox = useCheckbox; exports.Checkbox = Checkbox; exports.useCheckboxStore = useCheckboxStore;
