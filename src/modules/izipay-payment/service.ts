import { AbstractPaymentProvider } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { PaymentSessionStatus } from "@medusajs/framework/utils"

type IzipayOptions = {
  merchantCode: string
  publicKey: string
  hashKey: string
  apiEndpoint: string
  sdkUrl: string
}

type InjectedDependencies = {
  logger: Logger
}

class IzipayPaymentProviderService extends AbstractPaymentProvider<IzipayOptions> {
  static identifier = "izipay"

  protected logger_: Logger
  protected options_: IzipayOptions

  constructor(container: InjectedDependencies, options: IzipayOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options

    // Debug: log options received
    this.logger_.info(`[Izipay] Provider initialized with options: ${JSON.stringify({
      merchantCode: options.merchantCode,
      publicKey: options.publicKey,
      hashKey: options.hashKey,
      apiEndpoint: options.apiEndpoint,
      sdkUrl: options.sdkUrl,
    })}`)
  }

  /**
   * Initiates a payment session for Izipay.
   * Returns the configuration needed by the frontend SDK.
   */
  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, context } = input

    this.logger_.info(
      `[Izipay] Initiating payment: ${amount} ${currency_code}`
    )

    // Generate a unique session ID
    const sessionId = `izipay_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Return config for the frontend SDK - no backend API call needed
    return {
      id: sessionId,
      data: {
        id: sessionId,
        // Config for Izipay SDK
        merchantCode: this.options_.merchantCode,
        publicKey: this.options_.publicKey,
        hashKey: this.options_.hashKey,
        apiEndpoint: this.options_.apiEndpoint,
        sdkUrl: this.options_.sdkUrl,
        // Payment details
        amount: amount,
        currency: currency_code,
        // Customer info
        customer_id: context?.customer?.id,
        email: context?.customer?.email,
      },
    }
  }

  /**
   * Authorizes the payment - for Izipay proxy, this is typically already done
   * when the customer completes payment on the Izipay form
   */
  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const { data } = input

    this.logger_.info(`[Izipay] Authorizing payment: ${data?.id}`)

    // For Izipay proxy, authorization happens on their side
    // We just return the current status
    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: data as Record<string, unknown>,
    }
  }

  /**
   * Captures the payment - for Izipay, capture typically happens automatically
   */
  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const { data } = input

    this.logger_.info(`[Izipay] Capturing payment: ${data?.id}`)

    // For Izipay proxy, capture is automatic
    return {
      data: data as Record<string, unknown>,
    }
  }

  /**
   * Refunds the payment
   */
  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const { data, amount } = input

    this.logger_.info(`[Izipay] Refunding payment: ${data?.id}, amount: ${amount}`)

    // If Izipay supports refunds, implement the API call here
    // For now, just return success
    return {
      data: {
        ...data as Record<string, unknown>,
        refunded_amount: amount,
      },
    }
  }

  /**
   * Cancels the payment
   */
  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    const { data } = input

    this.logger_.info(`[Izipay] Canceling payment: ${data?.id}`)

    return {
      data: data as Record<string, unknown>,
    }
  }

  /**
   * Deletes the payment session data
   */
  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    const { data } = input

    this.logger_.info(`[Izipay] Deleting payment: ${data?.id}`)

    return {
      data: data as Record<string, unknown>,
    }
  }

  /**
   * Updates the payment
   */
  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    const { data, amount, currency_code } = input

    this.logger_.info(`[Izipay] Updating payment: ${data?.id}`)

    // If amount changed, you might need to create a new Izipay session
    // For now, just update the local data
    return {
      data: {
        ...data as Record<string, unknown>,
        amount,
        currency: currency_code,
      },
    }
  }

  /**
   * Retrieves the payment from Izipay
   */
  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const { data } = input

    this.logger_.info(`[Izipay] Retrieving payment: ${data?.id}`)

    return {
      data: data as Record<string, unknown>,
    }
  }

  /**
   * Gets the payment status from Izipay
   */
  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const { data } = input

    this.logger_.info(`[Izipay] Getting payment status: ${data?.id}`)

    // Check status with Izipay if needed
    // For proxy mode, we rely on webhooks to update status
    return {
      status: (data?.status as PaymentSessionStatus) || PaymentSessionStatus.PENDING,
    }
  }

  /**
   * Handles webhook events from Izipay
   */
  async getWebhookActionAndData(payload: {
    data: Record<string, unknown>
    rawData: string | Buffer
    headers: Record<string, unknown>
  }): Promise<WebhookActionResult> {
    const { data, rawData, headers } = payload

    this.logger_.info(`[Izipay] Webhook received`)

    // Implement webhook signature verification here if Izipay provides it
    // Parse the webhook payload and return the appropriate action

    const eventType = data.eventType || data.event_type || data.type

    switch (eventType) {
      case "payment.authorized":
      case "AUTHORIZED":
        return {
          action: "authorized",
          data: {
            session_id: data.session_id as string || data.orderId as string,
            amount: data.amount as number,
          },
        }
      case "payment.captured":
      case "CAPTURED":
        return {
          action: "captured",
          data: {
            session_id: data.session_id as string || data.orderId as string,
            amount: data.amount as number,
          },
        }
      case "payment.failed":
      case "FAILED":
        return {
          action: "failed",
          data: {
            session_id: data.session_id as string || data.orderId as string,
            amount: data.amount as number,
          },
        }
      default:
        return {
          action: "not_supported",
        }
    }
  }
}

export default IzipayPaymentProviderService
