import {
  Input,
  Label,
  Text,
  Heading,
  Container,
  Badge,
} from "@medusajs/ui"

export interface CurrencyRegionCombination {
  currency: string
  region_id?: string
  region_name?: string
  is_store_currency: boolean
}

export const PASSENGER_TYPES = ["adult", "child", "infant"]

interface PricingStepProps {
  currencyRegionCombinations: CurrencyRegionCombination[]
  prices: Record<string, Record<string, number>>
  setPrices: (prices: any) => void
}

export const PricingStep = ({
  currencyRegionCombinations,
  prices,
  setPrices
}: PricingStepProps) => {

  // Función base para actualizar un precio específico en el estado
  const setPriceInState = (passengerType: string, key: string, amount: number) => {
    setPrices((prev: any) => ({
      ...prev,
      [passengerType]: {
        ...prev?.[passengerType],
        [key]: amount
      }
    }))
  }

  // LOGICA MAGICA: Actualiza la Región Y la Tienda al mismo tiempo
  const handlePriceChange = (passengerType: string, combo: CurrencyRegionCombination, amount: number) => {
    // 1. Actualizamos el precio que el usuario está viendo (Ej. PEN Región Perú)
    const regionKey = `${combo.currency}_${combo.region_id}`
    setPriceInState(passengerType, regionKey, amount)

    // 2. Buscamos y actualizamos automáticamente el precio "Default" de esa misma moneda (Ej. PEN Store)
    // Esto asegura que si no hay región específica, se use este precio como fallback.
    const storeKey = `${combo.currency}_store`
    setPriceInState(passengerType, storeKey, amount)
  }

  const getPassengerColor = (type: string): "orange" | "blue" | "grey" => {
    switch (type) {
      case "adult": return "blue"
      case "child": return "orange"
      case "infant": return "grey"
      default: return "grey"
    }
  }

  const getCurrencySymbol = (code: string) => {
    switch (code.toLowerCase()) {
      case 'usd': return '$'
      case 'eur': return '€'
      case 'pen': return 'S/'
      default: return code.toUpperCase()
    }
  }

  // FILTRO VISUAL:
  // Solo mostramos las combinaciones que tienen región (ocultamos los _store defaults)
  // Así reducimos los 4 inputs a solo 2 (o los que tengas por región).
  const visibleCombinations = currencyRegionCombinations.filter(c => !c.is_store_currency)

  return (
    <div className="space-y-6">
      <div>
        <Heading level="h3">Precios por Pasajero</Heading>
        <Text className="text-ui-fg-subtle">
          Define los precios. Los valores se aplicarán automáticamente a la tienda por defecto.
        </Text>
      </div>

      <div className="space-y-4">
        {PASSENGER_TYPES.map((type) => (
          <Container key={type} className="p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-ui-border-base pb-2">
              <Badge color={getPassengerColor(type)} className="capitalize">
                {type}
              </Badge>
            </div>

            {/* Grid de 2 columnas para Nacional vs Internacional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleCombinations.map((combo) => {
                // Generamos la key para leer el valor actual
                const key = `${combo.currency}_${combo.region_id}`
                const currentVal = prices?.[type]?.[key]

                // Etiqueta amigable
                const label = combo.currency === 'pen' ? 'Nacional (PEN)' : 'Internacional (USD)'

                return (
                  <div key={key}>
                    <Label htmlFor={`${type}-${key}`} className="text-small font-medium mb-1.5 block text-ui-fg-base">
                      {label} <span className="text-ui-fg-subtle text-xs font-normal">({combo.region_name})</span>
                    </Label>

                    <div className="relative">
                      <div className="absolute left-3 top-2.5 text-ui-fg-muted text-small pointer-events-none">
                        {getCurrencySymbol(combo.currency)}
                      </div>
                      <Input
                        id={`${type}-${key}`}
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-8"
                        disabled={combo.currency !== 'pen'}
                        value={currentVal || ""}
                        onChange={(e) => {
                          const val = e.target.value
                          const amount = val === "" ? 0 : parseFloat(val)
                          // Usamos la nueva función inteligente
                          handlePriceChange(type, combo, amount)
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Container>
        ))}
      </div>
    </div>
  )
}
