"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderPolicies = void 0;
const utils_1 = require("@medusajs/framework/utils");
const default_policy_operations_1 = require("../utils/default-policy-operations");
const orderResources = [
    "order",
    "order_item",
    "order_change",
    "order_claim",
    "order_claim_item",
    "order_exchange",
    "return",
    "return_reason",
];
const policies = [];
for (const resource of orderResources) {
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
exports.orderPolicies = (0, utils_1.definePolicies)(policies);
//# sourceMappingURL=order.js.map