import type {
  AdditionalData,
  CreateCartDTO,
  CreateCartWorkflowInputDTO,
} from "@medusajs/framework/types"
import {
  CartWorkflowEvents,
  MedusaError,
  MedusaErrorTypes,
} from "@medusajs/framework/utils"
import {
  createWorkflow,
  parallelize,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  emitEventStep,
  findOneOrAnyRegionStep,
  findOrCreateCustomerStep,
  findSalesChannelStep,
  refreshPaymentCollectionForCartWorkflow,
} from "@medusajs/medusa/core-flows"
import { createEmptyCartStep } from "./steps/create-empty-cart"

export type CreateCartWithoutPromotionsInput =
  CreateCartWorkflowInputDTO & AdditionalData

type CartAddress = Exclude<CreateCartDTO["shipping_address"], string | undefined>

const isCartAddressObject = (value: unknown): value is CartAddress => {
  return typeof value === "object" && value !== null
}

export const createCartWithoutPromotionsWorkflow = createWorkflow(
  "create-cart-without-promotions",
  function (input: CreateCartWithoutPromotionsInput) {
    const [salesChannel, region, customerData] = parallelize(
      findSalesChannelStep({
        salesChannelId: input.sales_channel_id,
      }),
      findOneOrAnyRegionStep({
        regionId: input.region_id,
      }),
      findOrCreateCustomerStep({
        customerId: input.customer_id,
        email: input.email,
      })
    )

    const cartToCreate = transform(
      { input, salesChannel, region, customerData },
      (data): CreateCartDTO => {
        if (!data.region) {
          throw new MedusaError(MedusaError.Types.NOT_FOUND, "No regions found")
        }

        if (!data.salesChannel?.id) {
          throw new MedusaError(
            MedusaErrorTypes.INVALID_DATA,
            "Sales channel is required when creating a cart. Either provide a sales channel ID or set the default sales channel for the store."
          )
        }

        const cartInput: CreateCartDTO = {
          region_id: data.region.id,
          currency_code: data.input.currency_code ?? data.region.currency_code,
          sales_channel_id: data.salesChannel.id,
        }

        if (typeof data.input.email === "string") {
          cartInput.email = data.input.email
        }

        const shippingAddress = data.input.shipping_address
        if (
          typeof shippingAddress === "string" ||
          isCartAddressObject(shippingAddress)
        ) {
          cartInput.shipping_address = shippingAddress
        }

        const billingAddress = data.input.billing_address
        if (
          typeof billingAddress === "string" ||
          isCartAddressObject(billingAddress)
        ) {
          cartInput.billing_address = billingAddress
        }

        if (typeof data.input.locale === "string") {
          cartInput.locale = data.input.locale
        }

        if (data.input.metadata && typeof data.input.metadata === "object") {
          cartInput.metadata = data.input.metadata
        }

        if (data.customerData.customer?.id) {
          cartInput.customer_id = data.customerData.customer.id
          cartInput.email = data.input.email ?? data.customerData.customer.email
        }

        if (!data.input.shipping_address && data.region.countries.length === 1) {
          cartInput.shipping_address = {
            country_code: data.region.countries[0].iso_2,
          }
        }

        return cartInput
      }
    )

    const cart = createEmptyCartStep(cartToCreate)

    refreshPaymentCollectionForCartWorkflow.runAsStep({
      input: {
        cart_id: cart.id,
      },
    })

    emitEventStep({
      eventName: CartWorkflowEvents.CREATED,
      data: {
        id: cart.id,
      },
    })

    return new WorkflowResponse(cart)
  }
)

export default createCartWithoutPromotionsWorkflow
