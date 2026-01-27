import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../../../modules/tour-booking"
import TourModuleService from "../../../modules/tour-booking/service"

/**
 * GET /admin/tour-orders
 * List orders that contain tour products
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)

    // Get all bookings and extract unique order IDs
    const allBookings = await tourModuleService.listTourBookings(
      {},
      { relations: ["tour", "tour_variant"] }
    )

    const orderIds = [...new Set(
      allBookings
        .map((b: any) => b.order_id)
        .filter((id: string) => id)
    )]

    if (orderIds.length === 0) {
      return res.json({ orders: [], count: 0 })
    }

    const orderModule = req.scope.resolve(Modules.ORDER)
    const enrichedOrders: any[] = []

    // Fetch each order with details
    for (const orderId of orderIds) {
      try {
        const order: any = await orderModule.retrieveOrder(orderId, {
          relations: ["items", "customer"],
        })

        // Get bookings for this order
        const orderBookings = allBookings.filter((b: any) => b.order_id === orderId)

        // Extract tour items from line items metadata
        const tourItems = (order.items || [])
          .filter((item: any) => item.metadata?.tour_id)
          .map((item: any) => ({
            id: item.id,
            tour_id: item.metadata.tour_id,
            tour_destination: item.metadata.tour_destination,
            tour_date: item.metadata.tour_date,
            passenger_name: item.metadata.passenger_name,
            passenger_type: item.metadata.passenger_type,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
          }))

        enrichedOrders.push({
          id: order.id,
          display_id: order.display_id,
          status: order.status,
          created_at: order.created_at,
          updated_at: order.updated_at,
          total: order.total,
          subtotal: order.subtotal,
          currency_code: order.currency_code,
          customer: order.customer
            ? {
                id: order.customer.id,
                email: order.customer.email,
                first_name: order.customer.first_name,
                last_name: order.customer.last_name,
              }
            : null,
          tour_items: tourItems,
          bookings: orderBookings,
          total_passengers: tourItems.length,
          tours_count: new Set(tourItems.map((i: any) => i.tour_id)).size,
        })
      } catch (error) {
        console.error(`Error fetching order ${orderId}:`, error)
      }
    }

    res.json({
      orders: enrichedOrders,
      count: enrichedOrders.length,
    })
  } catch (error) {
    console.error("Error fetching tour orders:", error)
    res.status(500).json({
      message: "Failed to fetch tour orders",
      error: error.message,
    })
  }
}
