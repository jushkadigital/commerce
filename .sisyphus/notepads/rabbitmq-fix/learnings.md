# RabbitMQ module conditional guard - learnings

- File changed: `medusa-config.ts` — wrapped RabbitMQ module registration with conditional spread operator using existing `DISABLE_REDIS` flag.

- Change applied at original RabbitMQ section with exact pattern:

  ...(DISABLE_REDIS ? [] : [{
    resolve: "./src/modules/event-bus-rabbitmq",
    options: {
      url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@172.17.0.1:5672',
      exchange: "tourism-exchange",
    },
  }]),

- Reason: Prevent the custom RabbitMQ module from loading during builds/tests when DISABLE_REDIS is true, avoiding live amqplib connection attempts that cause "Connection is closed" errors in integration test cleanup.

- Verification performed:
  - Attempted lsp_diagnostics but TypeScript language server not installed in environment (typescript-language-server missing). Cannot verify LSP diagnostics here.
  - Attempted to run integration test (`bun run test:integration:http -- tour-purchase-flow`) but `bun` is not available in this environment. Cannot run tests here.

- Next steps for maintainer to fully verify locally or in CI:
  1. Ensure Node environment has tools: `bun` (or adapt to npm/yarn test script) and TypeScript language server if LSP checks are required.
 2. Run `bun run test:integration:http -- tour-purchase-flow` (or equivalent) with `NODE_ENV=test` to confirm no "Connection is closed" unhandled errors.
 3. Optionally run `npx typescript-language-server` or `npm run lsp:diagnostics` to check TypeScript diagnostics.

- Notes:
  - I preserved comments and formatting in `medusa-config.ts` as requested.
  - No other modules were modified.
