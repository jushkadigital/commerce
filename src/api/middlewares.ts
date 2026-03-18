import {
  defineMiddlewares,
  authenticate,
} from "@medusajs/medusa"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CreateTourSchema } from "./admin/tours/route"
import { validateAndTransformBody, validateAndTransformQuery } from "@medusajs/framework"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"
import { createSelectParams } from "./validators"
import { GetTourAvailabilityParamsSchema } from "./admin/tours/[id]/availability/validators"
import { z } from "zod"
import { CreatePackageSchema } from "./admin/packages/route"
import { CreateOrderNotificationEmailSchema } from "./admin/order-notification-emails/route"
import { customMiddlewares } from "./custom/izipay/callback/middlewares"
import { defaultStoreCartFields } from "./query-config"

export const StoreGetCartsCart = createSelectParams()

const COUPON_PAYMENT_SESSION_LOCK_MESSAGE =
  "Coupon changes are not allowed after payment session creation. Reset payment session and retry."

const COUPON_SINGLE_MANUAL_MESSAGE =
  "Only one manual coupon can be applied per cart."

const storeCartPromotionPolicyFields = [
  "id",
  ...defaultStoreCartFields.filter((field) => field.startsWith("promotions.")),
  "payment_collection.id",
  "payment_collection.payment_sessions.id",
]

function getPromotionCodesFromRequest(req: MedusaRequest) {
  const body = req.body as { promo_codes?: unknown } | undefined

  if (!Array.isArray(body?.promo_codes)) {
    return []
  }

  return body.promo_codes.filter((code): code is string => typeof code === "string")
}

async function enforceStoreCartPromotionCouponPolicy(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const cartId = req.params.id

  if (!cartId) {
    return next()
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: storeCartPromotionPolicyFields,
    filters: { id: cartId },
  })

  const cart = carts[0]

  if (!cart) {
    return next()
  }

  const paymentSessions = cart.payment_collection?.payment_sessions ?? []

  if (paymentSessions.length > 0) {
    return res.status(409).json({
      message: COUPON_PAYMENT_SESSION_LOCK_MESSAGE,
    })
  }

  if (req.method !== "POST") {
    return next()
  }

  const promoCodes = getPromotionCodesFromRequest(req)

  if (promoCodes.length === 0) {
    return next()
  }

  const existingManualPromotion = cart.promotions?.find(
    (promotion) => promotion?.is_automatic === false
  )

  if (
    existingManualPromotion?.code &&
    promoCodes.some((code) => code !== existingManualPromotion.code)
  ) {
    return res.status(400).json({
      message: COUPON_SINGLE_MANUAL_MESSAGE,
    })
  }

  return next()
}

export default defineMiddlewares({
  routes: [
    ...customMiddlewares,
    {
      matcher: "/store/carts/:id/promotions",
      methods: ["POST", "DELETE"],
      middlewares: [enforceStoreCartPromotionCouponPolicy],
    },
    // Admin routes
    {
      matcher: "/admin/tours*",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/bookings*",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/package-bookings*",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/order-notification-emails*",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      // Permite crear usuario admin después de autenticarse con Keycloak
      // El token tiene auth_identity_id pero no actor_id (usuario aún no existe)
      matcher: "/admin/keycloak-auth/users",
      middlewares: [
        authenticate("user", ["session", "bearer"], {
          allowUnregistered: true,
        }),
      ],
    },
    {
      matcher: "/admin/bookings",
      methods: ["GET"],
      middlewares: [
        validateAndTransformQuery(createFindParams().merge(z.object({
          type: z.enum(["tour"]).optional(),
          tour_date: z.object({
            gte: z.string().optional(),
            lte: z.string().optional(),
          }).optional(),
        })), {
          isList: true,
          defaults: ["id", "order_id", "tour_id", "tour_date", "status",
            "line_items.*", "tour.*", "metadata"
          ],
        })
      ],
    },
    {
      matcher: "/admin/package-bookings",
      methods: ["GET"],
      middlewares: [
        validateAndTransformQuery(createFindParams().merge(z.object({
          type: z.enum(["package"]).optional(),
          package_date: z.object({
            gte: z.string().optional(),
            lte: z.string().optional(),
          }).optional(),
        })), {
          isList: true,
          defaults: ["id", "order_id", "package_date", "status",
            "line_items.*", "package.*", "metadata"
          ],
        })
      ],
    },
    {
      matcher: "/admin/tours",
      methods: ["GET"],
      middlewares: [
        validateAndTransformQuery(createFindParams(), {
          isList: true,
          defaults: ["id", "product_id", "tour_id", "destination", "description", "thumbnail",
            "duration_days", "max_capacity", "variants.*", "variants.product_variant.price_set.*",
            "variants.product_variant.price_set.prices.*"],
        })
      ],
    }
    ,
    {
      matcher: "/admin/packages",
      methods: ["POST"],
      middlewares: [
        validateAndTransformBody(CreatePackageSchema),
      ],
    },
    {
      matcher: "/admin/packages",
      methods: ["GET"],
      middlewares: [
        validateAndTransformQuery(createFindParams(), {
          isList: true,
          defaults: ["id", "product_id", "package_id", "destination", "description", "thumbnail",
            "duration_days", "max_capacity", "variants.*", "variants.product_variant.price_set.*",
            "variants.product_variant.price_set.prices.*"],
        })
      ],
    }
    ,
    {
      matcher: "/admin/tours",
      methods: ["POST"],
      middlewares: [
        validateAndTransformBody(CreateTourSchema),
      ],
    },
    {
      matcher: "/admin/tours/:id/availability",
      methods: ["GET"],
      middlewares: [
        validateAndTransformQuery(GetTourAvailabilityParamsSchema, {
          defaults: ["start_date", "end_date"],
        }),
      ],
    },
    {
      matcher: "/admin/order-notification-emails",
      methods: ["POST"],
      middlewares: [
        validateAndTransformBody(CreateOrderNotificationEmailSchema),
      ],
    },
  ]
})
