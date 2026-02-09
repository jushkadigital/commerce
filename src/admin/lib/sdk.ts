import Medusa from "@medusajs/js-sdk"

let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL
}
export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: true,
  auth: {
    type: "session",
  },
})
