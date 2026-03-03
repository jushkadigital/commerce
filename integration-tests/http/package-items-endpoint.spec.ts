import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"
import { PACKAGE_MODULE } from "../../src/modules/package"
import PackageModuleService from "../../src/modules/package/service"
import { PassengerType } from "../../src/modules/package/models/package-variant"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Package Items Endpoint", () => {
      let container: any
      let packageModuleService: PackageModuleService
      let productModule: any
      let cartModule: any
      let salesChannelModule: any
      let regionModule: any
      let publishableApiKeyToken: string

      let pkg: any
      let product: any
      let region: any
      let salesChannel: any
      const testDate = "2026-07-20"
      const packageCapacity = 20

      beforeAll(async () => {
        container = getContainer()
        packageModuleService = container.resolve(PACKAGE_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        cartModule = container.resolve(Modules.CART)
        salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
        regionModule = container.resolve(Modules.REGION)
      })

      beforeEach(async () => {
        salesChannel = await salesChannelModule.createSalesChannels({
          name: "Package Endpoint Channel",
        })

        region = await regionModule.createRegions({
          name: "Package Endpoint Region",
          currency_code: "usd",
          countries: ["us"],
          payment_providers: ["pp_system_default"],
        })

        product = await productModule.createProducts({
          title: "Endpoint Test Package",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
          options: [
            {
              title: "Passenger Type",
              values: ["Adult", "Child"],
            },
          ],
        })

        pkg = await packageModuleService.createPackages({
          product_id: product.id,
          destination: "Test Destination",
          duration_days: 5,
          thumbnail: "https://example.com/test.jpg",
          max_capacity: packageCapacity,
        })

        const variants = await productModule.createProductVariants([
          {
            product_id: product.id,
            title: "Adult Ticket",
            sku: "TEST-ADULT",
            prices: [{ currency_code: "usd", amount: 200 }],
            options: { "Passenger Type": "Adult" },
          },
          {
            product_id: product.id,
            title: "Child Ticket",
            sku: "TEST-CHILD",
            prices: [{ currency_code: "usd", amount: 100 }],
            options: { "Passenger Type": "Child" },
          }
        ])

        const adultVariant = variants.find((v: any) => v.title === "Adult Ticket")
        const childVariant = variants.find((v: any) => v.title === "Child Ticket")

        await packageModuleService.createPackageVariants({
          package_id: pkg.id,
          variant_id: adultVariant.id,
          passenger_type: PassengerType.ADULT,
        })

        await packageModuleService.createPackageVariants({
          package_id: pkg.id,
          variant_id: childVariant.id,
          passenger_type: PassengerType.CHILD,
        })

        product = await productModule.retrieveProduct(product.id, {
          relations: ["variants"],
        })

        const { result: publishableApiKeyResult } = await createApiKeysWorkflow(container).run({
          input: {
            api_keys: [
              {
                title: `pkg-endpoint-key-${Date.now()}`,
                type: "publishable",
                created_by: "test",
              },
            ],
          },
        })

        publishableApiKeyToken = publishableApiKeyResult[0].token

        await linkSalesChannelsToApiKeyWorkflow(container).run({
          input: {
            id: publishableApiKeyResult[0].id,
            add: [salesChannel.id],
          },
        })
      })

      it("should add package items using the endpoint", async () => {
        const cart = await cartModule.createCarts({
          email: "endpoint@test.com",
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          currency_code: "usd",
        })

        const adultVariant = product.variants.find((v: any) => v.title === "Adult Ticket")
        const childVariant = product.variants.find((v: any) => v.title === "Child Ticket")

        const response = await api.post(
          "/store/cart/package-items",
          {
            cart_id: cart.id,
            package_date: testDate,
            items: [
              {
                variant_id: adultVariant.id,
                quantity: 2,
                unit_price: 200,
              },
              {
                variant_id: childVariant.id,
                quantity: 1,
                unit_price: 100,
              }
            ]
          },
          {
            headers: {
              "x-publishable-api-key": publishableApiKeyToken,
            },
          }
        )

        expect(response.status).toBe(200)
        expect(response.data.summary.total_passengers).toBe(3)
        expect(response.data.summary.package_id).toBe(pkg.id)

        const updatedCart = await cartModule.retrieveCart(cart.id, { relations: ["items"] })
        expect(updatedCart.items).toHaveLength(2)
        
        const adultItem = updatedCart.items.find((i: any) => i.unit_price === 200)
        expect(adultItem.quantity).toBe(2)
        expect(adultItem.metadata.is_package).toBe(true)
        expect(adultItem.requires_shipping).toBe(false)
        expect(updatedCart.items.every((i: any) => i.requires_shipping === false)).toBe(true)
      })
    })
  }
})
