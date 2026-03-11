import { MedusaService } from "@medusajs/framework/utils"
import IzipayIpnEvent from "./models/ipn-event"

class IzipayModuleService extends MedusaService({
  IzipayIpnEvent,
}) {
}

export default IzipayModuleService
