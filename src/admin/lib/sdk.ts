import Medusa from "@medusajs/js-sdk"

let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (import.meta.env.VITE_MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = import.meta.env.VITE_MEDUSA_BACKEND_URL
}
const publicUrl = 'https://commerce.patarutera.pe'
export const sdk = new Medusa({
  baseUrl: publicUrl,
  debug: false,
  auth: {
    type: "session",
  },
})
