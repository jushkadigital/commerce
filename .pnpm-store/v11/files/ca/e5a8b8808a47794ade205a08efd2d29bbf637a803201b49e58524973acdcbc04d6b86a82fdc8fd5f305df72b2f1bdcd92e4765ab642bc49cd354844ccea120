"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taxPolicies = void 0;
const utils_1 = require("@medusajs/framework/utils");
const default_policy_operations_1 = require("../utils/default-policy-operations");
const taxResources = ["tax_provider", "tax_rate", "tax_region"];
const policies = [];
for (const resource of taxResources) {
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
exports.taxPolicies = (0, utils_1.definePolicies)(policies);
//# sourceMappingURL=tax.js.map