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
import { CartSchema } from "./store/customcart/[id]/line-items/route"
import { createSelectParams } from "./validators"

export const StoreGetCartsCart = createSelectParams()


export default defineMiddlewares({
  routes: [
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
        validateAndTransformQuery(createFindParams(), {
          isList: true,
          defaults: ["id", "order_id", "tour_id", "tour_date", "status",
            "line_items.*"
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
            "duration_days", "max_capacity", "available_dates", "variants.*", "variants.product_variant.price_set.*", // El set de precios
            "variants.product_variant.price_set.prices.*"],
        })
      ],
    }
    ,
    {
      matcher: "/admin/packages",
      methods: ["POST"],
      middlewares: [
        validateAndTransformBody(CreateTourSchema),
      ],
    },
    {
      matcher: "/admin/packages",
      methods: ["GET"],
      middlewares: [
        validateAndTransformQuery(createFindParams(), {
          isList: true,
          defaults: ["id", "product_id", "package_id", "destination", "description", "thumbnail",
            "duration_days", "max_capacity", "available_dates", "variants.*", "variants.product_variant.price_set.*", // El set de precios
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
      method: ["POST"],
      matcher: "/store/customcart/:id/line-items",
      middlewares: [
        validateAndTransformBody(
          CartSchema,
        ),
        validateAndTransformQuery(
          StoreGetCartsCart,
          QueryConfig.retrieveTransformQueryConfig
        )
      ],
    }
  ]
})
