"use client";
import { useFocusable } from "../focusable/focusable.js";
import { useFormContext } from "./form-context.js";
import { useFormControl } from "./form-control.js";
import { createElement, createHook, forwardRef, memo, useEvent } from "@ariakit/react-utils";
import { invariant } from "@ariakit/utils";
//#region src/form/form-input.tsx
const TagName = "input";
/**
* Returns props to create a `FormInput` component. Unlike `useFormControl`, this
* hook returns the `value` and `onChange` props that can be passed to a native
* input, select or textarea elements.
* @see https://ariakit.com/components/form
* @example
* ```jsx
* const store = useFormStore({ defaultValues: { email: "" } });
* const props = useFormInput({ store, name: store.names.email });
* <Form store={store}>
*   <FormLabel name={store.names.email}>Email</FormLabel>
*   <Role {...props} render={<input />} />
* </Form>
* ```
*/
const useFormInput = createHook(function useFormInput({ store, name: nameProp, ...props }) {
	const context = useFormContext();
	store = store || context;
	invariant(store, process.env.NODE_ENV !== "production" && "FormInput must be wrapped in a Form component.");
	const name = String(nameProp);
	const onChangeProp = props.onChange;
	const onChange = useEvent((event) => {
		onChangeProp?.(event);
		if (event.defaultPrevented) return;
		store?.setValue(name, event.target.value);
	});
	props = {
		value: store.useValue(name),
		...props,
		onChange
	};
	props = useFocusable(props);
	props = useFormControl({
		store,
		name,
		...props
	});
	return props;
});
/**
* Renders a form input. Unlike
* [`FormControl`](https://ariakit.com/reference/form-control), this component
* passes the `value` and `onChange` props down to the underlying element that
* can be native input, select or textarea elements.
* @see https://ariakit.com/components/form
* @example
* ```jsx {9}
* const form = useFormStore({
*   defaultValues: {
*     email: "",
*   },
* });
*
* <Form store={form}>
*   <FormLabel name={form.names.email}>Email</FormLabel>
*   <FormInput name={form.names.email} />
* </Form>
* ```
*/
const FormInput = memo(forwardRef(function FormInput(props) {
	return createElement(TagName, useFormInput(props));
}));
//#endregion
export { FormInput, useFormInput };

//# sourceMappingURL=form-input.js.map