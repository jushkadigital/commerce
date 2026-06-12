import Medusa from "@medusajs/js-sdk"

const MEDUSA_BACKEND_URL =
  import.meta.env.VITE_MEDUSA_BACKEND_URL ||
  (import.meta.env.PROD ? "https://commerce.patarutera.pe" : "http://localhost:9000")

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: false,
  auth: {
    type: "session",
  },
})
