import { Heading, Input, Label, Text, Textarea, Switch } from "@medusajs/ui"
import { BlockedDatesComponent } from "./blocked-dates-component"

interface TourDetailsStepProps {
  destination: string
  setDestination: (v: string) => void
  description: string
  setDescription: (v: string) => void
  duration: number | ""
  setDuration: (v: number | "") => void
  capacity: number | ""
  setCapacity: (v: number | "") => void
  isSpecial: boolean
  setIsSpecial: (v: boolean) => void
  bookingMinDays: number | ""
  setBookingMinDays: (v: number | "") => void
  blockedDates: string[]
  setBlockedDates: (v: string[]) => void
  thumbnail?: string
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
  isSpecial,
  setIsSpecial,
  bookingMinDays,
  setBookingMinDays,
  blockedDates,
  setBlockedDates,
  thumbnail,
}: TourDetailsStepProps) => {
  return (
    <div className="flex flex-col gap-y-8">
      <div>
        <Heading level="h2">Tour Details</Heading>
        <Text className="text-ui-fg-subtle">
          Enter the basic information about your tour.
        </Text>
      </div>

      <div className="flex flex-col gap-4">
        {thumbnail && (
          <div className="flex flex-col gap-2">
            <Label>Thumbnail</Label>
            <img 
              src={thumbnail} 
              alt="Tour thumbnail" 
              className="w-full h-48 object-cover rounded-md border border-ui-border-base" 
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label>Destination</Label>
            <Input
              placeholder="e.g. Machu Picchu"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled
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
              disabled
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
            disabled
          />
        </div>

        <div className="flex items-center gap-3 py-2">
          <Switch
            checked={isSpecial}
            onCheckedChange={setIsSpecial}
            id="is-special"
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor="is-special" className="cursor-pointer">
              Mark as Special Tour
            </Label>
            <Text className="text-ui-fg-subtle text-xs">
              Special tours receive highlighted placement in listings
            </Text>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Minimum Days Ahead for Booking</Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={bookingMinDays}
            onChange={(e) => setBookingMinDays(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <Text className="text-ui-fg-subtle text-xs">
            Number of days customers must book in advance (0 for same-day booking)
          </Text>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-base font-medium">Blocked Dates</Label>
          <Text className="text-ui-fg-subtle text-xs mb-2">
            Select dates when this tour is unavailable for booking
          </Text>
          <BlockedDatesComponent
            value={blockedDates}
            onChange={setBlockedDates}
          />
        </div>
      </div>
    </div>
  )
}
