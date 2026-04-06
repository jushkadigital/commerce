import { Button, Label, Text, clx } from "@medusajs/ui"

interface BlockedWeekDaysComponentProps {
  value: string[]
  onChange: (days: string[]) => void
}

const WEEK_DAYS = [
  { value: "1", shortLabel: "Lun", fullLabel: "Lunes" },
  { value: "2", shortLabel: "Mar", fullLabel: "Martes" },
  { value: "3", shortLabel: "Mié", fullLabel: "Miércoles" },
  { value: "4", shortLabel: "Jue", fullLabel: "Jueves" },
  { value: "5", shortLabel: "Vie", fullLabel: "Viernes" },
  { value: "6", shortLabel: "Sáb", fullLabel: "Sábado" },
  { value: "0", shortLabel: "Dom", fullLabel: "Domingo" },
]

export const BlockedWeekDaysComponent = ({
  value,
  onChange,
}: BlockedWeekDaysComponentProps) => {
  const selectedSet = new Set(value.map(String))

  const handleToggle = (day: string) => {
    const nextSelected = new Set(selectedSet)

    if (nextSelected.has(day)) {
      nextSelected.delete(day)
    } else {
      nextSelected.add(day)
    }

    const orderedDays = WEEK_DAYS.map((weekDay) => weekDay.value).filter((weekDay) =>
      nextSelected.has(weekDay)
    )

    onChange(orderedDays)
  }

  const blockedLabels = WEEK_DAYS.filter((day) => selectedSet.has(day.value)).map(
    (day) => day.fullLabel
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {WEEK_DAYS.map((day) => {
          const isSelected = selectedSet.has(day.value)

          return (
            <Button
              key={day.value}
              type="button"
              size="small"
              variant={isSelected ? "primary" : "secondary"}
              className={clx("min-w-12", isSelected && "shadow-borders-interactive-with-active")}
              onClick={() => handleToggle(day.value)}
            >
              {day.shortLabel}
            </Button>
          )
        })}
      </div>

      <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
        <Label className="text-ui-fg-subtle text-xs">Días bloqueados</Label>
        <Text className="mt-1 text-sm text-ui-fg-base">
          {blockedLabels.length > 0 ? blockedLabels.join(", ") : "Ningún día bloqueado"}
        </Text>
      </div>
    </div>
  )
}

export default BlockedWeekDaysComponent
