import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import KeycloakAuthProviderService from "./service"

export default ModuleProvider(Modules.AUTH, {
  services: [KeycloakAuthProviderService],
})

export { KeycloakAuthProviderService }
