import { useState, useEffect, useMemo } from "react"
import { Button, FocusModal, ProgressTabs, toast } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"
import { PackageDetailsStep } from "./package-details-step"
import { PricingStep, CurrencyRegionCombination } from "./pricing-step"
import { Package } from "../types"

interface PackageFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<void>
  onUpdated?: (data: any) => Promise<void>
  packageToEdit?: Package | null
}

export const PackageFormModal = ({
  open,
  onOpenChange,
  onSubmit,
  onUpdated,
  packageToEdit
}: PackageFormModalProps) => {
  const isEditMode = !!packageToEdit
  const [currentStep, setCurrentStep] = useState("0")
  const [isLoading, setIsLoading] = useState(false)

  const [destination, setDestination] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState<number | "">("")
  const [capacity, setCapacity] = useState<number | "">("")
  const [availableDates, setAvailableDates] = useState<string[]>([])

  const [prices, setPrices] = useState<Record<string, Record<string, number>>>({})

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

  const currencyRegionCombinations = useMemo(() => {
    const combinations: Array<CurrencyRegionCombination> = []

    regions.forEach((region: any) => {
      combinations.push({
        currency: region.currency_code,
        region_id: region.id,
        region_name: region.name,
        is_store_currency: false
      })
    })

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

  useEffect(() => {
    if (open && packageToEdit) {
      setDestination(packageToEdit.destination || "")
      setDescription(packageToEdit.description || "")
      setDuration(packageToEdit.duration_days)
      setCapacity(packageToEdit.max_capacity)
      setAvailableDates(packageToEdit.available_dates || [])

      if (packageToEdit.variants && packageToEdit.variants.length > 0) {
        const mappedPrices: Record<string, Record<string, number>> = {}

        packageToEdit.variants.forEach((v: any) => {
          const typeKey = v.passenger_type.toLowerCase()

          if (!mappedPrices[typeKey]) mappedPrices[typeKey] = {}

          const pricesList = v.product_variant?.price_set?.prices || []

          pricesList.forEach((price: any) => {
            const currency = price.currency_code.toLowerCase()
            mappedPrices[typeKey][`${currency}_store`] = price.amount

            const regionMatch = regions.find((r: any) => r.currency_code === currency)

            if (regionMatch) {
              const regionKey = `${currency}_${regionMatch.id}`
              mappedPrices[typeKey][regionKey] = price.amount
            }
          })
        })

        setPrices(mappedPrices)
      } else {
        setPrices({})
      }

    } else if (open && !packageToEdit) {
      resetForm()
    }
  }, [open, packageToEdit, regions])

  const resetForm = () => {
    setDestination("")
    setDescription("")
    setDuration("")
    setCapacity("")
    setAvailableDates([])
    setPrices({})
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
      const defaultCurrency = stores[0]?.supported_currencies?.[0]?.currency_code || "pen"
      const priceKey = `${defaultCurrency}_store`

      const payload: any = {
        destination,
        description,
        duration_days: Number(duration),
        max_capacity: Number(capacity),
        available_dates: availableDates,
        prices: {
          adult: prices["Adult"]?.[priceKey] || prices["adult"]?.[priceKey] || 0,
          child: prices["Child"]?.[priceKey] || prices["child"]?.[priceKey] || 0,
          infant: prices["Infant"]?.[priceKey] || prices["infant"]?.[priceKey] || 0,
          currency_code: defaultCurrency
        },
      }

      if (isEditMode && onUpdated) {
        await onUpdated({ id: packageToEdit!.id, ...payload })
      } else {
        await onSubmit(payload)
      }

      handleCloseModal(false)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to save package")
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
        <PackageDetailsStep
          destination={destination} setDestination={setDestination}
          description={description} setDescription={setDescription}
          duration={duration} setDuration={setDuration}
          capacity={capacity} setCapacity={setCapacity}
          availableDates={availableDates} setAvailableDates={setAvailableDates}
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
            {isEditMode ? "Edit Package" : "Create Package"}
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
              {isEditMode ? "Save Changes" : "Create Package"}
            </Button>
          )}
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}
