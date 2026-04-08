import { MiddlewareRoute } from "@medusajs/medusa"
import express from "express"

export const customMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/custom/izipay/callback",
    method: "POST",
      middlewares: [
        express.raw({ type: 'application/json' }),
        (req: any, res, next) => {
        // If express.raw captured it, it will be in req.body as a Buffer
        if (Buffer.isBuffer(req.body)) {
          req.rawBody = req.body.toString('utf8');
          // Parse it back for the rest of Medusa
          try {
             req.body = JSON.parse(req.rawBody);
           } catch (error) {
             console.warn("Failed to parse Izipay raw callback body", error)
           }
         }
         next()
       }
    ],
  },
]
