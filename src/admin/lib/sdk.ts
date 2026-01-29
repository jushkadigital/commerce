import Medusa from "@medusajs/js-sdk"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "https://commerce.patarutera.pe"
export const sdk = new Medusa({
  baseUrl: BACKEND_URL,
  debug: true,
  auth: {
    type: "session",
  },
})
