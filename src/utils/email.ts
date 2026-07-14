let _resend: import("resend").Resend | null = null

function getResend(): import("resend").Resend | null {
  if (_resend) return _resend
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }

  // Lazy-require so the Resend constructor is never called without a key
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend") as typeof import("resend")
  _resend = new Resend(apiKey)
  return _resend
}

export const resend = getResend()
export default resend