import { ExecArgs } from "@medusajs/framework/types"

export default async function testApi({ container }: ExecArgs) {
  const paymentModule = container.resolve("payment")
  const providers = await paymentModule.listPaymentProviders({}, {})
  console.log("Providers:", providers.map(p => p.id))
}
