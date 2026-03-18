import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { PACKAGE_MODULE } from "../../modules/package"
import type PackageModuleService from "../../modules/package/service"
import { TOUR_MODULE } from "../../modules/tour"
import type TourModuleService from "../../modules/tour/service"
import { buildSlugBase } from "../../utils/slug"

type SlugEntity = "tour" | "package"

export type GenerateSlugStepInput = {
  entity: SlugEntity
  destination: string
  duration_days: number
}

async function findUniqueSlug(params: {
  listFn: (filters: { slug: string }, config: { take: number }) => Promise<unknown[]>
  base: string
}): Promise<string> {
  const normalize = (s: string) => s || ""

  let candidate = normalize(params.base)
  if (!candidate) {
    candidate = "item"
  }

  for (let i = 0; i < 1000; i++) {
    const slug = i === 0 ? candidate : `${candidate}-${i}`
    const existing = await params.listFn({ slug }, { take: 1 })
    if (!existing?.length) {
      return slug
    }
  }

  return `${candidate}-${Date.now()}`
}

export const generateSlugStep = createStep(
  "generate-slug-step",
  async (input: GenerateSlugStepInput, { container }) => {
    const base = buildSlugBase({
      destination: input.destination,
      durationDays: input.duration_days,
    })

    if (input.entity === "tour") {
      const tourService: TourModuleService = container.resolve(TOUR_MODULE)
      const slug = await findUniqueSlug({
        base,
        listFn: (filters, config) => tourService.listTours(filters, config),
      })
      return new StepResponse({ slug })
    }

    const packageService: PackageModuleService = container.resolve(PACKAGE_MODULE)
    const slug = await findUniqueSlug({
      base,
      listFn: (filters, config) => packageService.listPackages(filters, config),
    })

    return new StepResponse({ slug })
  }
)
