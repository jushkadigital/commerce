import { extractText } from "./parserRichText"

export type TourSyncEventData = {
  id: string
  data: {
    destination: string
    description: {
      root: unknown
    }
    duration_days: number
    max_capacity: number
    thumbnail?: string
    price?: number
  }
}

export function buildTourCreateInput(eventData: TourSyncEventData) {
  return {
    destination: eventData.data.destination,
    description: extractText(eventData.data.description.root),
    duration_days: eventData.data.duration_days,
    max_capacity: eventData.data.max_capacity,
    thumbnail: eventData.data.thumbnail,
    metadata: {
      payloadId: `${eventData.id}tour`,
    },
    prices: {
      adult: eventData.data.price ?? 0,
      child: 0,
      infant: 0,
      currency_code: "pen",
    },
  }
}
