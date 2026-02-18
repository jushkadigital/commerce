import { ExecArgs } from "@medusajs/framework/types"

export default async function testCartMetadata({ container }: ExecArgs) {
  const cartModule = container.resolve("cart")

  try {
    const created = await cartModule.createCarts({ currency_code: "eur" })
    const cartId = created.id

    console.log(`Created cart: ${cartId}`)

    const metadata = {
      is_tour: true,
      tour_id: "tour_123",
      tour_date: "2025-12-25T10:00:00Z",
      passengers: [
        { name: "John Doe", type: "adult", passport: "A123" },
      ],
    }

    const lineItem = {
      title: "Test Tour - 2025-12-25",
      quantity: 1,
      unit_price: 100,
      metadata,
    }

    await cartModule.addLineItems(cartId, [lineItem] as any)

    const updated = await cartModule.retrieveCart(cartId, {
      relations: ["items", "items.product", "items.variant"],
    })

    console.log("Updated cart:")
    console.log(JSON.stringify(updated, null, 2))
  } catch (err) {
    console.error("Error in testCartMetadata:", err)
    process.exitCode = 1
  }
}
