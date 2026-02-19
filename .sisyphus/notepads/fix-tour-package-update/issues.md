Root cause:

- The workflow step update-tour-step called tourModuleService.updateTours with a single object. The generated service API expects an array of updates (batch), so passing an object returned an array-typed result or behaved unexpectedly. Tests indicate updateTours should be called with an array.

What I changed:

- Updated src/workflows/steps/update-tour.ts to call updateTours with an array and destructure the first result:
  const [updatedTour] = await tourModuleService.updateTours([{ id: input.id, ...input.data }])
- Updated the compensation function to call updateTours with an array as well.
 - Updated the compensation function to call updateTours with an array as well.

Verification:

- Ran lsp_diagnostics on the modified file: no diagnostics.
- Types align with the service signature (updateTours expects an array and returns an array).

- Also updated src/workflows/steps/update-package.ts to mirror the same fix for packages:
  - Changed call to packageModuleService.updatePackages([{ id: input.id, ...input.data }])
  - Destructured result: const [updatedPackage] = ...
  - Updated compensation to call updatePackages with an array

Verification for package change:

- Ran lsp_diagnostics on the modified file: no diagnostics.
- Pattern matches update-tour.ts changes for consistency.

Notes:

- The change keeps behavior equivalent but ensures type correctness and runtime consistency with module service expectations.
