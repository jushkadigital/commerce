import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../modules/tour"
import { PACKAGE_MODULE } from "../modules/package"

const NEXTJS_REVALIDATE_URL = process.env.NEXTJS_REVALIDATE_URL || 'http://localhost:4000/api/revalidate'
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET_TOKEN || 'your-secret-token'

/**
 * Función utilitaria para enviar solicitudes de revalidación a Next.js
 */
async function sendRevalidationRequest(_logger: any, paths: string[], tags: string[] = []) {
  try {
    const response = await fetch(NEXTJS_REVALIDATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paths, tags, secret: REVALIDATE_SECRET })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Error HTTP ${response.status}: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    return data
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return null
  }
}

export default async function revalidateEntityHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const { id } = event.data

  let entityPath = ''
  let slug = ''
  let status = ''
  let hasCategorias = false
  let hasDestinos = false

  try {
    if (event.name.startsWith('entityTour')) {
      const tourService = container.resolve(TOUR_MODULE)
      const tour = await tourService.retrieveTour(id, {
        relations: ['categorias', 'destinos']
      })

      entityPath = '/tours'
      slug = tour.slug

    } else if (event.name.startsWith('entityPackage')) {
      const packageService = container.resolve(PACKAGE_MODULE)
      const pkg = await packageService.retrievePackage(id, {
        relations: ['', 'destinos']
      })

      entityPath = '/packages'
      slug = pkg.slug
    }

    const pathsToRevalidate: string[] = []
    const tagsToRevalidate = [`${entityPath.substring(1)}-sitemap`, entityPath.substring(1)]

    const isDeleted = event.name.endsWith('deleted')

    if (isDeleted) {
      pathsToRevalidate.push(`${entityPath}/${slug}`)
      pathsToRevalidate.push(entityPath)
    } else {
      if (true) {
        pathsToRevalidate.push(`${entityPath}/${slug}`)
        pathsToRevalidate.push(entityPath)
      }
    }

    if (pathsToRevalidate.length > 0) {
      const prefixedPaths = pathsToRevalidate.map(ele => "/pe" + ele)
      await sendRevalidationRequest(null, prefixedPaths, tagsToRevalidate)
    }

  } catch (err) {
  }
}

export const config: SubscriberConfig = {
  event: [
    "entityTour.created",
    "entityTour.updated",
    "entityTour.deleted",
    "entityPackage.created",
    "entityPackage.updated",
    "entityPackage.deleted",
  ],
}