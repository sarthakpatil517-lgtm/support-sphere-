# Customer Value Analysis Module

## Setup

1. Install dependencies:
   npm install
2. Start the app:
   npm run client
3. Open the application and switch to the "Customer Value Analysis" module.

This module runs as a standalone UI in the existing React + TypeScript + Vite project. It stores recent analyses in browser local storage because no dedicated customer-value database is configured in the current project.

## Scoring formula

The default weighted score is:

- Account tier: 35%
- Customer tenure: 20%
- Customer lifetime value: 25%
- Account status and relationship history: 20%

Each factor is normalized to a 0–100 scale before weighting is applied. The score is then clamped to a 0–100 estimate.

The customer value category is assigned as:

- Low Value: 0–24
- Moderate Value: 25–49
- High Value: 50–74
- Very High Value: 75–100

## Weight configuration

The weights can be adjusted in the module settings section. The system rescales the values to keep the total weight at 100% while preserving the relative weighting pattern.

## Limitations

- Browser-local storage is used for persistence; it is not shared or centralized like a production database.
- The score is an estimate based on configured rules and account metadata only.
- Repeat contacts are tracked separately and are not treated as a positive value signal.
- The model does not infer profitability or behaviour beyond the configured scoring rules.
- It does not override critical security, safety, or urgent support handling.
