# ProgressTracker Component

## Overview

The **ProgressTracker** component is a clean, visually engaging progress tracker for the NIST 800-53 compliance dashboard. It provides real-time visualization of control implementation status with an interactive progress bar, detailed statistics, and filtering capabilities.

## Features

### 📈 Visual Progress Bar
- **Segmented progress bar** with color-coded sections:
  - 🟢 **Implemented** (Green) - Completed controls
  - 🟡 **In Progress** (Yellow) - Controls currently being worked on
  - 🔍 **Needs Review** (Blue) - Controls awaiting review
  - ⏸️ **Deferred** (Red) - Controls postponed
  - ⛔ **Not Started** (Gray) - Controls not yet begun

### 🎯 Interactive Elements
- **Hover tooltips** on progress bar segments showing:
  - Status name
  - Number of controls
  - Percentage breakdown
- **Smooth transitions** and hover effects
- **Responsive design** for mobile and desktop

### 📊 Statistics Summary
- **Overall completion percentage** prominently displayed
- **Detailed breakdown** of each status category
- **Visual icons** for each status type
- **Real-time updates** based on localStorage data

### 🔍 Filter Functionality
- **Pill-style filter buttons** for each status:
  - All, Implemented, In Progress, Needs Review, Deferred, Not Started
- **Active state indication** with highlighted styling
- **Count badges** showing number of controls in each category
- **Disabled state** for categories with zero controls

### 📱 Display Modes
- **Full mode**: Complete component with all features
- **Compact mode**: Simplified version for sidebars and small spaces

## Usage

### Basic Implementation

```jsx
import ProgressTracker from './components/ProgressTracker'

function Dashboard() {
  const [controls, setControls] = useState([])
  const [activeFilter, setActiveFilter] = useState('All')

  const handleFilterChange = (filter) => {
    setActiveFilter(filter)
    // Apply filtering logic to your control list
  }

  return (
    <ProgressTracker
      controls={controls}
      onFilterChange={handleFilterChange}
      activeFilter={activeFilter}
    />
  )
}
```

### Compact Mode (Sidebar)

```jsx
<ProgressTracker
  controls={controls}
  compact={true}
  showFilters={false}
  className="mb-4"
/>
```

### Search Page Integration

```jsx
<ProgressTracker
  controls={controls}
  showFilters={false}
  compact={true}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `controls` | `Array` | `[]` | Array of NIST control objects |
| `onFilterChange` | `Function` | `() => {}` | Callback when filter selection changes |
| `activeFilter` | `String` | `'All'` | Currently active filter |
| `className` | `String` | `''` | Additional CSS classes |
| `showFilters` | `Boolean` | `true` | Whether to show filter buttons |
| `compact` | `Boolean` | `false` | Enable compact display mode |

## Data Structure

The component expects control objects with this structure:

```javascript
{
  control_id: "AC-2",
  control_name: "Account Management",
  // ... other control properties
}
```

And reads tracking data from localStorage with this format:

```javascript
[
  {
    control_id: "AC-2",
    status: "Implemented", // or "In Progress", "Needs Review", "Deferred", "Not Started"
    owner: "John Smith",
    notes: "Implementation notes...",
    deadline: "2024-01-15",
    last_updated: "2024-01-10T10:30:00.000Z"
  }
]
```

## Styling

### Color Scheme
- **Implemented**: Green (`bg-green-500`, `text-green-700`)
- **In Progress**: Yellow (`bg-yellow-500`, `text-yellow-700`)
- **Needs Review**: Blue (`bg-blue-500`, `text-blue-700`)
- **Deferred**: Red (`bg-red-500`, `text-red-700`)
- **Not Started**: Gray (`bg-gray-400`, `text-gray-700`)

### Responsive Breakpoints
- **Mobile**: Single column layout, stacked elements
- **Tablet**: 2-3 column grid for stats
- **Desktop**: Full 5-column layout with horizontal progress bar

## Integration Examples

### Home Dashboard
```jsx
// Full-featured progress tracker with filtering
<ProgressTracker
  controls={controls}
  onFilterChange={handleProgressFilterChange}
  activeFilter={progressFilter}
/>
```

### Implementation Tracker Page
```jsx
// Integrated with existing status filters
<ProgressTracker
  controls={controls}
  onFilterChange={(filter) => setStatusFilter(filter === 'All' ? '' : filter)}
  activeFilter={statusFilter || 'All'}
/>
```

### Control Search Page
```jsx
// Compact view without filters
<ProgressTracker
  controls={controls}
  showFilters={false}
  compact={true}
/>
```

## Performance Considerations

- **Memoized calculations** using `useMemo` for stats and segments
- **Efficient filtering** with minimal re-renders
- **LocalStorage caching** for persistent state
- **Smooth animations** with CSS transitions

## Accessibility

- **Semantic HTML** structure
- **ARIA labels** and descriptions
- **Keyboard navigation** support
- **High contrast** color scheme
- **Screen reader** friendly tooltips

## Browser Support

- **Modern browsers** (Chrome, Firefox, Safari, Edge)
- **CSS Grid** and **Flexbox** support required
- **ES6+** JavaScript features

## Customization

### Custom Styling
```jsx
<ProgressTracker
  className="my-custom-tracker shadow-lg"
  controls={controls}
/>
```

### Custom Colors
Modify the `segmentData` color classes in the component:
```javascript
color: 'bg-custom-green-500',
hoverColor: 'bg-custom-green-600',
textColor: 'text-custom-green-700'
```

## Future Enhancements

- **Real-time updates** via WebSocket
- **Export functionality** for progress reports
- **Historical tracking** and trend analysis
- **Team collaboration** features
- **Custom status categories**
- **Progress goals** and targets
- **Notification system** for overdue items

## Dependencies

- **React** 18+
- **Heroicons** for icons
- **Tailwind CSS** for styling
- **LocalStorage** for data persistence

## License

This component is part of the NIST 800-53 Compliance Application and follows the same licensing terms. 