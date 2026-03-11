import {
  defineMiddlewares,
  authenticate,
} from "@medusajs/medusa"
import * as QueryConfig from "./query-config"
import {
  StoreGetToursParams,
  StoreGetTourParams,
  StoreCreateTourBody,
} from "./store/tours/validators"
import { CreateTourSchema } from "./admin/tours/route"
import { validateAndTransformBody, validateAndTransformQuery } from "@medusajs/framework"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"
import { createSelectParams } from "./validators"
import { GetTourAvailabilityParamsSchema } from "./admin/tours/[id]/availability/validators"
import { z } from "zod"
import { CreatePackageSchema } from "./admin/packages/route"
import { CreateOrderNotificationEmailSchema } from "./admin/order-notification-emails/route"
import { customMiddlewares } from "./custom/izipay/callback/middlewares"

export const StoreGetCartsCart = createSelectParams()

export default defineMiddlewares({
  routes: [
    ...customMiddlewares,
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
