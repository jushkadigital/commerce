export interface ConsumerBinding {
  name: string
  routingKeys: string[]
  queueType?: "quorum" | "classic"
  prefetch?: number
  maxRetries?: number
  retryDelayMs?: number
}

export interface ExchangeConfig {
  name: string
  type: "topic" | "direct" | "fanout"
  durable: boolean
}

export interface TopologyConfig {
  exchanges: ExchangeConfig[]
  consumers: ConsumerBinding[]
}

export const DEFAULT_TOPOLOGY_CONFIG: TopologyConfig = {
  exchanges: [
    // Main exchanges (channel separation — PRACTICE 20)
    { name: "tourism.integration", type: "topic", durable: true },
    { name: "tourism.notification", type: "topic", durable: true },
    { name: "tourism.inbound", type: "topic", durable: true },
    { name: "identity.events", type: "topic", durable: true },
    // Retry exchanges (one per main exchange)
    { name: "tourism.integration.retry", type: "direct", durable: true },
    { name: "tourism.notification.retry", type: "direct", durable: true },
    { name: "tourism.inbound.retry", type: "direct", durable: true },
    { name: "identity.events.retry", type: "direct", durable: true },
    // DLQ exchanges (one per main exchange)
    { name: "tourism.integration.dlx", type: "direct", durable: true },
    { name: "tourism.notification.dlx", type: "direct", durable: true },
    { name: "tourism.inbound.dlx", type: "direct", durable: true },
    { name: "identity.events.dlx", type: "fanout", durable: true },
  ],
  consumers: [
    {
      name: "product",
      routingKeys: ["integration.product.#"],
      queueType: "quorum",
      prefetch: 10,
      maxRetries: 3,
      retryDelayMs: 30000,
    },
    {
      name: "booking",
      routingKeys: ["integration.booking.#"],
      queueType: "quorum",
      prefetch: 5,
      maxRetries: 3,
      retryDelayMs: 30000,
    },
    {
      name: "order",
      routingKeys: ["integration.order.#"],
      queueType: "quorum",
      prefetch: 10,
      maxRetries: 3,
      retryDelayMs: 30000,
    },
    {
      name: "tour",
      routingKeys: ["integration.tour.#"],
      queueType: "quorum",
      prefetch: 5,
      maxRetries: 3,
      retryDelayMs: 30000,
    },
    {
      name: "package",
      routingKeys: ["integration.package.#"],
      queueType: "quorum",
      prefetch: 5,
      maxRetries: 3,
      retryDelayMs: 30000,
    },
    {
      name: "email",
      routingKeys: ["notification.#"],
      queueType: "quorum",
      prefetch: 20,
      maxRetries: 3,
      retryDelayMs: 60000,
    },
    {
      name: "inbound",
      routingKeys: ["inbound.#"],
      queueType: "classic",
      prefetch: 10,
      maxRetries: 3,
      retryDelayMs: 15000,
    },
    {
      name: "identity",
      routingKeys: ["identity.user.#"],
      queueType: "quorum",
      prefetch: 5,
      maxRetries: 3,
      retryDelayMs: 30000,
    },
  ],
}
