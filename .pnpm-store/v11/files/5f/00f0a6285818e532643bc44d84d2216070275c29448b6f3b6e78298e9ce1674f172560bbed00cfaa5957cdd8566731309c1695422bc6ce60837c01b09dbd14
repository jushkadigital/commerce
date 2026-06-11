"use client";
import { CollectionContextProvider, CollectionScopedContextProvider } from "../collection/collection-context.js";
import { createStoreContext } from "@ariakit/react-utils";
//#region src/form/form-context.tsx
const ctx = createStoreContext([CollectionContextProvider], [CollectionScopedContextProvider]);
/**
* Returns the form store from the nearest form container.
* @example
* function FormInput() {
*   const store = useFormContext();
*
*   if (!store) {
*     throw new Error("FormInput must be wrapped in FormProvider");
*   }
*
*   // Use the store...
* }
*/
const useFormContext = ctx.useContext;
const useFormScopedContext = ctx.useScopedContext;
const useFormProviderContext = ctx.useProviderContext;
const FormContextProvider = ctx.ContextProvider;
const FormScopedContextProvider = ctx.ScopedContextProvider;
//#endregion
export { FormContextProvider, FormScopedContextProvider, useFormContext, useFormProviderContext, useFormScopedContext };

//# sourceMappingURL=form-context.js.map