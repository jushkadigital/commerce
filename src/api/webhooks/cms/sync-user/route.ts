import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows"

/**
 * POST /webhooks/cms/sync-user
 *
 * Webhook para sincronizar usuarios ADMIN desde el CMS a Medusa.
 * Cuando el CMS crea un usuario con Keycloak, llama a este endpoint
 * para crear el usuario admin correspondiente en Medusa.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const webhookSecret = req.headers["x-webhook-secret"]

    // Validar secret del webhook
    if (webhookSecret !== process.env.CMS_WEBHOOK_SECRET) {
      return res.status(401).json({ message: "Invalid webhook secret" })
    }

    const body = req.body as {
      keycloak_sub: string
      email: string
      first_name?: string
      last_name?: string
      metadata?: Record<string, any>
    }

    const { keycloak_sub, email, first_name, last_name, metadata } = body

    // Validar campos requeridos
    if (!keycloak_sub || !email) {
      return res.status(400).json({
        message: "Missing required fields: keycloak_sub, email",
      })
    }

    const userModule = req.scope.resolve(Modules.USER)
    const authModule = req.scope.resolve(Modules.AUTH)

    // 1. Verificar si el usuario admin ya existe por email
    const existingUsers = await userModule.listUsers({
      email: email,
    })

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0]

      // Actualizar metadata con keycloak_sub si no existe
      if (!existingUser.metadata?.keycloak_sub) {
        await userModule.updateUsers({
          id: existingUser.id,
          metadata: {
            ...existingUser.metadata,
            keycloak_sub,
            synced_from_cms: true,
          },
        })
      }

      return res.json({
        message: "Admin user already exists",
        user_id: existingUser.id,
        created: false,
      })
    }

    // 2. Crear auth identity para Keycloak primero
    let authIdentity
    try {
      authIdentity = await authModule.createAuthIdentities({
        provider_identities: [
          {
            provider: "keycloak",
            entity_id: email,
            user_metadata: {
              email,
              given_name: first_name,
              family_name: last_name,
              keycloak_sub,
            },
          },
        ],
      })
    } catch (authError: any) {
      // Si ya existe, continuar sin auth identity pre-creada
      // Se vinculará cuando el usuario haga login con Keycloak
      console.warn("Could not pre-create auth identity:", authError.message)
    }

    // 3. Crear el usuario admin usando el workflow
    const { result } = await createUserAccountWorkflow(req.scope).run({
      input: {
        userData: {
          email,
          first_name: first_name || "",
          last_name: last_name || "",
          metadata: {
            keycloak_sub,
            synced_from_cms: true,
            cms_metadata: metadata,
          },
        },
        authIdentityId: authIdentity?.id,
      },
    })

    res.status(201).json({
      message: "Admin user created successfully",
      user_id: result.id,
      created: true,
    })

  } catch (error: any) {
    console.error("Error syncing admin user from CMS:", error)
    res.status(500).json({
      message: "Failed to sync admin user",
      error: error.message,
    })
  }
}

/**
 * DELETE /webhooks/cms/sync-user
 *
 * Eliminar usuario admin cuando se elimina en el CMS
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const webhookSecret = req.headers["x-webhook-secret"]

    if (webhookSecret !== process.env.CMS_WEBHOOK_SECRET) {
      return res.status(401).json({ message: "Invalid webhook secret" })
    }

    const { keycloak_sub, email } = req.body as {
      keycloak_sub?: string
      email?: string
    }

    if (!keycloak_sub && !email) {
      return res.status(400).json({
        message: "Either keycloak_sub or email is required",
      })
    }

    const userModule = req.scope.resolve(Modules.USER)

    // Buscar usuario admin por email
    let users: any[] = []

    if (email) {
      users = await userModule.listUsers({ email })
    }

    if (users.length === 0 && keycloak_sub) {
      // Buscar por metadata
      const allUsers = await userModule.listUsers({})
      users = allUsers.filter(
        (u: any) => u.metadata?.keycloak_sub === keycloak_sub
      )
    }

    if (users.length === 0) {
      return res.status(404).json({ message: "Admin user not found" })
    }

    // Soft delete - marcar como eliminado
    await userModule.updateUsers({
      id: users[0].id,
      metadata: {
        ...users[0].metadata,
        deleted_from_cms: true,
        deleted_at: new Date().toISOString(),
      },
    })

    res.json({
      message: "Admin user marked as deleted",
      user_id: users[0].id,
    })

  } catch (error: any) {
    console.error("Error deleting admin user from CMS:", error)
    res.status(500).json({
      message: "Failed to delete admin user",
      error: error.message,
    })
  }
}
