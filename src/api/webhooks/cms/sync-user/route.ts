import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { provisionAdminFromKeycloak } from "../../../../workflows/helpers/provision-admin-from-keycloak"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const webhookSecret = req.headers["x-webhook-secret"]

    if (webhookSecret !== process.env.CMS_WEBHOOK_SECRET) {
      return res.status(401).json({ message: "Invalid webhook secret" })
    }

    const body = req.body as {
      keycloak_sub: string
      email: string
      first_name?: string
      last_name?: string
      role?: string
      metadata?: Record<string, any>
    }

    const { keycloak_sub, email, first_name, last_name, role, metadata } = body

    if (!keycloak_sub || !email) {
      return res.status(400).json({
        message: "Missing required fields: keycloak_sub, email",
      })
    }

    const result = await provisionAdminFromKeycloak({
      container: req.scope,
      keycloakSub: keycloak_sub,
      keycloakEmail: email,
      firstName: first_name,
      lastName: last_name,
      role,
      extraMetadata: { synced_from_cms: true, cms_metadata: metadata },
    })

    res.status(result.wasCreated ? 201 : 200).json({
      message: result.wasCreated
        ? "Admin user created successfully"
        : "Admin user already exists",
      user_id: result.userId,
      created: result.wasCreated,
    })
  } catch (error: any) {
    console.error("Error syncing admin user from CMS:", error)
    res.status(500).json({
      message: "Failed to sync admin user",
      error: error.message,
    })
  }
}

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

    let users: any[] = []

    if (email) {
      users = await userModule.listUsers({ email })
    }

    if (users.length === 0 && keycloak_sub) {
      const allUsers = await userModule.listUsers({})
      users = allUsers.filter(
        (u: any) => u.metadata?.keycloak_sub === keycloak_sub
      )
    }

    if (users.length === 0) {
      return res.status(404).json({ message: "Admin user not found" })
    }

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
