import { useState } from "react"
import { DatePicker, Button, Label, Text, IconButton } from "@medusajs/ui"
import { XMarkMini } from "@medusajs/icons"

interface BlockedDatesComponentProps {
  value: string[]
  onChange: (dates: string[]) => void
}

const toStorageFormat = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

const toDisplayFormat = (dateString: string): string => {
  const [year, month, day] = dateString.split('-')
  return `${day}/${month}/${year}`
}

export const BlockedDatesComponent = ({ 
  value, 
  onChange 
}: BlockedDatesComponentProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date)
  }

  const handleAdd = () => {
    if (!selectedDate) return

    const dateString = toStorageFormat(selectedDate)
    
    if (value.includes(dateString)) {
      setSelectedDate(null)
      return
    }

    const newDates = [...value, dateString].sort()
    onChange(newDates)
    setSelectedDate(null)
  }

  const handleRemove = (dateToRemove: string) => {
    onChange(value.filter(date => date !== dateToRemove))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3 items-end">
        <div className="flex-1 max-w-xs">
          <Label className="mb-2 block text-ui-fg-base font-medium">
            Select Date to Block
          </Label>
          <DatePicker 
            value={selectedDate} 
            onChange={handleDateChange}
          />
        </div>
        <Button 
          variant="secondary" 
          onClick={handleAdd}
          disabled={!selectedDate}
          className="h-10"
        >
          Add Date
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label className="text-ui-fg-base font-medium">
            Blocked Dates
          </Label>
          <Text className="text-ui-fg-muted text-xs">
            {value.length} {value.length === 1 ? 'date' : 'dates'} blocked
          </Text>
        </div>

        {value.length === 0 ? (
          <div className="p-6 border border-dashed border-ui-border-base rounded-lg text-center">
            <Text className="text-ui-fg-muted text-sm">
              No blocked dates yet. Select a date above to block it.
            </Text>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {value.map(date => (
              <div
                key={date}
                className="group inline-flex items-center gap-2 px-3 py-1.5 bg-ui-bg-subtle border border-ui-border-base rounded-md hover:bg-ui-bg-subtle-hover transition-colors"
              >
                <Text className="text-sm font-medium text-ui-fg-base select-none">
                  {toDisplayFormat(date)}
                </Text>
                <IconButton
                  size="small"
                  variant="transparent"
                  onClick={() => handleRemove(date)}
                  className="opacity-60 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkMini className="text-ui-fg-muted" />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BlockedDatesComponent
