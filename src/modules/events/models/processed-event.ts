import { model } from "@medusajs/framework/utils"

const ProcessedEvent = model.define("processed_event", {
  id: model.id().primaryKey(),
  event_id: model.text(),
  consumer_id: model.text(),
  status: model.text(),
  stale_lock_until: model.dateTime(),
  payload_hash: model.text().nullable(),
  processed_at: model.dateTime().nullable(),
  error_message: model.text().nullable(),
}).indexes([
  {
    on: ["event_id", "consumer_id"],
    unique: true,
  },
])

export default ProcessedEvent
