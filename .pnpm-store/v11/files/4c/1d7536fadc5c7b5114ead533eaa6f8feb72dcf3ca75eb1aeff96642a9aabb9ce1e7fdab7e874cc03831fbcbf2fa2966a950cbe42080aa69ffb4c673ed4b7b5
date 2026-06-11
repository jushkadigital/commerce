"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedusaCloudAuthService = void 0;
const utils_1 = require("@medusajs/framework/utils");
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class MedusaCloudAuthService extends utils_1.AbstractAuthModuleProvider {
    constructor({ logger }, options) {
        // @ts-ignore
        super(...arguments);
        this.config_ = options;
        this.logger_ = logger;
    }
    async register(_) {
        throw new utils_1.MedusaError(utils_1.MedusaError.Types.NOT_ALLOWED, "Medusa Cloud does not support registration. Use method `authenticate` instead.");
    }
    async authenticate(req, authIdentityService) {
        const query = req.query ?? {};
        const body = req.body ?? {};
        if (query.error) {
            return {
                success: false,
                error: `${query.error}`,
            };
        }
        const stateKey = crypto_1.default.randomBytes(32).toString("hex");
        const state = {
            callback_url: body?.callback_url ?? this.config_.callback_url,
        };
        await authIdentityService.setState(stateKey, state);
        return this.getRedirect(this.getClientId(), state.callback_url, stateKey);
    }
    async validateCallback(req, authIdentityService) {
        const query = req.query ?? {};
        const body = req.body ?? {};
        if (query.error) {
            return {
                success: false,
                error: `${query.error}`,
            };
        }
        const code = query?.code ?? body?.code;
        if (!code) {
            return { success: false, error: "No code provided" };
        }
        const state = await authIdentityService.getState(query?.state);
        if (!state) {
            return { success: false, error: "No state provided, or session expired" };
        }
        const clientId = this.getClientId();
        try {
            const response = await fetch(this.config_.oauth_token_endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: this.config_.api_key,
                    code,
                    redirect_uri: state.callback_url,
                    grant_type: "authorization_code",
                }),
            }).then((r) => {
                if (!r.ok) {
                    this.logger_.warn(`Could not exchange token, ${r.status}, ${r.statusText}: response: ${JSON.stringify(r)}`);
                    throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, `Could not exchange token, ${r.status}, ${r.statusText}`);
                }
                return r.json();
            });
            const { authIdentity, success, error } = await this.verify_(response.id_token, authIdentityService);
            return {
                success,
                authIdentity,
                error,
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async verify_(idToken, authIdentityService) {
        if (!idToken) {
            return { success: false, error: "No id_token" };
        }
        const jwtData = jsonwebtoken_1.default.decode(idToken, {
            complete: true,
        });
        if (!jwtData) {
            return { success: false, error: "The id_token is not a valid JWT" };
        }
        const payload = jwtData.payload;
        if (!payload.email_verified) {
            throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, "Email not verified, cannot proceed with authentication");
        }
        const entity_id = payload.sub;
        const userMetadata = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            given_name: payload.given_name,
            family_name: payload.family_name,
        };
        let authIdentity;
        try {
            authIdentity = await authIdentityService.retrieve({
                entity_id,
            });
        }
        catch (error) {
            if (error.type === utils_1.MedusaError.Types.NOT_FOUND) {
                const createdAuthIdentity = await authIdentityService.create({
                    entity_id,
                    user_metadata: userMetadata,
                });
                authIdentity = createdAuthIdentity;
            }
            else {
                return { success: false, error: error.message };
            }
        }
        return {
            success: true,
            authIdentity,
        };
    }
    getRedirect(clientId, callbackUrl, stateKey) {
        const authUrl = new URL(this.config_.oauth_authorize_endpoint);
        authUrl.searchParams.set("redirect_uri", callbackUrl);
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "email profile openid");
        authUrl.searchParams.set("state", stateKey);
        return { success: true, location: authUrl.toString() };
    }
    getClientId() {
        return this.config_.environment_handle || this.config_.sandbox_handle;
    }
}
exports.MedusaCloudAuthService = MedusaCloudAuthService;
MedusaCloudAuthService.identifier = "cloud";
MedusaCloudAuthService.DISPLAY_NAME = "Medusa Cloud Authentication";
//# sourceMappingURL=medusa-cloud-auth.js.map