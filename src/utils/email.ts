import { Resend } from "resend"

const apiKey = process.env.RESEND_API_KEY

if (!apiKey) {
  // eslint-disable-next-line no-console
  console.warn("RESEND_API_KEY is not set. Resend client will not be able to send emails.")
}

// Resend constructor expects the API key string
export const resend = new Resend(apiKey ?? "")

export default resend
