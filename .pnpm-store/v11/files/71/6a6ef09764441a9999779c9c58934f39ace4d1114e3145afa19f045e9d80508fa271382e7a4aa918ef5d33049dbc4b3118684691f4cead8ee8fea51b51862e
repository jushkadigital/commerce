"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shippingPolicies = void 0;
const utils_1 = require("@medusajs/framework/utils");
const default_policy_operations_1 = require("../utils/default-policy-operations");
const shippingResources = [
    "shipping_option",
    "shipping_option_type",
    "shipping_profile",
    "fulfillment",
    "fulfillment_provider",
    "fulfillment_set",
];
const policies = [];
for (const resource of shippingResources) {
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
exports.shippingPolicies = (0, utils_1.definePolicies)(policies);
//# sourceMappingURL=shipping.js.map