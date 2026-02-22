# Schedule GA App - Summary

## Overview
A full-stack app that generates a weekly schedule using a Genetic Algorithm (GA) combined with a Two-Process Model (TPM) of fatigue. The goal is to balance work, study, sleep, power naps, and leisure across a 7-day week.

## Main Goals
- Build a weekly schedule that is realistic and balanced.
- Respect fixed study and work blocks.
- Minimize fatigue while meeting minimum sleep needs.
- Present results in a clear, visual schedule.

## Architecture
- Backend: Node.js + Express
- Frontend: React + Vite
- GA Engine: custom implementation (selection, crossover, mutation, elitism)
- Fatigue Model: Two-Process Model (Process S and Process C)

## Key Concepts
### Time Representation
- 7 days, 48 slots per day
- 1 slot = 30 minutes
- Total: 336 slots per week

### Alleles (Activity Encoding)
- 0 = LEISURE (Waktu Luang)
- 1 = WORK (Kerja)
- 2 = STUDY_FIXED (Kuliah wajib)
- 3 = NAP (Power Nap)
- 4 = SLEEP (Tidur)

### Optimization Targets
The GA optimizes a fitness score based on:
- Fatigue level (Process S - Process C)
- Study fixed-slot violations (heavy penalty)
- Minimum daily sleep quota
- Power nap rules (sleep inertia penalty for long naps)

## Backend Flow
1. Client sends config to POST /api/ga/run
2. Backend normalizes and validates input
3. GA initializes population
4. GA evolves population (selection, crossover, mutation)
5. Fitness computed per chromosome
6. Best chromosome returned along with stats

## Frontend Flow
1. App loads schedule metadata from GET /api/ga/meta
2. User selects preset or custom parameters
3. User adds fixed study/work blocks
4. User runs optimization
5. Results are rendered:
   - Summary cards
   - Weekly Gantt chart
   - Per-day detail list
   - Summary table

## GA Pipeline
- Initialization: random activity assignment except fixed slots
- Selection: tournament selection
- Crossover: two-point
- Mutation: swap-based
- Elitism: top individuals preserved
- Early stopping: stops when no improvement

## Sleep, Nap, and Leisure Rules
- Minimum daily sleep: 10 slots (5 hours)
- Power nap effective: 1-2 slots
- Power nap 3-4 slots: penalized (sleep inertia)
- Power nap >4 slots: treated as sleep
- Leisure reduces fatigue lightly (0.3x sleep effect)

## Key Files
### Backend
- backend/src/server.js
- backend/src/routes/gaRoutes.js
- backend/src/services/gaScheduler.js
- backend/src/services/tpmModel.js
- backend/src/config/gaConfig.js

### Frontend
- frontend/src/App.jsx
- frontend/src/components/GaConfigForm.jsx
- frontend/src/components/ScheduleViewer.jsx
- frontend/src/services/apiClient.js
- frontend/src/config/scheduleConfig.js

## API Endpoints
- GET /api/ga/meta
  - Returns schedule topology and default config
- POST /api/ga/run
  - Runs GA and returns best solution

## UI Highlights
- Preset optimization modes (Cepat, Seimbang, Teliti)
- Clear separation of sections
- Visual weekly Gantt chart
- Detailed per-day time blocks
- Summary table with hours per activity

## Assumptions
- Fixed study slots always override work slots.
- Sleep is required daily; leisure cannot replace sleep.
- Power nap rules are enforced by penalties.

## Notes
- All time input is aligned to 30-minute slots.
- Performance optimized by single-pass fitness evaluation.
- UI is designed to be beginner-friendly and clear.
