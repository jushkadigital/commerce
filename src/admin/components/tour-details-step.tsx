import { Heading, Input, Label, Text, Textarea, Switch } from "@medusajs/ui"
import { BlockedDatesComponent } from "./blocked-dates-component"
import { BlockedWeekDaysComponent } from "./blocked-week-days-component"

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
  blockedWeekDays: string[]
  setBlockedWeekDays: (v: string[]) => void
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
  blockedWeekDays,
  setBlockedWeekDays,
  thumbnail,
}: TourDetailsStepProps) => {
  return (
    <div className="flex flex-col gap-y-8">
      <div>
        <Heading level="h2">Informacion del Tour </Heading>
        <Text className="text-ui-fg-subtle">
          Aqui podras modificar informacion y las reglas de este tour
        </Text>
      </div>

      <div className="flex flex-col gap-4">
        {thumbnail && (
          <div className="flex flex-col gap-2">
            <Label>Thumbnail</Label>
            <img
              src={thumbnail}
              alt="Tour thumbnail"
              className="w-52 h-48 object-cover rounded-md border border-ui-border-base"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label>Destino</Label>
            <Input
              placeholder="e.g. Machu Picchu"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Duracion en (Dias)</Label>
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
          <Label>Maxima capacidad para un grupo</Label>
          <Input
            type="number"
            min={1}
            placeholder="20"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Descripcion</Label>
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
              Marcar como Tour especial
            </Label>
            <Text className="text-ui-fg-subtle text-xs">
              Los tours especiales tendran caracteristicas unicas
            </Text>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Dias minimos para poder hacer una reserva</Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={bookingMinDays}
            onChange={(e) => setBookingMinDays(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <Text className="text-ui-fg-subtle text-xs">
            Numero de dias en que los pasajeros deberan reservar en adelante (0 para el mismo dia de reserva)
          </Text>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-base font-medium">Fechas bloqueadas</Label>
          <Text className="text-ui-fg-subtle text-xs mb-2">
            Seleciona las fechas cuando no estara disponible este tour
          </Text>
          <BlockedDatesComponent
            value={blockedDates}
            onChange={setBlockedDates}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-base font-medium">Días bloqueados</Label>
          <Text className="text-ui-fg-subtle text-xs mb-2">
            Selecciona los días de la semana en los que no se permiten reservas
          </Text>
          <BlockedWeekDaysComponent
            value={blockedWeekDays}
            onChange={setBlockedWeekDays}
          />
        </div>
      </div>
    </div>
  )
}
