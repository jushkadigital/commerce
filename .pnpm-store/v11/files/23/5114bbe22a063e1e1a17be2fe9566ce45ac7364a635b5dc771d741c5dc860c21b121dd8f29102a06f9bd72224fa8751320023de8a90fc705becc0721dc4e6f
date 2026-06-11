"use client";
import { isTouchDevice } from "@ariakit/utils";
import { useEffect, useState } from "react";
//#region src/tag/utils.ts
function useTouchDevice() {
	const [touchDevice, setTouchDevice] = useState(false);
	useEffect(() => {
		setTouchDevice(isTouchDevice());
	}, []);
	return touchDevice;
}
//#endregion
export { useTouchDevice };

//# sourceMappingURL=utils.js.map