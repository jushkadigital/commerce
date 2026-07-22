// This file was merged into validate-tour-capacity.ts.
//
// Medusa only allows one handler per hook name. Both tour and package capacity
// validation now live in a single hook handler in validate-tour-capacity.ts,
// which also shares a single cart fetch (more efficient than two separate hooks
// each fetching the cart independently).
//
// Do NOT register completeCartWorkflow.hooks.validate here — it will cause
// "Cannot define multiple hook handlers for the validate hook" at startup.
