import { z } from "zod"

const EventEnvelopeBase = z.object({
  eventType: z.string(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  correlationId: z.string(),
  causationId: z.string().nullable(),
  traceId: z.string(),
  spanId: z.string(),
  producer: z.string(),
  actorId: z.string().nullable(),
  tenantId: z.string().nullable(),
  specVersion: z.string(),
  eventVersion: z.number(),
  eventId: z.string(),
  occurredOn: z.string(),
})

export const IdentityUserCreatedV1Schema = EventEnvelopeBase.extend({
  email: z.string().email(),
  userType: z.enum(["PASSENGER", "ADMIN"]),
  clientRoles: z.array(z.enum(["basic", "standard", "premium", "editor", "admin", "super-admin"])),
})

export type IdentityUserCreatedV1Payload = z.infer<typeof IdentityUserCreatedV1Schema>

export const IdentityUserDeletedV1Schema = EventEnvelopeBase.extend({
  email: z.string().email(),
  userType: z.enum(["PASSENGER", "ADMIN"]),
})

export type IdentityUserDeletedV1Payload = z.infer<typeof IdentityUserDeletedV1Schema>

export const NormalizedIdentityUserCreatedSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  userType: z.enum(["PASSENGER", "ADMIN"]),
  role: z.string().optional(),
  clientRoles: z.array(z.enum(["basic", "standard", "premium", "editor", "admin", "super-admin"])),
})

export type NormalizedIdentityUserCreatedPayload = z.infer<typeof NormalizedIdentityUserCreatedSchema>

export const NormalizedIdentityUserDeletedSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  userType: z.enum(["PASSENGER", "ADMIN"]),
})

export type NormalizedIdentityUserDeletedPayload = z.infer<typeof NormalizedIdentityUserDeletedSchema>
