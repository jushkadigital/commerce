"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _M6YHODMVcjs = require('./M6YHODMV.cjs');



var _IEVLYJJPcjs = require('./IEVLYJJP.cjs');


var _2WBRQ3I7cjs = require('./2WBRQ3I7.cjs');



var _MWZS5XD4cjs = require('./MWZS5XD4.cjs');


var _VUISVT3Vcjs = require('./VUISVT3V.cjs');





var _42GL4LKIcjs = require('./42GL4LKI.cjs');


var _P7AY4KL3cjs = require('./P7AY4KL3.cjs');









var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');


var _BTARPES4cjs = require('./BTARPES4.cjs');























var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/form/form-context.js
var ctx = _JBOLBTVUcjs.createStoreContext.call(void 0, [_42GL4LKIcjs.CollectionContextProvider], [_42GL4LKIcjs.CollectionScopedContextProvider]);
var useFormContext = ctx.useContext;
var useFormScopedContext = ctx.useScopedContext;
var useFormProviderContext = ctx.useProviderContext;
var FormContextProvider = ctx.ContextProvider;
var FormScopedContextProvider = ctx.ScopedContextProvider;

// ../ariakit-react-components/dist/form/form.js
var _react = require('react');
var _jsxruntime = require('react/jsx-runtime');
var TagName = "form";
function isField(element, items) {
  return items.some((item) => item.type === "field" && item.element === element);
}
function getFirstInvalidField(items) {
  return items.find((item) => {
    var _a;
    return item.type === "field" && ((_a = item.element) == null ? void 0 : _a.getAttribute("aria-invalid")) === "true";
  });
}
var useForm = _JBOLBTVUcjs.createHook.call(void 0, function useForm2({ store, validateOnChange = true, validateOnBlur = true, resetOnUnmount = false, resetOnSubmit = true, autoFocusOnSubmit = true, ...props }) {
  const context = useFormContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "Form must receive a `store` prop or be wrapped in a FormProvider component.");
  const ref = _react.useRef.call(void 0, null);
  const values = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "values");
  const submitSucceed = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "submitSucceed");
  const submitFailed = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "submitFailed");
  const items = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "items");
  const defaultValues = _JBOLBTVUcjs.useInitialValue.call(void 0, values);
  _react.useEffect.call(void 0, () => resetOnUnmount ? store == null ? void 0 : store.reset : void 0, [resetOnUnmount, store]);
  _JBOLBTVUcjs.useUpdateEffect.call(void 0, () => {
    if (!validateOnChange) return;
    if (values === defaultValues) return;
    store == null ? void 0 : store.validate();
  }, [
    validateOnChange,
    values,
    defaultValues,
    store
  ]);
  _react.useEffect.call(void 0, () => {
    if (!resetOnSubmit) return;
    if (!submitSucceed) return;
    store == null ? void 0 : store.reset();
  }, [
    resetOnSubmit,
    submitSucceed,
    store
  ]);
  const [shouldFocusOnSubmit, setShouldFocusOnSubmit] = _react.useState.call(void 0, false);
  _react.useEffect.call(void 0, () => {
    var _a;
    if (!shouldFocusOnSubmit) return;
    if (!submitFailed) return;
    const element = (_a = getFirstInvalidField(items)) == null ? void 0 : _a.element;
    if (!element) return;
    setShouldFocusOnSubmit(false);
    element.focus();
    if (_JBOLBTVUcjs.isTextField.call(void 0, element)) element.select();
  }, [
    autoFocusOnSubmit,
    submitFailed,
    items
  ]);
  const onSubmitProp = props.onSubmit;
  const onSubmit = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onSubmitProp == null ? void 0 : onSubmitProp(event);
    if (event.defaultPrevented) return;
    event.preventDefault();
    store == null ? void 0 : store.submit();
    if (!autoFocusOnSubmit) return;
    setShouldFocusOnSubmit(true);
  });
  const onBlurProp = props.onBlur;
  const onBlur = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onBlurProp == null ? void 0 : onBlurProp(event);
    if (event.defaultPrevented) return;
    if (!validateOnBlur) return;
    if (!store) return;
    if (!isField(event.target, store.getState().items)) return;
    store.validate();
  });
  const onResetProp = props.onReset;
  const onReset = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onResetProp == null ? void 0 : onResetProp(event);
    if (event.defaultPrevented) return;
    event.preventDefault();
    store == null ? void 0 : store.reset();
  });
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, FormScopedContextProvider, {
    value: store,
    children: element
  }), [store]);
  props = {
    role: _JBOLBTVUcjs.useTagName.call(void 0, ref, TagName) !== "form" ? "form" : void 0,
    noValidate: true,
    ...props,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref),
    onSubmit,
    onBlur,
    onReset
  };
  return props;
});
var Form = _JBOLBTVUcjs.forwardRef.call(void 0, function Form2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName, useForm(props));
});

// ../ariakit-react-components/dist/form/form-control.js

var TagName2 = "input";
function getNamedElement(ref, name) {
  const element = ref.current;
  if (!element) return null;
  if (element.name === name) return element;
  if (element.form) return element.form.elements.namedItem(name);
  return _JBOLBTVUcjs.getDocument.call(void 0, element).getElementsByName(name)[0];
}
function useItem(store, name, type) {
  return _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.items.find((item) => item.type === type && item.name === name));
}
var useFormControl = _JBOLBTVUcjs.createHook.call(void 0, function useFormControl2({ store, name: nameProp, getItem: getItemProp, touchOnBlur = true, ...props }) {
  const context = useFormContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "FormControl must be wrapped in a Form component.");
  const name = String(nameProp);
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const ref = _react.useRef.call(void 0, null);
  store.useValidate(async () => {
    const element = getNamedElement(ref, name);
    if (!element) return;
    await Promise.resolve();
    if ("validity" in element && !element.validity.valid) store == null ? void 0 : store.setError(name, element.validationMessage);
  });
  const getItem = _react.useCallback.call(void 0, (item) => {
    const nextItem = {
      ...item,
      id: id || item.id,
      name,
      type: "field"
    };
    if (getItemProp) return getItemProp(nextItem);
    return nextItem;
  }, [
    id,
    name,
    getItemProp
  ]);
  const onBlurProp = props.onBlur;
  const touchOnBlurProp = _JBOLBTVUcjs.useBooleanEvent.call(void 0, touchOnBlur);
  const onBlur = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onBlurProp == null ? void 0 : onBlurProp(event);
    if (event.defaultPrevented) return;
    if (!touchOnBlurProp(event)) return;
    store == null ? void 0 : store.setFieldTouched(name, true);
  });
  const label = useItem(store, name, "label");
  const error = useItem(store, name, "error");
  const description = useItem(store, name, "description");
  const describedBy = _JBOLBTVUcjs.cx.call(void 0, error == null ? void 0 : error.id, description == null ? void 0 : description.id, props["aria-describedby"]);
  const invalid = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, () => !!(store == null ? void 0 : store.getError(name)) && store.getFieldTouched(name));
  props = {
    "aria-labelledby": props["aria-label"] != null ? void 0 : label == null ? void 0 : label.id,
    "aria-invalid": invalid,
    ...props,
    id,
    "aria-describedby": describedBy || void 0,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref),
    onBlur
  };
  props = _VUISVT3Vcjs.useCollectionItem.call(void 0, {
    store,
    ...props,
    name,
    getItem
  });
  return props;
});
var FormControl = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function FormControl2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName2, useFormControl(props));
}));

// ../ariakit-react-components/dist/form/form-checkbox.js
var TagName3 = "input";
var useFormCheckbox = _JBOLBTVUcjs.createHook.call(void 0, function useFormCheckbox2({ store, name: nameProp, value, checked, defaultChecked, ...props }) {
  const context = useFormContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "FormCheckbox must be wrapped in a Form component.");
  const name = String(nameProp);
  props = _IEVLYJJPcjs.useCheckbox.call(void 0, {
    store: _IEVLYJJPcjs.useCheckboxStore.call(void 0, {
      value: store.useValue(name),
      setValue: (value2) => store == null ? void 0 : store.setValue(name, value2)
    }),
    value,
    checked,
    ...props
  });
  props = useFormControl({
    store,
    name,
    "aria-labelledby": void 0,
    ...props
  });
  return props;
});
var FormCheckbox = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function FormCheckbox2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName3, useFormCheckbox(props));
}));

// ../ariakit-react-components/dist/form/form-description.js

var TagName4 = "div";
var useFormDescription = _JBOLBTVUcjs.createHook.call(void 0, function useFormDescription2({ store, name: nameProp, getItem: getItemProp, ...props }) {
  const context = useFormContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "FormDescription must be wrapped in a Form component.");
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const ref = _react.useRef.call(void 0, null);
  const name = String(nameProp);
  const getItem = _react.useCallback.call(void 0, (item) => {
    const nextItem = {
      ...item,
      id: id || item.id,
      name,
      type: "description"
    };
    if (getItemProp) return getItemProp(nextItem);
    return nextItem;
  }, [
    id,
    name,
    getItemProp
  ]);
  props = {
    ...props,
    id,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref)
  };
  props = _VUISVT3Vcjs.useCollectionItem.call(void 0, {
    store,
    ...props,
    getItem
  });
  return props;
});
var FormDescription = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function FormDescription2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName4, useFormDescription(props));
}));

// ../ariakit-react-components/dist/form/form-error.js

var TagName5 = "div";
var useFormError = _JBOLBTVUcjs.createHook.call(void 0, function useFormError2({ store, name: nameProp, getItem: getItemProp, ...props }) {
  const context = useFormContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "FormError must be wrapped in a Form component.");
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const ref = _react.useRef.call(void 0, null);
  const name = String(nameProp);
  const getItem = _react.useCallback.call(void 0, (item) => {
    const nextItem = {
      ...item,
      id: id || item.id,
      name,
      type: "error"
    };
    if (getItemProp) return getItemProp(nextItem);
    return nextItem;
  }, [
    id,
    name,
    getItemProp
  ]);
  props = {
    role: "alert",
    children: _FHPV2Q7Ccjs.useStoreState.call(void 0, store, () => {
      const error = store == null ? void 0 : store.getError(name);
      if (error == null) return;
      if (!(store == null ? void 0 : store.getFieldTouched(name))) return;
      return error;
    }),
    ...props,
    id,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref)
  };
  props = _VUISVT3Vcjs.useCollectionItem.call(void 0, {
    store,
    ...props,
    getItem
  });
  return props;
});
var FormError = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function FormError2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName5, useFormError(props));
}));

// ../ariakit-react-components/dist/form/form-field.js
var TagName6 = "input";
var useFormField = _JBOLBTVUcjs.createHook.call(void 0, function useFormField2(props) {
  return useFormControl(props);
});
var FormField = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function FormField2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName6, useFormField(props));
}));

// ../ariakit-react-components/dist/form/form-group.js
var TagName7 = "div";
var useFormGroup = _JBOLBTVUcjs.createHook.call(void 0, function useFormGroup2({ store, ...props }) {
  props = _MWZS5XD4cjs.useGroup.call(void 0, props);
  return props;
});
var FormGroup = _JBOLBTVUcjs.forwardRef.call(void 0, function FormGroup2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName7, useFormGroup(props));
});

// ../ariakit-react-components/dist/form/form-group-label.js
var TagName8 = "div";
var useFormGroupLabel = _JBOLBTVUcjs.createHook.call(void 0, function useFormGroupLabel2({ store, ...props }) {
  props = _MWZS5XD4cjs.useGroupLabel.call(void 0, props);
  return props;
});
var FormGroupLabel = _JBOLBTVUcjs.forwardRef.call(void 0, function FormGroupLabel2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName8, useFormGroupLabel(props));
});

// ../ariakit-react-components/dist/form/form-input.js
var TagName9 = "input";
var useFormInput = _JBOLBTVUcjs.createHook.call(void 0, function useFormInput2({ store, name: nameProp, ...props }) {
  const context = useFormContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "FormInput must be wrapped in a Form component.");
  const name = String(nameProp);
  const onChangeProp = props.onChange;
  const onChange = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onChangeProp == null ? void 0 : onChangeProp(event);
    if (event.defaultPrevented) return;
    store == null ? void 0 : store.setValue(name, event.target.value);
  });
  props = {
    value: store.useValue(name),
    ...props,
    onChange
  };
  props = _BTARPES4cjs.useFocusable.call(void 0, props);
  props = useFormControl({
    store,
    name,
    ...props
  });
  return props;
});
var FormInput = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function FormInput2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName9, useFormInput(props));
}));

// ../ariakit-react-components/dist/form/form-label.js


var TagName10 = "label";
function supportsNativeLabel(tagName) {
  return tagName === "input" || tagName === "textarea" || tagName === "select" || tagName === "meter" || tagName === "progress";
}
var useFormLabel = _JBOLBTVUcjs.createHook.call(void 0, function useFormLabel2({ store, name: nameProp, getItem: getItemProp, ...props }) {
  const context = useFormContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "FormLabel must be wrapped in a Form component.");
  const id = _JBOLBTVUcjs.useId.call(void 0, props.id);
  const ref = _react.useRef.call(void 0, null);
  const name = String(nameProp);
  const getItem = _react.useCallback.call(void 0, (item) => {
    const nextItem = {
      ...item,
      id: id || item.id,
      name,
      type: "label"
    };
    if (getItemProp) return getItemProp(nextItem);
    return nextItem;
  }, [
    id,
    name,
    getItemProp
  ]);
  const field = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, (state) => state.items.find((item) => item.type === "field" && item.name === name));
  const isNativeLabel = supportsNativeLabel(_JBOLBTVUcjs.useTagName.call(void 0, field == null ? void 0 : field.element, "input"));
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    if (isNativeLabel) return;
    const fieldElement = field == null ? void 0 : field.element;
    if (!fieldElement) return;
    queueMicrotask(() => {
      const focusableElement = _JBOLBTVUcjs.getFirstTabbableIn.call(void 0, fieldElement, true, true);
      focusableElement == null ? void 0 : focusableElement.focus();
      if ((focusableElement == null ? void 0 : focusableElement.getAttribute("role")) === "combobox") return;
      focusableElement == null ? void 0 : focusableElement.click();
    });
  });
  props = {
    render: isNativeLabel ? /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "label", {}) : /* @__PURE__ */ _jsxruntime.jsx.call(void 0, "span", {}),
    htmlFor: isNativeLabel ? field == null ? void 0 : field.id : void 0,
    ...props,
    id,
    ref: _JBOLBTVUcjs.useMergeRefs.call(void 0, ref, props.ref),
    onClick
  };
  if (!isNativeLabel) props = {
    ...props,
    style: {
      cursor: "default",
      ...props.style
    }
  };
  props = _VUISVT3Vcjs.useCollectionItem.call(void 0, {
    store,
    ...props,
    getItem
  });
  return props;
});
var FormLabel = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function FormLabel2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName10, useFormLabel(props));
}));

// ../ariakit-react-components/dist/form/form-store.js


// ../ariakit-components/dist/form/form-store.js
function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
function hasMessages(object) {
  return Object.keys(object).some((key) => {
    if (_JBOLBTVUcjs.isObject.call(void 0, object[key])) return hasMessages(object[key]);
    return !!object[key];
  });
}
function get(values, path, defaultValue2) {
  var _a;
  const [key, ...rest] = Array.isArray(path) ? path : String(path).split(".");
  if (key == null || !values) return defaultValue2;
  if (!rest.length) return (_a = values[key]) != null ? _a : defaultValue2;
  return get(values[key], rest, defaultValue2);
}
function getOrCreateNested(nestedValues, nextKey) {
  if (Array.isArray(nestedValues) || _JBOLBTVUcjs.isObject.call(void 0, nestedValues)) return nestedValues;
  return _JBOLBTVUcjs.isInteger.call(void 0, nextKey) ? [] : {};
}
function set(values, path, value) {
  const [k, ...rest] = Array.isArray(path) ? path : String(path).split(".");
  if (k == null) return values;
  const key = k;
  const isIntegerKey = _JBOLBTVUcjs.isInteger.call(void 0, key);
  const nestedValues = (isIntegerKey ? values || [] : values || {})[key];
  const nextKey = rest[0];
  const result = rest.length && nextKey != null ? set(getOrCreateNested(nestedValues, nextKey), rest, value) : value;
  if (isIntegerKey) {
    const index = Number(key);
    if (values && Array.isArray(values)) {
      const copy = [...values];
      copy[index] = result;
      return copy;
    }
    const nextValues = [];
    nextValues[index] = result;
    return nextValues;
  }
  return Object.assign({}, values, { [key]: result });
}
function setAll(values, value) {
  const result = {};
  const keys = Object.keys(values);
  for (const key of keys) {
    const currentValue = values[key];
    if (Array.isArray(currentValue)) result[key] = currentValue.map((v) => {
      if (_JBOLBTVUcjs.isObject.call(void 0, v)) return setAll(v, value);
      return value;
    });
    else if (_JBOLBTVUcjs.isObject.call(void 0, currentValue)) result[key] = setAll(currentValue, value);
    else result[key] = value;
  }
  return result;
}
function getNameHandler(cache, prevKeys = []) {
  return { get(target, key) {
    if ([
      "toString",
      "valueOf",
      Symbol.toPrimitive
    ].includes(key)) return () => prevKeys.join(".");
    const nextKeys = [...prevKeys, key];
    const nextKey = nextKeys.join(".");
    if (cache[nextKey]) return cache[nextKey];
    const nextProxy = new Proxy(target, getNameHandler(cache, nextKeys));
    cache[nextKey] = nextProxy;
    return nextProxy;
  } };
}
function getStoreCallbacks(store) {
  return store == null ? void 0 : store.__unstableCallbacks;
}
function createNames() {
  return new Proxy(/* @__PURE__ */ Object.create(null), getNameHandler(/* @__PURE__ */ Object.create(null)));
}
function createFormStore(props = {}) {
  var _a;
  _FHPV2Q7Ccjs.throwOnConflictingProps.call(void 0, props, props.store);
  const syncState = (_a = props.store) == null ? void 0 : _a.getState();
  const collection = _42GL4LKIcjs.createCollectionStore.call(void 0, props);
  const values = _JBOLBTVUcjs.defaultValue.call(void 0, props.values, syncState == null ? void 0 : syncState.values, props.defaultValues, {});
  const errors = _JBOLBTVUcjs.defaultValue.call(void 0, props.errors, syncState == null ? void 0 : syncState.errors, props.defaultErrors, {});
  const touched = _JBOLBTVUcjs.defaultValue.call(void 0, props.touched, syncState == null ? void 0 : syncState.touched, props.defaultTouched, {});
  const form = _FHPV2Q7Ccjs.createStore.call(void 0, {
    ...collection.getState(),
    values,
    errors,
    touched,
    validating: _JBOLBTVUcjs.defaultValue.call(void 0, syncState == null ? void 0 : syncState.validating, false),
    submitting: _JBOLBTVUcjs.defaultValue.call(void 0, syncState == null ? void 0 : syncState.submitting, false),
    submitSucceed: _JBOLBTVUcjs.defaultValue.call(void 0, syncState == null ? void 0 : syncState.submitSucceed, 0),
    submitFailed: _JBOLBTVUcjs.defaultValue.call(void 0, syncState == null ? void 0 : syncState.submitFailed, 0),
    valid: !hasMessages(errors)
  }, collection, props.store);
  const syncCallbacks = getStoreCallbacks(props.store);
  const syncCallbacksState = syncCallbacks == null ? void 0 : syncCallbacks.getState();
  const callbacks = _FHPV2Q7Ccjs.createStore.call(void 0, {
    validate: (syncCallbacksState == null ? void 0 : syncCallbacksState.validate) || [],
    submit: (syncCallbacksState == null ? void 0 : syncCallbacksState.submit) || []
  }, syncCallbacks);
  _FHPV2Q7Ccjs.setup.call(void 0, form, () => _FHPV2Q7Ccjs.init.call(void 0, callbacks));
  _FHPV2Q7Ccjs.setup.call(void 0, form, () => _FHPV2Q7Ccjs.sync.call(void 0, form, ["validating", "errors"], (state) => {
    if (state.validating) return;
    form.setState("valid", !hasMessages(state.errors));
  }));
  const validate = async () => {
    form.setState("validating", true);
    form.setState("errors", {});
    const validateCallbacks = callbacks.getState().validate;
    try {
      for (const callback of validateCallbacks) await callback(form.getState());
      await nextFrame();
      return !hasMessages(form.getState().errors);
    } finally {
      form.setState("validating", false);
    }
  };
  return {
    ...collection,
    ...form,
    names: createNames(),
    setValues: (values2) => form.setState("values", values2),
    getValue: (name) => get(form.getState().values, name),
    setValue: (name, value) => form.setState("values", (values2) => {
      const prevValue = get(values2, name);
      const nextValue = _JBOLBTVUcjs.applyState.call(void 0, value, prevValue);
      if (nextValue === prevValue) return values2;
      return set(values2, name, nextValue);
    }),
    pushValue: (name, value) => form.setState("values", (values2) => {
      return set(values2, name, [...get(values2, name, []), value]);
    }),
    removeValue: (name, index) => form.setState("values", (values2) => {
      const array = get(values2, name, []);
      return set(values2, name, [
        ...array.slice(0, index),
        null,
        ...array.slice(index + 1)
      ]);
    }),
    setErrors: (errors2) => form.setState("errors", errors2),
    getError: (name) => get(form.getState().errors, name),
    setError: (name, error) => form.setState("errors", (errors2) => {
      const prevError = get(errors2, name);
      const nextError = _JBOLBTVUcjs.applyState.call(void 0, error, prevError);
      if (nextError === prevError) return errors2;
      return set(errors2, name, nextError);
    }),
    setTouched: (touched2) => form.setState("touched", touched2),
    getFieldTouched: (name) => !!get(form.getState().touched, name),
    setFieldTouched: (name, value) => form.setState("touched", (touched2) => {
      const prevValue = get(touched2, name);
      const nextValue = _JBOLBTVUcjs.applyState.call(void 0, value, prevValue);
      if (nextValue === prevValue) return touched2;
      return set(touched2, name, nextValue);
    }),
    onValidate: (callback) => {
      callbacks.setState("validate", (callbacks2) => [...callbacks2, callback]);
      return () => {
        callbacks.setState("validate", (callbacks2) => callbacks2.filter((c) => c !== callback));
      };
    },
    validate,
    onSubmit: (callback) => {
      callbacks.setState("submit", (callbacks2) => [...callbacks2, callback]);
      return () => {
        callbacks.setState("submit", (callbacks2) => callbacks2.filter((c) => c !== callback));
      };
    },
    submit: async () => {
      form.setState("submitting", true);
      form.setState("touched", setAll(form.getState().values, true));
      try {
        if (await validate()) {
          const submitCallbacks = callbacks.getState().submit;
          for (const callback of submitCallbacks) await callback(form.getState());
          await nextFrame();
          if (!hasMessages(form.getState().errors)) {
            form.setState("submitSucceed", (count) => count + 1);
            return true;
          }
        }
        form.setState("submitFailed", (count) => count + 1);
        return false;
      } catch (error) {
        form.setState("submitFailed", (count) => count + 1);
        throw error;
      } finally {
        form.setState("submitting", false);
      }
    },
    reset: () => {
      form.setState("values", values);
      form.setState("errors", errors);
      form.setState("touched", touched);
      form.setState("validating", false);
      form.setState("submitting", false);
      form.setState("submitSucceed", 0);
      form.setState("submitFailed", 0);
      form.setState("valid", !hasMessages(errors));
    },
    __unstableCallbacks: callbacks
  };
}

// ../ariakit-react-components/dist/form/form-store.js
function useFormStoreProps(store, update, props) {
  store = _42GL4LKIcjs.useCollectionStoreProps.call(void 0, store, update, props);
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "values", "setValues");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "errors", "setErrors");
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "touched", "setTouched");
  const useValue = _react.useCallback.call(void 0, (name) => _FHPV2Q7Ccjs.useStoreState.call(void 0, store, () => store.getValue(name)), [store]);
  const useValidate = _react.useCallback.call(void 0, (callback) => {
    callback = _JBOLBTVUcjs.useEvent.call(void 0, callback);
    _react.useEffect.call(void 0, () => store.onValidate(callback), [_FHPV2Q7Ccjs.useStoreState.call(void 0, store, "items"), callback]);
  }, [store]);
  const useSubmit = _react.useCallback.call(void 0, (callback) => {
    callback = _JBOLBTVUcjs.useEvent.call(void 0, callback);
    _react.useEffect.call(void 0, () => store.onSubmit(callback), [_FHPV2Q7Ccjs.useStoreState.call(void 0, store, "items"), callback]);
  }, [store]);
  return _react.useMemo.call(void 0, () => ({
    ...store,
    useValue,
    useValidate,
    useSubmit
  }), [
    store,
    useValue,
    useValidate,
    useSubmit
  ]);
}
function useFormStore(props = {}) {
  const [store, update] = _FHPV2Q7Ccjs.useStore.call(void 0, createFormStore, props);
  return useFormStoreProps(store, update, props);
}

// ../ariakit-react-components/dist/form/form-provider.js

function FormProvider(props = {}) {
  return /* @__PURE__ */ _jsxruntime.jsx.call(void 0, FormContextProvider, {
    value: useFormStore(props),
    children: props.children
  });
}

// ../ariakit-react-components/dist/form/form-push.js

var TagName11 = "button";
function getFirstFieldsByName(items, name) {
  if (!items) return [];
  const fields = [];
  for (const item of items) {
    if (item.type !== "field") continue;
    if (!item.name.startsWith(name)) continue;
    const nameWithIndex = item.name.replace(/(\.\d+)\..+$/, "$1");
    const regex = new RegExp(`^${nameWithIndex}`);
    if (!fields.some((i) => regex.test(i.name))) fields.push(item);
  }
  return fields;
}
var useFormPush = _JBOLBTVUcjs.createHook.call(void 0, function useFormPush2({ store, value, name: nameProp, getItem: getItemProp, autoFocusOnClick = true, ...props }) {
  const context = useFormContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "FormPush must be wrapped in a Form component.");
  const name = String(nameProp);
  const [shouldFocus, setShouldFocus] = _react.useState.call(void 0, false);
  _react.useEffect.call(void 0, () => {
    var _a;
    if (!shouldFocus) return;
    const items = getFirstFieldsByName(store == null ? void 0 : store.getState().items, name);
    const element = (_a = items == null ? void 0 : items[items.length - 1]) == null ? void 0 : _a.element;
    if (!element) return;
    element.focus();
    setShouldFocus(false);
  }, [
    store,
    shouldFocus,
    name
  ]);
  const getItem = _react.useCallback.call(void 0, (item) => {
    const nextItem = {
      ...item,
      type: "button",
      name
    };
    if (getItemProp) return getItemProp(nextItem);
    return nextItem;
  }, [name, getItemProp]);
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    store == null ? void 0 : store.pushValue(name, value);
    if (!autoFocusOnClick) return;
    setShouldFocus(true);
  });
  props = {
    ...props,
    onClick
  };
  props = _P7AY4KL3cjs.useButton.call(void 0, props);
  props = _VUISVT3Vcjs.useCollectionItem.call(void 0, {
    store,
    ...props,
    getItem
  });
  return props;
});
var FormPush = _JBOLBTVUcjs.forwardRef.call(void 0, function FormPush2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName11, useFormPush(props));
});

// ../ariakit-react-components/dist/form/form-radio.js
var TagName12 = "input";
var useFormRadio = _JBOLBTVUcjs.createHook.call(void 0, function useFormRadio2({ store, name: nameProp, value, ...props }) {
  const context = useFormContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "FormRadio must be wrapped in a Form component.");
  const name = String(nameProp);
  const onChangeProp = props.onChange;
  const onChange = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    onChangeProp == null ? void 0 : onChangeProp(event);
    if (event.defaultPrevented) return;
    store == null ? void 0 : store.setValue(name, value);
  });
  const checkedProp = props.checked;
  const checked = _FHPV2Q7Ccjs.useStoreState.call(void 0, store, () => checkedProp != null ? checkedProp : (store == null ? void 0 : store.getValue(name)) === value);
  props = {
    ...props,
    checked,
    onChange
  };
  props = _M6YHODMVcjs.useRadio.call(void 0, {
    name,
    value,
    ...props
  });
  props = useFormControl({
    store,
    name,
    "aria-labelledby": void 0,
    ...props
  });
  return props;
});
var FormRadio = _JBOLBTVUcjs.memo.call(void 0, _JBOLBTVUcjs.forwardRef.call(void 0, function FormRadio2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName12, useFormRadio(props));
}));

// ../ariakit-react-components/dist/form/form-radio-group.js

var TagName13 = "div";
var useFormRadioGroup = _JBOLBTVUcjs.createHook.call(void 0, function useFormRadioGroup2({ store, ...props }) {
  props = _JBOLBTVUcjs.useWrapElement.call(void 0, props, (element) => /* @__PURE__ */ _jsxruntime.jsx.call(void 0, _2WBRQ3I7cjs.CompositeScopedContextProvider, {
    value: void 0,
    children: element
  }), []);
  props = {
    role: "radiogroup",
    ...props
  };
  props = useFormGroup(props);
  return props;
});
var FormRadioGroup = _JBOLBTVUcjs.forwardRef.call(void 0, function FormRadioGroup2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName13, useFormRadioGroup(props));
});

// ../ariakit-react-components/dist/form/form-remove.js
var TagName14 = "button";
function findNextOrPreviousField(items, name, index) {
  const fields = items == null ? void 0 : items.filter((item) => item.type === "field" && item.name.startsWith(name));
  const regex = new RegExp(`^${name}\\.(\\d+)`);
  const nextField = fields == null ? void 0 : fields.find((field) => {
    const fieldIndex = field.name.replace(regex, "$1");
    return Number.parseInt(fieldIndex, 10) > index;
  });
  if (nextField) return nextField;
  return fields == null ? void 0 : fields.reverse().find((field) => {
    const fieldIndex = field.name.replace(regex, "$1");
    return Number.parseInt(fieldIndex, 10) < index;
  });
}
function findPushButton(items, name) {
  return items == null ? void 0 : items.find((item) => item.type === "button" && item.name === name);
}
var useFormRemove = _JBOLBTVUcjs.createHook.call(void 0, function useFormRemove2({ store, name: nameProp, index, autoFocusOnClick = true, ...props }) {
  const context = useFormContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "FormRemove must be wrapped in a Form component.");
  const name = String(nameProp);
  const onClickProp = props.onClick;
  const onClick = _JBOLBTVUcjs.useEvent.call(void 0, (event) => {
    var _a, _b, _c;
    onClickProp == null ? void 0 : onClickProp(event);
    if (event.defaultPrevented) return;
    if (!store) return;
    store.removeValue(name, index);
    if (!autoFocusOnClick) return;
    const { items } = store.getState();
    const element = (_a = findNextOrPreviousField(items, name, index)) == null ? void 0 : _a.element;
    if (element) {
      element.focus();
      if (_JBOLBTVUcjs.isTextField.call(void 0, element)) element.select();
    } else (_c = (_b = findPushButton(items, name)) == null ? void 0 : _b.element) == null ? void 0 : _c.focus();
  });
  props = {
    ...props,
    onClick
  };
  props = _P7AY4KL3cjs.useButton.call(void 0, props);
  return props;
});
var FormRemove = _JBOLBTVUcjs.forwardRef.call(void 0, function FormRemove2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName14, useFormRemove(props));
});

// ../ariakit-react-components/dist/form/form-reset.js
var TagName15 = "button";
var useFormReset = _JBOLBTVUcjs.createHook.call(void 0, function useFormReset2({ store, ...props }) {
  const context = useFormContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "FormReset must be wrapped in a Form component.");
  props = {
    type: "reset",
    disabled: _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "submitting"),
    ...props
  };
  props = _P7AY4KL3cjs.useButton.call(void 0, props);
  return props;
});
var FormReset = _JBOLBTVUcjs.forwardRef.call(void 0, function FormReset2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName15, useFormReset(props));
});

// ../ariakit-react-components/dist/form/form-submit.js
var TagName16 = "button";
var useFormSubmit = _JBOLBTVUcjs.createHook.call(void 0, function useFormSubmit2({ store, accessibleWhenDisabled = true, ...props }) {
  const context = useFormContext();
  store = store || context;
  _JBOLBTVUcjs.invariant.call(void 0, store, process.env.NODE_ENV !== "production" && "FormSubmit must be wrapped in a Form component.");
  props = {
    type: "submit",
    disabled: _FHPV2Q7Ccjs.useStoreState.call(void 0, store, "submitting"),
    ...props
  };
  props = _P7AY4KL3cjs.useButton.call(void 0, {
    ...props,
    accessibleWhenDisabled
  });
  return props;
});
var FormSubmit = _JBOLBTVUcjs.forwardRef.call(void 0, function FormSubmit2(props) {
  return _JBOLBTVUcjs.createElement.call(void 0, TagName16, useFormSubmit(props));
});





















exports.useFormContext = useFormContext; exports.Form = Form; exports.FormControl = FormControl; exports.FormCheckbox = FormCheckbox; exports.FormDescription = FormDescription; exports.FormError = FormError; exports.FormField = FormField; exports.FormGroup = FormGroup; exports.FormGroupLabel = FormGroupLabel; exports.FormInput = FormInput; exports.FormLabel = FormLabel; exports.useFormStore = useFormStore; exports.FormProvider = FormProvider; exports.FormPush = FormPush; exports.FormRadio = FormRadio; exports.FormRadioGroup = FormRadioGroup; exports.FormRemove = FormRemove; exports.FormReset = FormReset; exports.FormSubmit = FormSubmit;
