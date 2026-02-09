import { Heading, Input, Label, Text, Textarea } from "@medusajs/ui"

interface PackageDetailsStepProps {
  destination: string
  setDestination: (v: string) => void
  description: string
  setDescription: (v: string) => void
  duration: number | ""
  setDuration: (v: number | "") => void
  capacity: number | ""
  setCapacity: (v: number | "") => void
}

export const PackageDetailsStep = ({
  destination,
  setDestination,
  description,
  setDescription,
  duration,
  setDuration,
  capacity,
  setCapacity,
}: PackageDetailsStepProps) => {
  return (
    <div className="flex flex-col gap-y-8">
      <div>
        <Heading level="h2">Package Details</Heading>
        <Text className="text-ui-fg-subtle">
          Enter basic information about your package.
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
            placeholder="Package description..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
