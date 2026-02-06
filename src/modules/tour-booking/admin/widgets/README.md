# Tour Calendar Widget

A custom Medusa Admin widget that displays tour availability in a monthly calendar view with color-coded days based on available slots.

## Features

- **Monthly Calendar Navigation**: Browse months with previous/next buttons and "Today" shortcut
- **Color-Coded Availability**:
  - 🟢 **Green**: Available (>20% capacity)
  - 🟠 **Amber**: Limited slots (<20% capacity)
  - 🔴 **Red**: Full (0 available)
- **Legend**: Clear visual reference for each color
- **Status Summary**: Overview of available, limited, and full days for the current month
- **Hover Information**: Tooltips show exact availability for each day
- **Loading States**: Animated spinner during data fetch

## Implementation Details

### Location
- **File**: `src/modules/tour-booking/admin/widgets/tour-calendar-widget.tsx`
- **Zone**: `product.details.side.before` (widget appears in the side panel of product details)

### Data Source
- **API Endpoint**: `/admin/tours/:id/availability`
- **Query Parameters**:
  - `start_date`: First day of the month (YYYY-MM-DD)
  - `end_date`: Last day of the month (YYYY-MM-DD)

### API Response Format
```typescript
{
  tour_id: string
  capacity: number
  availability: Array<{
    date: string      // YYYY-MM-DD format
    total: number     // Total tour capacity
    booked: number    // Number of bookings
    available: number // Available slots
  }>
}
```

### Color Logic
```typescript
const isFull = available === 0
const isPartial = available < capacity * 0.2
const color = isFull ? "red" : isPartial ? "orange" : "green"
```

## Requirements

### Dependencies
- **dayjs**: Date manipulation library (installed via npm)
- **@medusajs/ui**: Medusa UI components (already included)
- **@medusajs/admin-sdk**: Admin widget configuration (already included)

### Dependencies Installation
```bash
npm install dayjs --legacy-peer-deps
```

## Usage

1. **Start the Development Server**:
   ```bash
   npm run dev
   ```

2. **Access the Admin Dashboard**:
   Open http://localhost:9000/app in your browser

3. **View the Widget**:
   - Navigate to the **Products** page
   - Select any product
   - Look for the **Calendario de Disponibilidad** widget in the side panel (appears before other widgets)

4. **Test the Widget**:
   - Use the navigation buttons to change months
   - Hover over calendar days to see availability details
   - Check the legend to understand color coding
   - View the status summary at the bottom

## Customization

### Change Widget Zone
If you need to display the widget in a different zone, modify the `config` export:

```typescript
export const config = defineWidgetConfig({
  zone: "product.details.side.before", // Change this to your preferred zone
})
```

### Modify Color Scheme
Adjust the `getAvailabilityColor()` function in the widget to change colors:

```typescript
function getAvailabilityColor(status: string): { bg: string; border: string; text: string } {
  switch (status) {
    case AVAILABLE:
      return {
        bg: "bg-emerald-50",      // Change to your color
        border: "border-emerald-200",
        text: "text-emerald-700",
      }
    // ... other cases
  }
}
```

### Update Threshold Percentage
Modify the `getAvailabilityStatus()` function:

```typescript
function getAvailabilityStatus(available: number, capacity: number): string {
  if (available === 0) return FULL
  const percentage = (available / capacity) * 100
  // Change 20 to your desired threshold
  return percentage >= 20 ? AVAILABLE : LIMITED
}
```

## API Endpoint Implementation

For the widget to work, you need to implement the availability endpoint in your Medusa backend. A sample implementation:

```typescript
// src/api/admin/tours/[id]/availability/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import TourModuleService from "../../../../../modules/tour-booking/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const tourId = req.params.id
  const startDate = req.query.start_date as string
  const endDate = req.query.end_date as string

  const tourModuleService = req.scope.resolve("tourBookingModuleService")

  const availability = await tourModuleService.getAvailabilityByDateRange(
    tourId,
    startDate,
    endDate
  )

  res.json({
    tour_id: tourId,
    capacity: availability.capacity,
    availability: availability.days,
  })
}
```

## Widget Structure

The widget consists of:

1. **Header Section**: Title, current month display, and navigation controls
2. **Legend**: Color-coded reference for availability statuses
3. **Calendar Grid**: 7-column grid showing days of the week
4. **Status Summary**: Summary statistics at the bottom

### Components Used

- `Container`: Main container for the widget
- `Heading`: Widget title
- `Text`: Descriptive text with various sizes and weights
- `Button`: Navigation controls (Today, Previous, Next)
- `dayjs`: Date manipulation

### Styling

The widget uses Tailwind CSS classes for styling:
- Semantic colors from Medusa UI (`bg-ui-bg-base`, `text-ui-fg-subtle`, etc.)
- Flexbox for layout
- Grid for calendar
- Tailwind color utilities for custom colors (emerald, amber, red)
- Hover effects for interactivity

## Testing

### Manual Testing
1. Verify widget appears in product details side panel
2. Test month navigation
3. Check color coding accuracy
4. Verify tooltips display correct information
5. Test loading states
6. Check status summary calculations

### Automatic Testing
Create an integration test to verify:
- API returns correct data format
- Widget renders without errors
- Colors are applied correctly
- Navigation works as expected

## Troubleshooting

### Widget Not Appearing
- Verify the widget zone is correct
- Check browser console for errors
- Ensure the tour ID is available in the page context
- Verify the availability API endpoint is working

### API Errors
- Check if the API endpoint exists at `/admin/tours/:id/availability`
- Verify the endpoint returns the correct JSON structure
- Check authentication and authorization

### Styling Issues
- Ensure Tailwind CSS is properly configured
- Check that all necessary styles are loaded
- Verify browser compatibility

## Dependencies

### External Libraries
- `dayjs` (v1.11.10+): Lightweight date manipulation library

### Internal Dependencies
- `@medusajs/ui`: Medusa UI component library
- `@medusajs/admin-sdk`: Widget configuration and types

## Future Enhancements

Potential improvements:
- [ ] Add week view or year view options
- [ ] Allow filtering by specific availability ranges
- [ ] Add booking links from calendar days
- [ ] Support for multiple tour variants
- [ ] Export availability data to CSV
- [ ] Real-time availability updates
- [ ] Calendar day tooltips with booking details
- [ ] Visual indicators for peak seasons

## License

This widget is part of the tour-booking module and follows the same license as the project.
