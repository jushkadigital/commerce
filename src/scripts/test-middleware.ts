import { ExecArgs } from "@medusajs/framework/types"

export default async function testMiddleware({ container }: ExecArgs) {
  // Just print that we need to test via curl
  console.log("Use curl to test")
}
