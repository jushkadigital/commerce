export interface Tour {
  id: string
  destination: string
  description?: string
  duration_days: number
  max_capacity: number
  thumbnail?: string
  product_id?: string
  is_special?: boolean
  blocked_dates?: string[]
  blocked_week_days?: string[]
  booking_min_days_ahead?: number
  cancellation_deadline_hours?: number
  metadata?: Record<string, any>
  created_at: string
  variants?: TourVariant[]
}

export interface TourVariant {
  id: string
  tour_id: string
  variant_id: string
  passenger_type: string
  product_variant?: {
    price_set?: {
      prices?: Array<{
        amount: number
        currency_code: string
      }>
    }
  }
}

export interface Booking {
  type: string
  bookingType?: "tour" | "package"
  fecha?: string
  items: any[]
}

export interface Package {
  id: string
  destination: string
  description?: string
  duration_days: number
  max_capacity: number
  thumbnail?: string
  product_id?: string
  is_special?: boolean
  blocked_dates?: string[]
  blocked_week_days?: string[]
  booking_min_days_ahead?: number
  cancellation_deadline_hours?: number
  metadata?: Record<string, any>
  created_at: string
  variants?: PackageVariant[]
}

export interface PackageVariant {
  id: string
  package_id: string
  variant_id: string
  passenger_type: string
  product_variant?: {
    price_set?: {
      prices?: Array<{
        amount: number
        currency_code: string
      }>
    }
  }
}
