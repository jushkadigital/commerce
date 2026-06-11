# Cart Multiline - Issues

## [2026-02-24T08:11:44.609Z] Session Start
Session ID: ses_371512eb6ffeKouc0QMAuLi6Or


## [2026-02-24T08:35:17.127Z] Plan Compliance Audit Findings
- `integration-tests/http/tour-purchase-flow.spec.ts`: calling `POST /store/carts` fails with 400 due to missing `x-publishable-api-key` (store routes require publishable API key in this env).
- `src/api/store/cart/tour-items/route.ts`: `metadata.pricing_breakdown[0].type` is derived from plural labels (`Adults` -> `ADULTS`), which does not match tests expecting `ADULT`/`CHILD`.
- Both integration tests treat `addRes.data` as the cart, but the endpoint responds `{ cart: updatedCart, summary: ... }` (should access `addRes.data.cart`).
- `integration-tests/http/tour-cart-metadata-flow.spec.ts`: does not call `tourModuleService.createTourVariants`, so `/store/cart/tour-items` will not find passenger-type variants.
