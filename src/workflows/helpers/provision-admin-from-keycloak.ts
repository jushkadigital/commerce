import { Modules } from "@medusajs/framework/utils"
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"

export type ProvisionAdminResult = {
  userId: string
  authIdentityId: string
  wasCreated: boolean
}

export type ProvisionAdminInput = {
  container: MedusaContainer
  keycloakSub: string
  keycloakEmail: string
  firstName?: string
  lastName?: string
  role?: string
  extraMetadata?: Record<string, unknown>
}

export async function provisionAdminFromKeycloak(
  input: ProvisionAdminInput
): Promise<ProvisionAdminResult> {
  const {
    container,
    keycloakSub,
    keycloakEmail,
    firstName,
    lastName,
    role,
    extraMetadata,
  } = input

  const authModule = container.resolve(Modules.AUTH)
  const userModule = container.resolve(Modules.USER)

  // -- 1. Find or create AuthIdentity + ProviderIdentity --

  const [existingPI] = await authModule.listProviderIdentities({
    provider: "keycloak-admin",
    entity_id: keycloakEmail,
  })

  let authIdentityId: string
  let authIdentity: any
  let authCreated = false

  if (existingPI?.auth_identity_id) {
    authIdentity = await authModule.retrieveAuthIdentity(
      existingPI.auth_identity_id
    )
    authIdentityId = authIdentity.id
  } else {
    try {
      authIdentity = await authModule.createAuthIdentities({
        provider_identities: [
          {
            provider: "keycloak-admin",
            entity_id: keycloakEmail,
            user_metadata: {
              email: keycloakEmail,
              keycloak_sub: keycloakSub,
              given_name: firstName || "",
              family_name: lastName || "",
              ...(role ? { role } : {}),
            },
          },
        ],
      })
      authIdentityId = authIdentity.id
      authCreated = true
    } catch (authError: unknown) {
      if (isAlreadyExistsError(authError)) {
        const [pi] = await authModule.listProviderIdentities({
          provider: "keycloak-admin",
          entity_id: keycloakEmail,
        })
        if (!pi?.auth_identity_id) {
          throw new Error(
            `[admin.provision] AuthIdentity reported duplicate but unrecoverable for ${keycloakEmail}`
          )
        }
        authIdentity = await authModule.retrieveAuthIdentity(
          pi.auth_identity_id
        )
        authIdentityId = authIdentity.id
      } else {
        throw authError
      }
    }
  }

  // -- 2. Find or create Admin User --

  const [existingUser] = await userModule.listUsers({
    email: keycloakEmail,
  })

  let userId: string
  let userCreated = false

  if (existingUser) {
    userId = existingUser.id

    const mergedMetadata: Record<string, unknown> = {
      ...(existingUser.metadata as Record<string, unknown> | undefined),
      keycloak_sub: keycloakSub,
      ...extraMetadata,
    }

    if (role) {
      mergedMetadata.role = role
    }

    const needsUpdate =
      (firstName && !existingUser.first_name) ||
      (lastName && !existingUser.last_name) ||
      !existingUser.metadata?.keycloak_sub ||
      (role && existingUser.metadata?.role !== role)

    if (needsUpdate) {
      await userModule.updateUsers({
        id: existingUser.id,
        first_name: firstName || existingUser.first_name || "",
        last_name: lastName || existingUser.last_name || "",
        metadata: mergedMetadata,
      })
    }
  } else {
    const { result } = await createUserAccountWorkflow(container).run({
      input: {
        userData: {
          email: keycloakEmail,
          first_name: firstName || "",
          last_name: lastName || "",
          metadata: {
            keycloak_sub: keycloakSub,
            ...(role ? { role } : {}),
            ...extraMetadata,
          },
        },
        authIdentityId,
      },
    })
    userId = result.id
    userCreated = true
  }

  // -- 3. Ensure app_metadata links AuthIdentity → User --

  const currentAppMetadata = authIdentity.app_metadata || {}

  if (!currentAppMetadata.user_id || currentAppMetadata.user_id !== userId) {
    await authModule.updateAuthIdentities([
      {
        id: authIdentityId,
        app_metadata: {
          ...currentAppMetadata,
          user_id: userId,
          ...(role ? { role } : {}),
        },
      },
    ])
  }

  return {
    userId,
    authIdentityId,
    wasCreated: authCreated || userCreated,
  }
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return false
  }
  const message = String((error as { message: unknown }).message)
  return message.toLowerCase().includes("already exists")
}
