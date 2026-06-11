"use client";
import { useCollectionItem } from "../collection/collection-item.js";
import { useFormContext } from "./form-context.js";
import { createElement, createHook, forwardRef, memo, useEvent, useId, useMergeRefs, useTagName } from "@ariakit/react-utils";
import { getFirstTabbableIn, invariant } from "@ariakit/utils";
import { useCallback, useRef } from "react";
import { jsx } from "react/jsx-runtime";
import { useStoreState } from "@ariakit/react-store";
//#region src/form/form-label.tsx
const TagName = "label";
function supportsNativeLabel(tagName) {
	return tagName === "input" || tagName === "textarea" || tagName === "select" || tagName === "meter" || tagName === "progress";
}
/**
* Returns props to create a `FormLabel` component. If the field is not a native
* input, select or textarea element, the hook will return props to render a
* `span` element. Instead of relying on the `htmlFor` prop, it'll rely on the
* `aria-labelledby` attribute on the form field. Clicking on the label will
* move focus to the field even if it's not a native input.
* @see https://ariakit.com/components/form
* @example
* ```jsx
* const store = useFormStore({ defaultValues: { email: "" } });
* const props = useFormLabel({ store, name: store.names.email });
* <Form store={store}>
*   <Role {...props}>Email</Role>
*   <FormInput name={store.names.email} />
* </Form>
* ```
*/
const useFormLabel = createHook(function useFormLabel({ store, name: nameProp, getItem: getItemProp, ...props }) {
	const context = useFormContext();
	store = store || context;
	invariant(store, process.env.NODE_ENV !== "production" && "FormLabel must be wrapped in a Form component.");
	const id = useId(props.id);
	const ref = useRef(null);
	const name = String(nameProp);
	const getItem = useCallback((item) => {
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
	const field = useStoreState(store, (state) => state.items.find((item) => item.type === "field" && item.name === name));
	const isNativeLabel = supportsNativeLabel(useTagName(field?.element, "input"));
	const onClickProp = props.onClick;
	const onClick = useEvent((event) => {
		onClickProp?.(event);
		if (event.defaultPrevented) return;
		if (isNativeLabel) return;
		const fieldElement = field?.element;
		if (!fieldElement) return;
		queueMicrotask(() => {
			const focusableElement = getFirstTabbableIn(fieldElement, true, true);
			focusableElement?.focus();
			if (focusableElement?.getAttribute("role") === "combobox") return;
			focusableElement?.click();
		});
	});
	props = {
		render: isNativeLabel ? /* @__PURE__ */ jsx("label", {}) : /* @__PURE__ */ jsx("span", {}),
		htmlFor: isNativeLabel ? field?.id : void 0,
		...props,
		id,
		ref: useMergeRefs(ref, props.ref),
		onClick
	};
	if (!isNativeLabel) props = {
		...props,
		style: {
			cursor: "default",
			...props.style
		}
	};
	props = useCollectionItem({
		store,
		...props,
		getItem
	});
	return props;
});
/**
* Renders a label associated with a form field, even if the field is not a
* native input.
*
* If the field is a native input, select or textarea element, this component
* will render a native `label` element and rely on its `htmlFor` prop.
* Otherwise, it'll render a `span` element and rely on the `aria-labelledby`
* attribute on the form field instead. Clicking on the label will move focus to
* the field even if it's not a native input.
* @see https://ariakit.com/components/form
* @example
* ```jsx {8}
* const form = useFormStore({
*   defaultValues: {
*     email: "",
*   },
* });
*
* <Form store={form}>
*   <FormLabel name={form.names.email}>Email</Role>
*   <FormInput name={form.names.email} />
* </Form>
* ```
*/
const FormLabel = memo(forwardRef(function FormLabel(props) {
	return createElement(TagName, useFormLabel(props));
}));
//#endregion
export { FormLabel, useFormLabel };

//# sourceMappingURL=form-label.js.map