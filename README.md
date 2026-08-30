# open-personal-tracking

[![GitHub Discussions](https://img.shields.io/github/discussions/ludovicobesana/open-personal-tracking)](https://github.com/ludovicobesana/open-personal-tracking/discussions)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/6CjFPH55Rv)
[![Contributing](https://img.shields.io/badge/Contributing-guide-blue)](CONTRIBUTING.md)
[![Code of Conduct](https://img.shields.io/badge/Code%20of%20Conduct-enforced-blueviolet)](CODE_OF_CONDUCT.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Good First Issues](https://img.shields.io/github/issues/ludovicobesana/open-personal-tracking/good%20first%20issue)](https://github.com/ludovicobesana/open-personal-tracking/labels/good%20first%20issue)
[![GitHub Stars](https://img.shields.io/github/stars/ludovicobesana/open-personal-tracking?style=social)](https://github.com/ludovicobesana/open-personal-tracking)

> **Working name:** `open-personal-tracking` is a temporary project name. The final product name is intentionally undecided.

**What you track is yours.**

open-personal-tracking is an open-source, local-first platform for tracking the things that become part of your life: movies, series, books, manga, anime, games, music, podcasts, places, courses, collections, and custom categories.

The core product must remain useful without an account, without a proprietary backend, and without a network connection.

## Why open-personal-tracking exists

People can spend years building personal histories inside tracking services. If those services shut down, change business model, remove export capabilities, or become inaccessible, users risk losing part of that history.

open-personal-tracking is built around the opposite assumption:

> The application may disappear. Your history must not.

## Core principles

- Local first
- Portable always
- Cloud optional
- Open by design
- Private by default
- No artificial lock-in
- Network features are optional
- Community governance should be transparent

## Product layers

### open-personal-tracking Core

Works locally and independently.

- Universal tracking
- Progress
- Series, seasons, and episodes
- Ratings
- Notes
- Tags
- Collections
- History
- Import/export
- Backup
- Offline operation

### open-personal-tracking Network

Optional shared infrastructure.

- Aggregated ratings
- Trends
- Comments and discussions
- Public lists
- Profiles
- Recommendations
- Community discovery
- Anonymous contribution to open aggregate data

open-personal-tracking Core must continue working if open-personal-tracking Network disappears.

## Series tracking

Series are tracked at episode level. A season is complete only when every episode in that season is marked as watched; the series progress is calculated from all completed episodes. Episode details remain part of the local archive alongside the parent series.

## Documentation

- [Changelog](CHANGELOG.md)
- [Why This Project Exists](WHY.md)
- [Vision](VISION.md)
- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design Principles](DESIGN_PRINCIPLES.md)
- [Data Format](DATA_FORMAT.md)
- [Data Ownership and Portability](docs/DATA_OWNERSHIP.md)
- [Data Governance](DATA_GOVERNANCE.md)
- [Privacy](PRIVACY.md)
- [open-personal-tracking Network](docs/NETWORK.md)
- [Contributor Zone](CONTRIBUTOR_ZONE.md)
- [Community](COMMUNITY.md)
- [Contributing](CONTRIBUTING.md)
- [Governance](GOVERNANCE.md)
- [Maintainers](MAINTAINERS.md)
- [Roadmap](ROADMAP.md)
- [Testing](TESTING.md)
- [Competitive Analysis](docs/COMPETITIVE_ANALYSIS.md)
- [Reference: TV Time Information Architecture](docs/reference/TVTIME_REFERENCE.md)
- [Accessibility](ACCESSIBILITY.md)
- [Localization](LOCALIZATION.md)
- [Compatibility](COMPATIBILITY.md)
- [Deprecation Policy](DEPRECATION_POLICY.md)
- [Release Process](RELEASE_PROCESS.md)
- [Support](SUPPORT.md)
- [Issue Triage](docs/ISSUE_TRIAGE.md)
- [Weekly Community Call](docs/WEEKLY_CALL.md)
- [RFC Process](docs/RFC_PROCESS.md)
- [Security](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

## Getting started

The repository currently contains two local development surfaces:

- **Core domain package**: archive model, validation, migrations, and tests.
- **Web app shell**: a Next.js interface for exploring the local-first tracking experience.

### Core

```bash
npm install
npm run build
npm test
```

### Web app

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then navigate to `/app-shell` to use the current application preview. For a production check, run `npm run build` from the `web` directory.

## Get involved

Every week, the community reviews open issues together on Discord, 13:00-14:00.

Everyone is welcome to join, whether you want to triage, pick up an issue, or just listen in: https://discord.gg/6CjFPH55Rv

## Project status

Early-stage.

The web app currently provides a local UI preview for the main tracking flows. The durable storage, backup/restore flow, and the optional network layer remain under active development; see the [Product Requirements](docs/PRODUCT_REQUIREMENTS.md) and [Roadmap](ROADMAP.md) for the planned scope.

The first milestone is intentionally small: prove that a user can create data locally, close the app, reopen it, export everything, delete the local state, restore the backup, and recover the same information.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-or-later).
