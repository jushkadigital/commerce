import { model } from "@medusajs/framework/utils"

const IzipayIpnEvent = model.define("izipay_ipn_event", {
  id: model.id().primaryKey(),
  order_id: model.text().nullable(),
  transaction_id: model.text().nullable(),
  payload: model.json(),
  is_valid: model.boolean().default(false),
  processed_at: model.dateTime().nullable(),
  error: model.text().nullable(),
})

export default IzipayIpnEvent
