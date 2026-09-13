# Accessibility

Accessibility is a product requirement, not a later polish phase.

## Baseline goals

Target WCAG 2.2 AA where applicable.

## Requirements

Core workflows should support:

- keyboard navigation
- visible focus
- screen readers
- semantic controls
- scalable text
- sufficient contrast
- reduced-motion preferences
- touch targets suitable for mobile
- error messages that do not rely only on color

## Content

Posters and covers need useful alternative text when they convey information.

Decorative imagery should not add unnecessary screen-reader noise.

## Tracking interactions

Status, progress, rating, and destructive actions must remain operable without drag, hover, or precision pointer input.

The Up next card row provides labelled previous and next buttons when its cards overflow. The buttons move one card at a time and expose disabled boundary states without losing keyboard focus. The row also supports native keyboard, touch, and trackpad scrolling. Button scrolling respects the current reduced-motion preference. Controls update after scrolling, resizing, or filtering; the episode grid is unchanged.

## Testing

Accessibility checks should be part of design and release testing.
