import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function testCheckoutFlow({ container }: ExecArgs) {
  const cartModule = container.resolve(Modules.CART)
  const regionModule = container.resolve(Modules.REGION)
  
  // 1. Get region
  const regions = await regionModule.listRegions({})
  const regionPeru = regions.find((r: any) => r.name === "Perú")
  
  if (!regionPeru) {
    return
  }


  // 2. Create Cart
  const cart = await cartModule.createCarts({
    region_id: regionPeru.id,
    currency_code: regionPeru.currency_code,
  })
  

  // 3. Initiate payment sessions
  // Usually this is done via a workflow in Medusa API
  // Let's call the payment collection workflow or API directly if we can, 
  // or we can test the store API.
}
