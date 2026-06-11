"use client";
//#region src/dialog/utils/orchestrate.ts
const cleanups = /* @__PURE__ */ new WeakMap();
function orchestrate(element, key, setup) {
	if (!cleanups.has(element)) cleanups.set(element, /* @__PURE__ */ new Map());
	const elementCleanups = cleanups.get(element);
	const prevCleanup = elementCleanups.get(key);
	if (!prevCleanup) {
		elementCleanups.set(key, setup());
		return () => {
			elementCleanups.get(key)?.();
			elementCleanups.delete(key);
		};
	}
	const cleanup = setup();
	const nextCleanup = () => {
		cleanup();
		prevCleanup();
		elementCleanups.delete(key);
	};
	elementCleanups.set(key, nextCleanup);
	return () => {
		if (!(elementCleanups.get(key) === nextCleanup)) return;
		cleanup();
		elementCleanups.set(key, prevCleanup);
	};
}
function setAttribute(element, attr, value) {
	const setup = () => {
		const previousValue = element.getAttribute(attr);
		element.setAttribute(attr, value);
		return () => {
			if (previousValue == null) element.removeAttribute(attr);
			else element.setAttribute(attr, previousValue);
		};
	};
	return orchestrate(element, attr, setup);
}
function setProperty(element, property, value) {
	const setup = () => {
		const exists = property in element;
		const previousValue = element[property];
		element[property] = value;
		return () => {
			if (!exists) delete element[property];
			else element[property] = previousValue;
		};
	};
	return orchestrate(element, property, setup);
}
function assignStyle(element, style) {
	if (!element) return () => {};
	const setup = () => {
		const prevStyle = element.style.cssText;
		Object.assign(element.style, style);
		return () => {
			element.style.cssText = prevStyle;
		};
	};
	return orchestrate(element, "style", setup);
}
function setCSSProperty(element, property, value) {
	if (!element) return () => {};
	const setup = () => {
		const previousValue = element.style.getPropertyValue(property);
		element.style.setProperty(property, value);
		return () => {
			if (previousValue) element.style.setProperty(property, previousValue);
			else element.style.removeProperty(property);
		};
	};
	return orchestrate(element, property, setup);
}
//#endregion
export { assignStyle, orchestrate, setAttribute, setCSSProperty, setProperty };

//# sourceMappingURL=orchestrate.js.map