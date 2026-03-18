export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function buildSlugBase(params: { destination: string; durationDays: number }): string {
  const base = `${params.destination}-${params.durationDays}-days`
  return slugify(base)
}
