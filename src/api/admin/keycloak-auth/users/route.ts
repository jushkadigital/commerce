import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows"

type CreateUserInput = {
  email: string
  first_name?: string
  last_name?: string
}

/**
 * POST /admin/keycloak-auth/users
 * Create an admin user after successful Keycloak authentication
 * This is called by the admin login widget after the user authenticates
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  try {
    const { email, first_name, last_name } = req.body as CreateUserInput

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      })
    }

    // Run the workflow to create the user account
    const { result } = await createUserAccountWorkflow(req.scope).run({
      input: {
        authIdentityId: req.auth_context.auth_identity_id,
        userData: {
          email,
          first_name,
          last_name,
        },
      },
    })

    res.status(201).json({
      user: result,
      message: "User created successfully",
    })
  } catch (error) {
    console.error("Error creating user:", error)

    // Check if user already exists
    if (error.message?.includes("already exists")) {
      return res.status(409).json({
        message: "User already exists",
        error: error.message,
      })
    }

    res.status(500).json({
      message: "Failed to create user",
      error: error.message,
    })
  }
}
