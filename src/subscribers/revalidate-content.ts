import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../modules/tour"
import { PACKAGE_MODULE } from "../modules/package"

const NEXTJS_REVALIDATE_URL = process.env.NEXTJS_REVALIDATE_URL || 'http://localhost:4000/api/revalidate'
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET_TOKEN || 'your-secret-token'

/**
 * Función utilitaria para enviar solicitudes de revalidación a Next.js
 */
async function sendRevalidationRequest(logger: any, paths: string[], tags: string[] = []) {
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
    logger.info(`Revalidación confirmada por Next.js: ${JSON.stringify(data)}`)
    return data
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    logger.error(`Error al solicitar revalidación a Next.js: ${errorMessage}`)
    // No lanzamos el error para evitar interrumpir el flujo de Medusa
    return null
  }
}

export default async function revalidateEntityHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const { id } = event.data

  // Resolvemos el servicio de tour o package según el evento
  let entityPath = ''
  let slug = ''
  let status = ''
  let hasCategorias = false
  let hasDestinos = false

  try {
    if (event.name.startsWith('entityTour')) {
      const tourService = container.resolve(TOUR_MODULE)
      const tour = await tourService.retrieveTour(id, {
        relations: ['categorias', 'destinos'] // Ajusta esto según tus relaciones en Medusa
      })

      entityPath = '/tours'
      slug = tour.slug

    } else if (event.name.startsWith('entityPackage')) {
      const packageService = container.resolve(PACKAGE_MODULE)
      const pkg = await packageService.retrievePackage(id, {
        relations: ['', 'destinos'] // Ajusta esto según tus relaciones
      })

      entityPath = '/packages'
      slug = pkg.slug
    }

    const pathsToRevalidate: string[] = []
    const tagsToRevalidate = [`${entityPath.substring(1)}-sitemap`, entityPath.substring(1)] // ej: tours-sitemap, tours

    // Lógica similar a tu Payload CMS, adaptada a Medusa
    const isDeleted = event.name.endsWith('deleted')

    if (isDeleted) {
      pathsToRevalidate.push(`${entityPath}/${slug}`)
      pathsToRevalidate.push(entityPath)
    } else {
      // Created o Updated
      if (true) {
        pathsToRevalidate.push(`${entityPath}/${slug}`)
        pathsToRevalidate.push(entityPath)
      }
    }

    if (pathsToRevalidate.length > 0) {
      // Como tu ejemplo de Payload ponía "/pe" + ele
      const prefixedPaths = pathsToRevalidate.map(ele => "/pe" + ele)
      await sendRevalidationRequest(logger, prefixedPaths, tagsToRevalidate)
    }

  } catch (err) {
    logger.error(`Error procesando la revalidación para el evento ${event.name}: ${err}`)
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
