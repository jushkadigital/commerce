declare module "jsonwebtoken" {
  export type JwtPayload = Record<string, unknown>

  export type DecodeOptions = {
    json?: boolean
    complete?: boolean
  } & Record<string, unknown>

  export type DecodedComplete = {
    header: Record<string, unknown>
    payload: string | JwtPayload
    signature: string
  }

  export function sign(
    payload: string | Buffer | Record<string, unknown>,
    secret: string,
    options?: Record<string, unknown>
  ): string

  export function decode(
    token: string,
    options?: DecodeOptions
  ): null | string | JwtPayload | DecodedComplete

  export function verify(
    token: string,
    secret: string,
    options?: Record<string, unknown>
  ): string | JwtPayload
}
