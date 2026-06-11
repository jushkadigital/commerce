## Product Module Resolution Pattern (2026-02-16)

**Issue**: Cannot read properties of undefined when trying to resolve product module service
- Original code incorrectly used `require('@medusajs/framework/modules-sdk').modules.product`
- This doesn't work because modules-sdk doesn't directly expose services

**Solution**: Access module services via dependency injection container
```typescript
// Store moduleDeclaration in constructor
this.moduleDeclaration_ = moduleDeclaration

// Resolve service from container
const container = (this.moduleDeclaration_ as any)?.scope?.cradle
if (container?.productModuleService) {
  this.productModuleService_ = container.productModuleService
}
```

**Pattern**: In Medusa v2, all services are resolved from the DI container, not imported directly
- Container is accessible via `moduleDeclaration.scope.cradle`
- Service name: `productModuleService` (camelCase)
- Always add null/undefined checks when accessing container properties

**Result**: Product events can now be enriched with full product data before publishing to RabbitMQ
