<p align="center">
  <img src="public/logo-full.png" alt="SupportSphere Logo" width="280" />
</p>

# Predictive Customer Support Triage & Sentiment Router

An enterprise-grade, centralized customer support ticketing and automated triage platform designed to eliminate generic, first-come, first-served queue bottlenecks.

---

## 📌 Problem Statement
Customers often face long wait times in generic first-come, first-served support queues. Companies risk losing valuable business and customer trust because:
1. **Urgent and critical issues** (e.g. security vulnerabilities, financial discrepancies, system outages) sit unaddressed in standard queues.
2. **Highly frustrated customers** experiencing repeated service failures are not escalated in time, leading to churn.
3. **High-value enterprise clients** (VIPs with significant contract value or lifetime spend) receive the same slow baseline response as general inquiries.
4. **Routine, repetitive queries** (password resets, return policy lookups, tracking inquiries) overwhelm support queues instead of being deflected instantly via automated self-service.

---

## 💡 Proposed Solution
A centralized customer support ticketing system that analyzes incoming queries in real time using:
* **AI Sentiment & Frustration Analysis**: Detects emotional intensity, complaint repetition, and frustration levels (0–100 scale).
* **Urgency Prediction & Issue Classification**: Predicts urgency (Low, Medium, High, Critical) with a critical-incident safeguard.
* **Customer-Value Factors**: Evaluates account tier (Standard, Silver, Gold, Platinum VIP), tenure, and lifetime value (LTV).
* **Dynamic Priority Scoring**: Calculates a weighted score combining urgency, frustration, customer value, and interaction history.
* **Intelligent Routing & Senior Staff Escalation**:
  * **Fast-Tracks Highly Frustrated or High-Value Clients** to senior support specialists and Tier-2 leads.
  * **Deflects Routine Queries Instantly** through an automated knowledge base without human queue waiting.
  * **Balances Team Capacity & Skills** for regular operational routing across specialized teams.

---

## 🏛️ System Architecture

```
                       [ Incoming Customer Query ]
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │             Predictive AI Triage Pipeline              │
       ├────────────────────────────┬───────────────────────────┤
       │ 1. Sentiment & Frustration │ Lexicon signals (0-100)   │
       │ 2. Urgency Prediction      │ Low / Med / High / Crit   │
       │ 3. Issue Classification    │ 8 specialized categories  │
       │ 4. Customer Value Factor   │ Tier, LTV, Tenure (0-100) │
       │ 5. Automated KB Check      │ Routine Query Deflection  │
       └────────────────────────────┴───────────────────────────┘
                                    │
                                    ▼
                ┌───────────────────────────────────────┐
                │       Priority Score Calculation      │
                │ Urgency 40% + Frustration 25% +       │
                │ Customer Value 20% + History 15%      │
                └───────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌───────────────────────┐ ┌───────────────────┐ ┌────────────────────────┐
│  Senior Escalation    │ │   Automated KB    │ │   Specialized Teams    │
│  (Frustrated / VIP)   │ │  Routine Instant  │ │  (Billing, Tech, etc.) │
│  SLA: < 15 minutes    │ │  SLA: < 1.2 sec   │ │  Capacity-Balanced     │
└───────────────────────┘ └───────────────────┘ └────────────────────────┘
```

---

## 📦 Complete Modular Breakdown

| Module | Name | Purpose | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Showcase** | **Predictive Triage Simulator** | Centralized Triage Command Center | Live simulator with 1-click test scenarios (Frustrated Customer, VIP Client, Security Breach, Routine Query, Standard Tech Issue), visual pipeline flowcharts, and instant ticket conversion. |
| **Module 1** | **Customer Ticket Management** | Customer-Facing Portal | Ticket submission form with live Knowledge Base quick-assist as the user types, conversation history, real-time status tracking, and triage insights. |
| **Module 2** | **AI Sentiment Analysis** | Sentiment & Frustration Engine | Evaluates customer messages for emotional cues, strong dissatisfaction, and repeated complaints, producing a calibrated 0–100 Frustration Score. |
| **Module 3** | **Urgency Prediction** | Operational Urgency Predictor | Categorizes requests into Low, Medium, High, and Critical urgency with dedicated safeguard triggers. |
| **Module 4** | **Issue Classification** | Query Categorization | Classifies incoming issues into Billing, Technical Support, Security, Account Access, Delivery, Refunds, Product, or General Inquiry. |
| **Module 5** | **Customer Value Analysis** | Account Value Scoring | Evaluates Account Tier (35%), Tenure (20%), Lifetime Value (25%), and Account Status/History (20%) on a 0–100 normalized scale. |
| **Module 6** | **Priority Score Calculation** | Multi-Factor Dynamic Priority | Computes: `Score = (Urgency × 0.40) + (Frustration × 0.25) + (Customer Value × 0.20) + (History × 0.15)`. Critical Urgency Safeguard prevents downgrading critical safety/security issues. |
| **Module 7** | **Intelligent Ticket Routing** | Workload & Skills Routing | Evaluates team availability, skill matches, category eligibility, and free-capacity ratios to assign tickets to the optimal department. |
| **Module 8** | **Automated Knowledge Base** | Routine Query Deflection | Repository of step-by-step verified resolutions (passwords, refunds, tracking, payment troubleshooting) providing instant resolution in < 1.2s. |
| **Module 9** | **Agent & Admin Dashboard** | Operations & Queue Management | Role-based authentication (Admin / Support Agent), triage filters (Senior Escalated, High Frustration, VIP, Critical), internal notes, response drafts, and team capacity monitoring. |

---

## 🧮 Mathematical Priority Formula

$$\text{Priority Score} = (\text{Urgency} \times 0.40) + (\text{Frustration} \times 0.25) + (\text{Customer Value} \times 0.20) + (\text{Support History} \times 0.15)$$

* **Urgency Base Points**: Low (20), Medium (45), High (75), Critical (100)
* **Categories**:
  * **Low Priority**: 0 – 44.99
  * **Medium Priority**: 45 – 74.99
  * **High Priority**: 75 – 100
* **Critical Safeguard**: When Urgency is *Critical* or Category is *Security*, an immediate incident review warning is triggered regardless of the customer's monetary value.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.0.0 or higher)
* **npm**

### Installation
```powershell
# Navigate to the project root
cd f:\hacl

# Install dependencies (if not already installed)
npm install
```

### Running the Application
To run both the Express backend API (Port 4000) and the Vite React frontend (Port 5173) concurrently:
```powershell
npm run dev
```

Alternatively, to run the client only:
```powershell
npm run client
```

Or run the backend API server only:
```powershell
npm run server
```

Open your browser to: **`http://localhost:5173`**

### Running the Test Suite
The project contains 44 automated unit and integration tests across 6 test suites covering routing, priority scores, customer value, authentication, knowledge base, and triage pipeline:
```powershell
npm test
```

### Building for Production
```powershell
npm run build
```

---

## 🔐 Agent & Admin Dashboard Setup (Module 9)
To bootstrap the initial administrator account on first startup:
```powershell
$env:ADMIN_BOOTSTRAP_EMAIL = "admin@example.com"
$env:ADMIN_BOOTSTRAP_PASSWORD = "use-a-unique-password-of-at-least-12-characters"
npm run dev
```
Once bootstrapped, administrators can log in, review the queue, create additional agents, approve escalation requests, and adjust team capacities.
