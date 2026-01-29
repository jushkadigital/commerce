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
  available_dates: string[]
  product_id?: string
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
