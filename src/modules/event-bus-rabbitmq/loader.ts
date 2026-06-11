import { asValue } from "@medusajs/framework/awilix"
import type { EventBusRabbitMQModuleOptions } from "./service"

export default async function loader({
  container,
  options,
}: {
  container: any
  options: EventBusRabbitMQModuleOptions
}) {
  container.register({
    eventBusRabbitMqUrl: asValue(options.rabbitmqUrl),
    eventBusRabbitMqQueuePrefix: asValue(options.queuePrefix ?? "medusa"),
    eventBusRabbitMqPrefetch: asValue(options.prefetch ?? 100),
    eventBusRabbitMqMaxRetries: asValue(options.maxRetries ?? 3),
    eventBusRabbitMqRetryDelayMs: asValue(options.retryDelayMs ?? 30000),
  })
}
