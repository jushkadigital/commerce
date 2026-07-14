import { Modules } from "@medusajs/framework/utils"
import { createCustomerAccountWorkflow } from "@medusajs/medusa/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"

/**
 * Result of JIT provisioning a customer from Keycloak data.
 * - `wasCreated` is true when at least one entity was newly created.
 *   If both AuthIdentity and Customer already existed it is false.
 */
export type ProvisionCustomerResult = {
  customerId: string
  authIdentityId: string
  wasCreated: boolean
}

export type ProvisionCustomerInput = {
  container: MedusaContainer
  keycloakSub: string
  keycloakEmail: string
  firstName?: string
  lastName?: string
  /** Extra metadata to merge into the customer record (e.g. synced_from_mq). */
  extraMetadata?: Record<string, unknown>
}

/**
 * Provisions a Medusa Customer + AuthIdentity for a Keycloak user.
 *
 * Idempotent: if AuthIdentity or Customer already exist they are
 * retrieved, not duplicated. This makes the function safe to call
 * from both the JIT token-exchange endpoint (first login) and the
 * RabbitMQ subscriber (eventual reconciliation).
 */
export async function provisionCustomerFromKeycloak(
  input: ProvisionCustomerInput
): Promise<ProvisionCustomerResult> {
  const { container, keycloakSub, keycloakEmail, firstName, lastName, extraMetadata } = input

  const authModule = container.resolve(Modules.AUTH)
  const customerModule = container.resolve(Modules.CUSTOMER)

  // ------------------------------------------------------------------
  // 1. Find or create AuthIdentity + ProviderIdentity
  // ------------------------------------------------------------------
  const [existingPI] = await authModule.listProviderIdentities({
    provider: "keycloak-store",
    entity_id: keycloakSub,
  })

  let authIdentityId: string
  let authIdentity: any
  let authCreated = false

  if (existingPI?.auth_identity_id) {
    authIdentity = await authModule.retrieveAuthIdentity(existingPI.auth_identity_id)
    authIdentityId = authIdentity.id
  } else {
    try {
      authIdentity = await authModule.createAuthIdentities({
        provider_identities: [
          {
            provider: "keycloak-store",
            entity_id: keycloakSub,
            user_metadata: {
              email: keycloakEmail,
              keycloak_sub: keycloakSub,
              given_name: firstName || "",
              family_name: lastName || "",
            },
          },
        ],
      })
      authIdentityId = authIdentity.id
      authCreated = true
    } catch (authError: unknown) {
      if (isAlreadyExistsError(authError)) {
        // Race: someone else created it between our check and create
        const [pi] = await authModule.listProviderIdentities({
          provider: "keycloak-store",
          entity_id: keycloakSub,
        })
        if (!pi?.auth_identity_id) {
          throw new Error(
            `[JIT] AuthIdentity reported as duplicate but not recoverable for sub ${keycloakSub}`
          )
        }
        authIdentity = await authModule.retrieveAuthIdentity(pi.auth_identity_id)
        authIdentityId = authIdentity.id
      } else {
        throw authError
      }
    }
  }

  // ------------------------------------------------------------------
  // 2. Find or create Customer
  // ------------------------------------------------------------------
  const [existingCustomer] = await customerModule.listCustomers({
    email: keycloakEmail,
  })

  let customerId: string
  let customerCreated = false

  if (existingCustomer) {
    customerId = existingCustomer.id

    // Enrich names if they were empty (JIT may have created the
    // customer without names, subscriber can fill them later).
    if (firstName && !existingCustomer.first_name) {
      await customerModule.updateCustomers(existingCustomer.id, {
        first_name: firstName,
        last_name: lastName || existingCustomer.last_name || "",
        metadata: {
          ...(existingCustomer.metadata as Record<string, unknown> | undefined),
          keycloak_sub: keycloakSub,
          ...extraMetadata,
        },
      })
    }
  } else {
    const { result } = await createCustomerAccountWorkflow(container).run({
      input: {
        customerData: {
          email: keycloakEmail,
          first_name: firstName || "",
          last_name: lastName || "",
          metadata: {
            keycloak_sub: keycloakSub,
            jit_provisioned: true,
            ...extraMetadata,
          },
        },
        authIdentityId,
      },
    })
    customerId = result.id
    customerCreated = true
  }

  // ------------------------------------------------------------------
  // 3. Ensure app_metadata links AuthIdentity → Customer
  // ------------------------------------------------------------------
  const currentAppMetadata = authIdentity.app_metadata || {}

  if (!currentAppMetadata.customer_id || currentAppMetadata.customer_id !== customerId) {
    await authModule.updateAuthIdentities([
      {
        id: authIdentityId,
        app_metadata: {
          ...currentAppMetadata,
          customer_id: customerId,
        },
      },
    ])
  }

  return {
    customerId,
    authIdentityId,
    wasCreated: authCreated || customerCreated,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return false
  }
  const message = String((error as { message: unknown }).message)
  return message.toLowerCase().includes("already exists")
}
