# Module 6: Priority Score Calculation

## Run

From the project folder run `npm install`, then `npm run dev`. Select **Priority Score Calculation** in the module switcher. Run its unit tests with `npm test`.

## Formula

The default configurable weights are Urgency 40%, Customer Frustration 25%, Customer Value 20%, and Support History 15%. Valid custom weights are saved in browser local storage when their total reaches 100%.

`Priority Score = urgency × 0.40 + frustration × 0.25 + customer value × 0.20 + support history × 0.15`

Inputs are validated in the 0–100 range and the result is rounded to two decimal places. Weights must total exactly 100% to enable calculation. Categories are Low Priority (0–44.99), Medium Priority (45–74.99), and High Priority (75–100).

Urgency defaults to Low 20, Medium 45, High 75, and Critical 100. The urgency score remains editable.

## Critical urgency safeguard

Critical urgency sets an immediate-review warning and attention recommendation regardless of the weighted score. It does not alter the mathematical score or category: the ordinary weighted result remains visible, while the separate safeguard ensures low customer value or frustration cannot downgrade critical handling.

## Data and limitations

The project already uses LowDB with a JSON file, so priority calculation history and weights are stored alongside (but separately from) ticket records in `server/data/tickets.json`. History is limited to the latest 50 records, and a newly calculated ticket ID replaces the previous record with the same ID (case-insensitive). This lightweight file-backed store is suitable for the demo, but it is not a concurrent multi-user production database.

This is a configurable decision-support estimate, not a guarantee of actual resolution time. Inputs must be provided manually; the module does not infer scores from sentiment, urgency prediction, customer value, or any other module. Sample inputs and sample history are labeled explicitly.
