import {
  deleteLineItemsWorkflowId,
  updateLineItemInCartWorkflowId,
} from "@medusajs/core-flows"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AdditionalData, HttpTypes } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, remoteQueryObjectFromString } from "@medusajs/framework/utils"
import { refetchCart } from "../../helpers"
import { z } from "zod"

export const CartSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
  }))
})
export type CartSchemaType = z.infer<typeof CartSchema>
export const POST = async (
  req: MedusaRequest<CartSchemaType>,
  res: MedusaResponse<HttpTypes.StoreLineItemDeleteResponse>
) => {
  const { items } = req.validatedBody
  console.log(items)
  const we = req.scope.resolve(Modules.WORKFLOW_ENGINE)
  await we.run(deleteLineItemsWorkflowId, {
    input: {
      cart_id: req.params.id,
      ids: items.map(ele => ele.id),
    },
  })

  /**const cart = await refetchCart(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )
  **/
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const query = remoteQueryObjectFromString({
    entryPoint: "cart",
    variables: {
      filters: { id: req.params.id },
    },
    // Usamos los campos que ya pedía tu configuración, o defines los tuyos
    fields: req.queryConfig.fields,
  })

  const [cart] = await remoteQuery(query)

  res.status(200).json({
    id: req.params.id,
    object: "line-item",
    deleted: true,
    parent: cart,
  })
}
