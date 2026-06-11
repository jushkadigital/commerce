"use client";
import { useCollectionItem } from "../collection/collection-item.js";
import { useFormContext } from "./form-context.js";
import { createElement, createHook, forwardRef, memo, useId, useMergeRefs } from "@ariakit/react-utils";
import { invariant } from "@ariakit/utils";
import { useCallback, useRef } from "react";
import { useStoreState } from "@ariakit/react-store";
//#region src/form/form-error.tsx
const TagName = "div";
/**
* Returns props to create a `FormDescription` component.
* @see https://ariakit.com/components/form
* @example
* ```jsx
* const store = useFormStore({ defaultValues: { email: "" } });
* const props = useFormError({ store, name: store.names.email });
*
* store.useValidate(() => {
*   if (!store.getValue(store.names.email)) {
*     store.setError(store.names.email, "Email is required!");
*   }
* });
*
* <Form store={store}>
*   <FormLabel name={store.names.email}>Email</FormLabel>
*   <FormInput name={store.names.email} />
*   <Role {...props} />
* </Form>
* ```
*/
const useFormError = createHook(function useFormError({ store, name: nameProp, getItem: getItemProp, ...props }) {
	const context = useFormContext();
	store = store || context;
	invariant(store, process.env.NODE_ENV !== "production" && "FormError must be wrapped in a Form component.");
	const id = useId(props.id);
	const ref = useRef(null);
	const name = String(nameProp);
	const getItem = useCallback((item) => {
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
		children: useStoreState(store, () => {
			const error = store?.getError(name);
			if (error == null) return;
			if (!store?.getFieldTouched(name)) return;
			return error;
		}),
		...props,
		id,
		ref: useMergeRefs(ref, props.ref)
	};
	props = useCollectionItem({
		store,
		...props,
		getItem
	});
	return props;
});
/**
* Renders an element that shows an error message. The `children` will
* automatically display the error message defined in the store.
* @see https://ariakit.com/components/form
* @example
* ```jsx {16}
* const form = useFormStore({
*   defaultValues: {
*     email: "",
*   },
* });
*
* form.useValidate(() => {
*   if (!form.values.email) {
*     form.setError(form.names.email, "Email is required!");
*   }
* });
*
* <Form store={form}>
*   <FormLabel name={form.names.email}>Email</FormLabel>
*   <FormInput name={form.names.email} />
*   <FormError name={form.names.email} />
* </Form>
* ```
*/
const FormError = memo(forwardRef(function FormError(props) {
	return createElement(TagName, useFormError(props));
}));
//#endregion
export { FormError, useFormError };

//# sourceMappingURL=form-error.js.map