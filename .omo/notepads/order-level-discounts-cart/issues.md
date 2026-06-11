## 2026-03-15

- If integration tests ever execute email sending paths (e.g. `resend` is configured/enabled), the dynamic import will try to load `src/emails/travel-booking-notification.tsx` and Jest will still fail until TSX is supported in test transforms.

- Running `TEST_TYPE=integration:http ... npx jest integration-tests/http/cart-promotions.spec.ts ...` now fails with `jest-haste-map` naming collision (`package.json` vs `.medusa/server/package.json`) and then reports `No tests found` / `Pattern: integration-tests/http/cart-promotions.spec.ts - 0 matches`.

- `src/api/store/cart/refetch-cart.ts` currently throws `ValidationError: Entity 'Cart' does not have property '*region'` in integration tests because `defaultStoreCartFields` includes `*region.countries`; cart promotion persistence checks had to use a narrower direct query instead.

## 2026-03-16

- `npx medusa build` still fails outside this task because `src/api/auth/user/keycloak/token/route.ts` and `src/api/store/auth/keycloak/route.ts` call `jwt.decode`, but the current `jsonwebtoken` typing in this repo does not expose that member.
