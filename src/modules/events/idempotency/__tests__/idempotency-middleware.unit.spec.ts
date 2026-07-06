import { withIdempotency } from "../idempotencyMiddleware"
import type { IdempotencyStore } from "../IdempotencyStore"
import type { EventEnvelope } from "../../envelope"

const createMockStore = () => {
  const mock: jest.Mocked<IdempotencyStore> = {
    claim: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
    isProcessed: jest.fn(),
    releaseStaleClaims: jest.fn(),
    cleanup: jest.fn(),
  }
  return mock
}

const createEnvelope = (overrides: Partial<EventEnvelope> = {}): EventEnvelope => ({
  spec: "tourism-events/v1",
  id: "evt_001",
  type: "identity",
  aggregateType: "user",
  action: "created",
  version: 1,
  timestamp: new Date().toISOString(),
  source: "keycloak",
  metadata: { correlationId: "corr_001", causationId: "cause_001" },
  payload: {},
  ...overrides,
})

describe("withIdempotency", () => {
  let store: jest.Mocked<IdempotencyStore>

  beforeEach(() => {
    store = createMockStore()
  })

  it("claims, runs handler, and completes when claim succeeds", async () => {
    const handler = jest.fn().mockResolvedValue("ok")
    const wrapped = withIdempotency(handler, store, "test-consumer")
    store.claim.mockResolvedValue(true)

    const envelope = createEnvelope()
    const result = await wrapped(envelope, {})

    expect(result).toBe("ok")
    expect(store.claim).toHaveBeenCalledWith("evt_001", "test-consumer", 5)
    expect(handler).toHaveBeenCalledWith(envelope, {})
    expect(store.complete).toHaveBeenCalledWith("evt_001", "test-consumer")
    expect(store.fail).not.toHaveBeenCalled()
  })

  it("calls fail and re-throws when handler throws", async () => {
    const error = new Error("processing failed")
    const handler = jest.fn().mockRejectedValue(error)
    const wrapped = withIdempotency(handler, store, "test-consumer")
    store.claim.mockResolvedValue(true)

    const envelope = createEnvelope()
    await expect(wrapped(envelope, {})).rejects.toThrow("processing failed")

    expect(store.fail).toHaveBeenCalledWith("evt_001", "test-consumer", "processing failed")
    expect(store.complete).not.toHaveBeenCalled()
  })

  it("returns undefined when already processed", async () => {
    const handler = jest.fn()
    const wrapped = withIdempotency(handler, store, "test-consumer")
    store.claim.mockResolvedValue(false)
    store.isProcessed.mockResolvedValue(true)

    const envelope = createEnvelope()
    const result = await wrapped(envelope, {})

    expect(result).toBeUndefined()
    expect(handler).not.toHaveBeenCalled()
    expect(store.complete).not.toHaveBeenCalled()
    expect(store.fail).not.toHaveBeenCalled()
  })

  it("throws when claimed by another instance", async () => {
    const handler = jest.fn()
    const wrapped = withIdempotency(handler, store, "test-consumer")
    store.claim.mockResolvedValue(false)
    store.isProcessed.mockResolvedValue(false)

    const envelope = createEnvelope()
    await expect(wrapped(envelope, {})).rejects.toThrow(
      "Event evt_001 is already claimed by another consumer instance (consumer: test-consumer)"
    )

    expect(handler).not.toHaveBeenCalled()
    expect(store.complete).not.toHaveBeenCalled()
  })

  it("passes custom staleLockMinutes from options", async () => {
    const handler = jest.fn().mockResolvedValue("ok")
    const wrapped = withIdempotency(handler, store, "test-consumer", { staleLockMinutes: 10 })
    store.claim.mockResolvedValue(true)

    await wrapped(createEnvelope(), {})

    expect(store.claim).toHaveBeenCalledWith("evt_001", "test-consumer", 10)
  })

  it("handles non-Error throw in fail callback", async () => {
    const handler = jest.fn().mockRejectedValue("string error")
    const wrapped = withIdempotency(handler, store, "test-consumer")
    store.claim.mockResolvedValue(true)

    const envelope = createEnvelope()
    await expect(wrapped(envelope, {})).rejects.toBe("string error")

    expect(store.fail).toHaveBeenCalledWith("evt_001", "test-consumer", "string error")
  })
})
