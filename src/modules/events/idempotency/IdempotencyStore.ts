export type ClaimStatus = "claimed" | "processed" | "failed"

export interface IdempotencyStore {
  claim(
    eventId: string,
    consumerId: string,
    staleLockMinutes: number
  ): Promise<boolean>
  complete(eventId: string, consumerId: string): Promise<void>
  fail(eventId: string, consumerId: string, error: string): Promise<void>
  isProcessed(eventId: string, consumerId: string): Promise<boolean>
  releaseStaleClaims(
    consumerId: string,
    staleLockMinutes: number
  ): Promise<number>
  cleanup(olderThanDays: number): Promise<number>
}
