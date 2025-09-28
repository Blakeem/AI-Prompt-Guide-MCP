# Toast Notification

## Overview

Documents the toast notification UI component

## Props Interface

```typescript
interface ComponentProps {
  // Define prop types here
}
```

## Usage Examples

### Basic Usage

```jsx
<Component />
```

Render the default toast by calling `showToast("Saved!")`.

Supports async data fetching handlers via promises.

### Advanced Usage

```jsx
<Component prop="value" />
```

Styling approaches and theme integration.

## Animations

Document how show/hide transitions behave and how to adjust duration.

## Accessibility

### Styling

Describe CSS variables and theme overrides.

Accessibility features and ARIA patterns.

## Testing

Ensure visual regressions are covered with snapshot tests.

Testing strategies and examples.

## Tasks

* \[ ] Build default toast variant
* \[ ] Wire toast queue to global store
* \[ ] Write accessibility tests
