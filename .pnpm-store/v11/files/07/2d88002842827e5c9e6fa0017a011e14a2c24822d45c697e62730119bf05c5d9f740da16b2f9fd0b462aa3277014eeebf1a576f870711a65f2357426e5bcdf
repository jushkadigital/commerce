import { AuthIdentityDTO, MedusaContainer, ProjectConfigOptions } from "@medusajs/framework/types";
import { type Secret } from "jsonwebtoken";
export declare function generateJwtTokenForAuthIdentity({ authIdentity, actorType, authProvider, container, }: {
    authIdentity: AuthIdentityDTO;
    actorType: string;
    authProvider?: string;
    container?: MedusaContainer;
}, { secret, expiresIn, options, }: {
    secret: Secret;
    expiresIn: string | undefined;
    options?: ProjectConfigOptions["http"]["jwtOptions"];
}): Promise<string>;
//# sourceMappingURL=generate-jwt-token.d.ts.map