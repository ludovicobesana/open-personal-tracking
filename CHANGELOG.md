# Changelog

All notable changes to open-personal-tracking are documented in this file.

The format follows [Keep a Changelog 2.0.0](https://keepachangelog.com/en/2.0.0/). The project is pre-release; the historical entries below are preview milestones, not Git tags. Add semantic-version tags and comparison links when releases begin.

## [Unreleased]

### Added

- Series tracking in the app shell, with season and episode views.
- Episode-level completion: a season is complete only when all of its episodes are marked watched.
- A reusable favicon configuration for the Next.js site and app shell.

### Changed

- Secondary app screens now use the same surface, border, and accent system as the Library.
- The in-app changelog uses a release-oriented layout with version, date, and concise summaries.

### Fixed

- Progress updates for books now update the displayed page count.
- The recent-history timeline and episode presentation have clearer, responsive layouts.

## 0.4.0 - 2026-08-30

### Changed

- Improved the app-shell preview with clearer theme controls, richer settings actions, and a more complete desktop workflow for local-first tracking.

## 0.3.0 - 2026-08-24

### Changed

- The shell now uses the archive domain layer instead of demo-state-only data, keeping the UI aligned with future persistence behavior.

## 0.2.0 - 2026-08-20

### Changed

- Reworked the landing and app-shell visuals to match the design reference and aligned asset selection with the visual system.

## 0.1.0 - 2026-08-12

### Added

- Bootstrapped the repository, core archive model validation, and the first test coverage.
