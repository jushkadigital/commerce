"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJwtTokenForAuthIdentity = generateJwtTokenForAuthIdentity;
const utils_1 = require("@medusajs/framework/utils");
const rbac_1 = __importDefault(require("../../../feature-flags/rbac"));
async function generateJwtTokenForAuthIdentity({ authIdentity, actorType, authProvider, container, }, { secret, expiresIn, options, }) {
    const expiresIn_ = expiresIn ?? options?.expiresIn;
    const entityIdKey = `${actorType}_id`;
    const entityId = authIdentity?.app_metadata?.[entityIdKey];
    const providerIdentity = !authProvider
        ? undefined
        : authIdentity.provider_identities?.filter((identity) => identity.provider === authProvider)[0];
    let roles;
    if (utils_1.FeatureFlag.isFeatureEnabled(rbac_1.default.key)) {
        if (container && entityId) {
            try {
                const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
                const { data: userRoles } = await query.graph({
                    entity: actorType,
                    fields: ["rbac_roles.id"],
                    filters: {
                        id: entityId,
                    },
                });
                if (userRoles?.[0]?.rbac_roles) {
                    roles = userRoles[0].rbac_roles.map((role) => role.id);
                }
            }
            catch {
                // ignore
            }
        }
    }
    return (0, utils_1.generateJwtToken)({
        actor_id: entityId ?? "",
        actor_type: actorType,
        auth_identity_id: authIdentity?.id ?? "",
        ...(authProvider ? { auth_provider: authProvider } : {}),
        app_metadata: {
            ...(authIdentity.app_metadata ?? {}),
            [entityIdKey]: entityId,
            roles,
        },
        user_metadata: providerIdentity?.user_metadata ?? {},
    }, {
        secret,
        expiresIn: expiresIn_,
        jwtOptions: options,
    });
}
//# sourceMappingURL=generate-jwt-token.js.map