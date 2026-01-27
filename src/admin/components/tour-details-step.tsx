import { Heading, Input, Label, Text, Textarea, Button, IconButton } from "@medusajs/ui"
import { Plus, Trash } from "@medusajs/icons"
import { useState } from "react"

interface TourDetailsStepProps {
  destination: string
  setDestination: (v: string) => void
  description: string
  setDescription: (v: string) => void
  duration: number | ""
  setDuration: (v: number | "") => void
  capacity: number | ""
  setCapacity: (v: number | "") => void
  availableDates: string[]
  setAvailableDates: (dates: string[]) => void
}

export const TourDetailsStep = ({
  destination,
  setDestination,
  description,
  setDescription,
  duration,
  setDuration,
  capacity,
  setCapacity,
  availableDates,
  setAvailableDates
}: TourDetailsStepProps) => {
  const [dateInput, setDateInput] = useState("")

  const addDate = () => {
    if (!dateInput) return
    if (availableDates.includes(dateInput)) {
      setDateInput("")
      return
    }
    setAvailableDates([...availableDates, dateInput].sort())
    setDateInput("")
  }

  const removeDate = (dateToRemove: string) => {
    setAvailableDates(availableDates.filter(d => d !== dateToRemove))
  }

  return (
    <div className="flex flex-col gap-y-8">
      <div>
        <Heading level="h2">Tour Details</Heading>
        <Text className="text-ui-fg-subtle">
          Enter the basic information about your tour.
        </Text>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label>Destination</Label>
            <Input
              placeholder="e.g. Machu Picchu"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Duration (Days)</Label>
            <Input
              type="number"
              min={1}
              placeholder="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Max Capacity (People)</Label>
          <Input
            type="number"
            min={1}
            placeholder="20"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Tour description..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Date Management Section */}
        <div className="flex flex-col gap-2 pt-2">
          <Label>Available Dates</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="flex-1"
            />
            <Button variant="secondary" onClick={addDate} type="button">
              <Plus /> Add Date
            </Button>
          </div>

          {availableDates.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2 p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
              {availableDates.map((date) => (
                <div key={date} className="flex items-center justify-between bg-white px-2 py-1 rounded border shadow-sm text-small">
                  <span>{date}</span>
                  <IconButton
                    size="small"
                    variant="transparent"
                    className="text-ui-fg-muted hover:text-ui-fg-error"
                    onClick={() => removeDate(date)}
                  >
                    <Trash />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
