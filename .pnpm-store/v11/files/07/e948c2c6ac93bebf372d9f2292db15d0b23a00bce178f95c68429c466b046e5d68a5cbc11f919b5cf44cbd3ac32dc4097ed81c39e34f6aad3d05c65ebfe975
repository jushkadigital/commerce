"use client";
import { useCollectionItem } from "../collection/collection-item.js";
import { useFormContext } from "./form-context.js";
import { createElement, createHook, forwardRef, memo, useId, useMergeRefs } from "@ariakit/react-utils";
import { invariant } from "@ariakit/utils";
import { useCallback, useRef } from "react";
//#region src/form/form-description.tsx
const TagName = "div";
/**
* Returns props to create a `FormDescription` component.
* @see https://ariakit.com/components/form
* @example
* ```jsx
* const store = useFormStore({ defaultValues: { password: "" } });
* const props = useFormDescription({ store, name: store.names.password });
* <Form store={store}>
*   <FormLabel name={store.names.password}>Password</FormLabel>
*   <FormInput name={store.names.password} type="password" />
*   <Role {...props}>Password with at least 8 characters.</Role>
* </Form>
* ```
*/
const useFormDescription = createHook(function useFormDescription({ store, name: nameProp, getItem: getItemProp, ...props }) {
	const context = useFormContext();
	store = store || context;
	invariant(store, process.env.NODE_ENV !== "production" && "FormDescription must be wrapped in a Form component.");
	const id = useId(props.id);
	const ref = useRef(null);
	const name = String(nameProp);
	const getItem = useCallback((item) => {
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
* Renders a description element for a form field, which will automatically
* receive an `aria-describedby` attribute pointing to this element.
* @see https://ariakit.com/components/form
* @example
* ```jsx {10-12}
* const form = useFormStore({
*   defaultValues: {
*     password: "",
*   },
* });
*
* <Form store={form}>
*   <FormLabel name={form.names.password}>Password</FormLabel>
*   <FormInput name={form.names.password} type="password" />
*   <FormDescription name={form.names.password}>
*     Password with at least 8 characters.
*   </FormDescription>
* </Form>
* ```
*/
const FormDescription = memo(forwardRef(function FormDescription(props) {
	return createElement(TagName, useFormDescription(props));
}));
//#endregion
export { FormDescription, useFormDescription };

//# sourceMappingURL=form-description.js.map