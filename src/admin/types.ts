export interface Tour {
  id: string
  destination: string
  description?: string
  duration_days: number
  max_capacity: number
  thumbnail?: string
  available_dates: string[]
  product_id?: string
  created_at: string
}


export interface Booking {
  type: string
  fecha?: string
  items: any[]
}
