import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createCartWorkflow } from "@medusajs/medusa/core-flows"
import { defaultStoreCartCreateFields } from "../../query-config"
import { createCartWithoutPromotionsWorkflow } from "../../../workflows/create-cart-without-promotions"

type RequestWithQueryConfig = MedusaRequest & {
  queryConfig?: {
    fields?: string[]
  }
}

type RequestWithAuthContext = MedusaRequest & {
  auth_context?: {
    actor_id?: string
  }
}

const hasExplicitFieldsQuery = (req: MedusaRequest): boolean => {
  const rawFields = req.query.fields

  if (typeof rawFields === "string") {
    return rawFields.trim().length > 0
  }

  if (Array.isArray(rawFields)) {
    return rawFields.length > 0
  }

  return false
}

const resolveFieldsForCreateResponse = (req: RequestWithQueryConfig) => {
  if (hasExplicitFieldsQuery(req)) {
    const requestedFields = req.queryConfig?.fields

    if (Array.isArray(requestedFields) && requestedFields.length > 0) {
      return requestedFields
    }
  }

  return defaultStoreCartCreateFields
}

const hasNonEmptyArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value) && value.length > 0
}

const shouldUseLightweightCartCreate = (
  validatedBody: Record<string, unknown>
): boolean => {
  const hasItems = hasNonEmptyArray(validatedBody.items)
  const hasPromoCodes = hasNonEmptyArray(validatedBody.promo_codes)
  const hasAdditionalData = Object.prototype.hasOwnProperty.call(
    validatedBody,
    "additional_data"
  )

  return !hasItems && !hasPromoCodes && !hasAdditionalData
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const validatedBody =
    typeof req.validatedBody === "object" && req.validatedBody !== null
      ? (req.validatedBody as Record<string, unknown>)
      : {}

  const requestWithAuth = req as RequestWithAuthContext

  const workflowInput = {
    ...validatedBody,
    customer_id: requestWithAuth.auth_context?.actor_id,
  }

  const workflow = shouldUseLightweightCartCreate(validatedBody)
    ? createCartWithoutPromotionsWorkflow(req.scope)
    : createCartWorkflow(req.scope)

  const { result } = await workflow.run({
    input: workflowInput,
  })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const responseFields = resolveFieldsForCreateResponse(req as RequestWithQueryConfig)

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: responseFields,
    filters: { id: result.id },
  })

  res.status(200).json({ cart: carts[0] })
}
