import { extractText } from "./parserRichText"

export type PackageSyncEventData = {
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
    destinos: { name: string }[]
    difficulty: string
  }
}

export function buildPackageCreateInput(eventData: PackageSyncEventData) {
  return {
    title: eventData.data.destination,
    slug: eventData.slug,
    destination: eventData.data.destination,
    description: extractText(eventData.data.description.root),
    duration_days: eventData.data.duration_days,
    max_capacity: typeof eventData.data.max_capacity === "number" ? eventData.data.max_capacity : 20,
    thumbnail: eventData.data.thumbnail,
    prices: {
      adult: eventData.data.price,
      child: 0,
      infant: 0,
      currency_code: "usd",
    },
    metadata: {
      payloadId: `${eventData.id}package`,
      difficulty: eventData.data.difficulty,
      destinos: eventData.data.destinos.map((d) => d.name),
      origin: eventData.data.destinos.map((d) => d.name).join(", "),
    },
  }
}
