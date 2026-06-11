"use client";
import { useForceUpdate } from "@ariakit/react-utils";
import { getDocument } from "@ariakit/utils";
import { useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
//#region src/dialog/utils/use-root-dialog.ts
function useRootDialog({ attribute, contentId, contentElement, enabled }) {
	const [updated, retry] = useForceUpdate();
	const isRootDialog = useCallback(() => {
		if (!enabled) return false;
		if (!contentElement) return false;
		const { body } = getDocument(contentElement);
		const id = body.getAttribute(attribute);
		return !id || id === contentId;
	}, [
		updated,
		enabled,
		contentElement,
		attribute,
		contentId
	]);
	useEffect(() => {
		if (!enabled) return;
		if (!contentId) return;
		if (!contentElement) return;
		const { body } = getDocument(contentElement);
		if (isRootDialog()) {
			body.setAttribute(attribute, contentId);
			return () => body.removeAttribute(attribute);
		}
		const observer = new MutationObserver(() => flushSync(retry));
		observer.observe(body, { attributeFilter: [attribute] });
		return () => observer.disconnect();
	}, [
		updated,
		enabled,
		contentId,
		contentElement,
		isRootDialog,
		attribute
	]);
	return isRootDialog;
}
//#endregion
export { useRootDialog };

//# sourceMappingURL=use-root-dialog.js.map