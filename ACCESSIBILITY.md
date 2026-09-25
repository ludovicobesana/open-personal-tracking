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

Global search can be submitted with Enter or its labelled search button from any primary screen. A non-empty submission searches all item categories, opens Library, and moves focus to the results heading; an empty submission leaves the current screen and category unchanged. No-results feedback includes the query; clearing global search returns focus to its input and restores the list.

The Up next card row provides labelled previous and next buttons when its cards overflow. The buttons move one card at a time and expose disabled boundary states without losing keyboard focus. The row also supports native keyboard, touch, and trackpad scrolling. Button scrolling respects the current reduced-motion preference. Controls update after scrolling, resizing, or filtering; the episode grid is unchanged.

Provider discovery is an optional section of the item dialog. Search, retry,
cancel, result review, and remote-cover consent use labelled native controls;
loading, empty, error, and cancellation feedback is announced without exposing
provider transport details. Manual creation remains available in every state.

## Testing

Accessibility checks should be part of design and release testing.
