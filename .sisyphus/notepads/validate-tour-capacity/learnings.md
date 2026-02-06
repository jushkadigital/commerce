# Learnings: Validate Tour Capacity Hook

## Implementation Pattern

Medusa workflow hooks allow injecting custom validation into core workflows.

## Key Points

1. Hook Registration: Use workflow.hooks.validate() to register validation handlers
2. Container Access: Resolve services via container.resolve()
3. Error Handling: Throw MedusaError to stop workflow execution
4. Query Pattern: Use query.graph() to fetch cart with items and metadata

## Metadata Structure for Tours

See src/api/store/cart/tour-items/route.ts for full structure.

## Type Safety

- Cast metadata to expected type with proper null checking
- Add explicit null checks for item iterations

## References

- Medusa Docs: Workflow hooks documentation
- Similar pattern used in: loyalty points, customer tiers validation
