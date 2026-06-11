import { extractText } from "./parserRichText"

export type TourSyncEventData = {
  id: number
  slug: string
  data: {
    destination: string
    description: { root: unknown }
    duration_days: number
    max_capacity?: number
    thumbnail: string
    completeThumbnail?: { large?: string; medium?: string }
    price: number
    categories: { name: string }[]
    destinos: { name: string }
    difficulty: string
  }
}

export function buildTourCreateInput(eventData: TourSyncEventData) {
  const data = eventData.data || {} as any
  const destinos = data.destinos || { name: "" }
  const categories = Array.isArray(data.categories) ? data.categories : []
  const descriptionRoot = data.description?.root
  const description = descriptionRoot ? extractText(descriptionRoot) : (data.destination || "")

  return {
    title: data.destination || "Untitled Tour",
    slug: eventData.slug || "",
    destination: data.destination,
    description,
    duration_days: typeof data.duration_days === "number" ? data.duration_days : 1,
    max_capacity: typeof data.max_capacity === "number" ? data.max_capacity : 20,
    thumbnail: data.thumbnail || "",
    prices: {
      adult: typeof data.price === "number" ? data.price : 0,
      child: 0,
      infant: 0,
      currency_code: "usd",
    },
    metadata: {
      payloadId: `${eventData.id}tour`,
      difficulty: data.difficulty || "",
      categories: categories.map((c: { name: string }) => c.name),
      origin: destinos.name || "",
    },
  }
}
