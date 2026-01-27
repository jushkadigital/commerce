import React, { useState, useEffect, useMemo } from "react"
import { Button, FocusModal, ProgressTabs, toast } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"
import { TourDetailsStep } from "./tour-details-step"
import { PricingStep, CurrencyRegionCombination } from "./pricing-step"
import { Tour } from "../types" // Asegúrate de que este import sea correcto

interface TourFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<void>
  // Hacemos onUpdated opcional por si acaso, o lo requerimos si siempre se pasa
  onUpdated?: (data: any) => Promise<void>
  tourToEdit?: Tour | null
}

export const TourFormModal = ({
  open,
  onOpenChange,
  onSubmit,
  onUpdated,
  tourToEdit
}: TourFormModalProps) => {
  const isEditMode = !!tourToEdit
  const [currentStep, setCurrentStep] = useState("0")
  const [isLoading, setIsLoading] = useState(false)

  // --- Step 1 Data ---
  const [destination, setDestination] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState<number | "">("")
  const [capacity, setCapacity] = useState<number | "">("")
  const [availableDates, setAvailableDates] = useState<string[]>([])

  // --- Step 2 Data ---
  // CORRECCIÓN 1: Inicializar como objeto vacío, NO null
  const [prices, setPrices] = useState<Record<string, Record<string, number>>>({})

  // --- Queries ---
  const { data: regionsData } = useQuery({
    queryKey: ["regions"],
    queryFn: () => sdk.admin.region.list()
  })
  const { data: storesData } = useQuery({
    queryKey: ["stores"],
    queryFn: () => sdk.admin.store.list()
  })

  const regions = regionsData?.regions || []
  const stores = storesData?.stores || []

  // --- Lógica de Combinaciones de Moneda ---
  const currencyRegionCombinations = useMemo(() => {
    const combinations: Array<CurrencyRegionCombination> = []

    // Regiones
    regions.forEach((region: any) => {
      combinations.push({
        currency: region.currency_code,
        region_id: region.id,
        region_name: region.name,
        is_store_currency: false
      })
    })

    // Tiendas (CORRECCIÓN 2: Descomentar y arreglar lógica)
    stores.forEach((store) => {
      store.supported_currencies.forEach((currency) => {
        combinations.push({
          currency: currency.currency_code,
          region_id: undefined,
          is_store_currency: true
        })
      })
    })

    return combinations
  }, [regions, stores])

  // --- EFECTO: Cargar datos al abrir (CORREGIDO) ---
  useEffect(() => {
    if (open && tourToEdit) {
      // 1. Llenar datos planos (Igual que antes)
      setDestination(tourToEdit.destination || "")
      setDescription(tourToEdit.description || "")
      setDuration(tourToEdit.duration_days)
      setCapacity(tourToEdit.max_capacity)
      setAvailableDates(tourToEdit.available_dates || [])

      // 2. LÓGICA DE PRECIOS CORREGIDA
      if (tourToEdit.variants && tourToEdit.variants.length > 0) {

        const mappedPrices: Record<string, Record<string, number>> = {}

        // Recorremos cada variante (Adult, Child, Infant)
        tourToEdit.variants.forEach((v: any) => {
          // Normalizamos el tipo a minúsculas para que coincida con PASSENGER_TYPES ["adult", ...]
          const typeKey = v.passenger_type.toLowerCase()

          if (!mappedPrices[typeKey]) mappedPrices[typeKey] = {}

          // Accedemos a los precios reales en Medusa
          const pricesList = v.product_variant?.price_set?.prices || []

          pricesList.forEach((price: any) => {
            const currency = price.currency_code.toLowerCase()

            // CASO A: Asignar a Tienda (Store Default)
            // Siempre asignamos esto para tener un fallback
            mappedPrices[typeKey][`${currency}_store`] = price.amount

            // CASO B: Asignar a Región
            // Buscamos si alguna de las regiones activas usa esta moneda
            const regionMatch = regions.find((r: any) => r.currency_code === currency)

            if (regionMatch) {
              // Si encontramos una región (ej. Peru usa PEN), asignamos el valor a la clave de región
              // Esto hará que el input visual "Nacional (PEN)" se llene correctamente
              const regionKey = `${currency}_${regionMatch.id}`
              mappedPrices[typeKey][regionKey] = price.amount
            }
          })
        })

        console.log("Precios Mapeados Correctamente:", mappedPrices) // Para depurar
        setPrices(mappedPrices)

      } else {
        // Si no hay variantes, iniciamos vacío
        setPrices({})
      }

    } else if (open && !tourToEdit) {
      // MODO CREACIÓN
      resetForm()
    }
  }, [open, tourToEdit, regions]) // Agregamos 'regions' a dependencias

  // --- EFECTO: Cargar datos ---
  const resetForm = () => {
    setDestination("")
    setDescription("")
    setDuration("")
    setCapacity("")
    setAvailableDates([])
    setPrices({}) // Resetear a objeto vacío
    setCurrentStep("0")
  }

  const handleCloseModal = (isOpen: boolean) => {
    if (!isOpen) resetForm()
    onOpenChange(isOpen)
  }

  const handleStep1Next = () => {
    if (!destination) { toast.error("Destination required"); return }
    setCurrentStep("1")
  }

  const handleFinalSubmit = async () => {
    setIsLoading(true)
    try {
      const defaultCurrency = stores[0]?.default_currency_code || "pen"
      // La clave que usa el PricingStep incluye "_store"
      const priceKey = `${defaultCurrency}_store`

      // Payload base
      const payload: any = {
        destination,
        description,
        duration_days: Number(duration),
        max_capacity: Number(capacity),
        available_dates: availableDates,
        prices: {
          // CORRECCIÓN 4: Acceso seguro con ?. y usando la clave correcta
          // Nota: Usa mayúscula "Adult" si así está en tu PricingStep (PASSENGER_TYPES)
          adult: prices["Adult"]?.[priceKey] || prices["adult"]?.[priceKey] || 0,
          child: prices["Child"]?.[priceKey] || prices["child"]?.[priceKey] || 0,
          infant: prices["Infant"]?.[priceKey] || prices["infant"]?.[priceKey] || 0,
          currency_code: defaultCurrency
        },
      }

      if (isEditMode && onUpdated) {
        // Agregamos ID solo para update
        await onUpdated({ id: tourToEdit!.id, ...payload })
      } else {
        await onSubmit(payload)
      }

      handleCloseModal(false)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to save tour")
    } finally {
      setIsLoading(false)
    }
  }

  const isStep1Completed = destination && duration && capacity

  const steps = [
    {
      label: "Details",
      value: "0",
      content: (
        <TourDetailsStep
          destination={destination} setDestination={setDestination}
          description={description} setDescription={setDescription}
          duration={duration} setDuration={setDuration}
          capacity={capacity} setCapacity={setCapacity}
          availableDates={availableDates} setAvailableDates={setAvailableDates}
        // Si deseas bloquear edición en el paso 1, descomenta esto:
        // isReadOnly={isEditMode} 
        />
      )
    },
    {
      label: "Pricing",
      value: "1",
      content: (
        <PricingStep
          currencyRegionCombinations={currencyRegionCombinations}
          prices={prices} setPrices={setPrices}
        />
      )
    }
  ]

  return (
    <FocusModal open={open} onOpenChange={handleCloseModal}>
      <FocusModal.Content>
        <FocusModal.Header>
          <span className="font-semibold">
            {isEditMode ? "Edit Tour" : "Create Tour"}
          </span>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col p-6 overflow-y-auto">
          <ProgressTabs value={currentStep} onValueChange={setCurrentStep}>
            <ProgressTabs.List>
              {steps.map(s => <ProgressTabs.Trigger key={s.value} value={s.value}>{s.label}</ProgressTabs.Trigger>)}
            </ProgressTabs.List>
            {steps.map(s => <ProgressTabs.Content key={s.value} value={s.value} className="mt-6">{s.content}</ProgressTabs.Content>)}
          </ProgressTabs>
        </FocusModal.Body>
        <FocusModal.Footer>
          <Button variant="secondary" onClick={() => setCurrentStep("0")} disabled={currentStep === "0"}>Previous</Button>
          {currentStep === "0" ? (
            <Button onClick={handleStep1Next}>Next</Button>
          ) : (
            <Button onClick={handleFinalSubmit} isLoading={isLoading}>
              {isEditMode ? "Save Changes" : "Create Tour"}
            </Button>
          )}
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}
