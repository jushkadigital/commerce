
## Issues
- **Scope Creep in Middleware**: Unintended middleware matchers for `/store/custom-products` and `/admin/regions*` were present in `src/api/middlewares.ts`.
- **Action**: Completely reset `src/api/middlewares.ts` to HEAD baseline and re-applied ONLY the necessary changes for package bookings. This eliminated all scope creep and ensured the file is clean and correct.
