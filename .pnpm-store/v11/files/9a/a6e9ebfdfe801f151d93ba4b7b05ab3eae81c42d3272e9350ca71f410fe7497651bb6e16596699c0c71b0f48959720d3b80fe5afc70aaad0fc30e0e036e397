"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productPolicies = void 0;
const utils_1 = require("@medusajs/framework/utils");
const default_policy_operations_1 = require("../utils/default-policy-operations");
const productResources = [
    "product",
    "product_variant",
    "product_option",
    "product_option_value",
    "product_tag",
    "product_type",
    "product_category",
    "product_collection",
];
const policies = [];
for (const resource of productResources) {
    for (const operation of default_policy_operations_1.defaultPolicyOperations) {
        const policyName = (0, utils_1.toPascalCase)(operation) + (0, utils_1.toPascalCase)(resource);
        policies.push({
            name: policyName,
            resource: resource,
            operation: operation,
            description: `${(0, utils_1.toPascalCase)(operation)} ${resource.replace(/_/g, " ")}`,
        });
    }
}
exports.productPolicies = (0, utils_1.definePolicies)(policies);
//# sourceMappingURL=product.js.map