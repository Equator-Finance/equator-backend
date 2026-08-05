# Equator Finance: Off-Chain Engine & Indexer (`equator-backend`)

> **What is Equator Finance?**  
> Equator Finance is a decentralized B2B FX Forward Protocol built on Stellar (Soroban) for emerging markets. It allows corporate importers and OTC liquidity desks to trustlessly lock in future exchange rates using USDC-settled Non-Deliverable Forwards (NDFs), while routing idle collateral into decentralized yield venues to significantly offset hedging costs.
>
> **Role of this repository:** This repository houses the off-chain middleware, WebSocket RFQ matching engine, Soroban event indexer, and real-time notification services that power the protocol's user experience.

---

## 🎯 Repository Scope & Overview

`equator-backend` powers the high-performance infrastructure facilitating off-chain negotiations between importers and market makers, indexing on-chain Soroban events, and managing real-time notifications.

### Key Responsibilities:
* **RFQ Order Engine:** Real-time WebSocket server facilitating off-chain price negotiation before on-chain execution.
* **Soroban RPC Indexer:** Event listener tracking contract creation, funding, margin calls, and maturity payouts.
* **Alerting & Notifications:** Instant messaging (Email, Push, Telegram) for margin calls and upcoming settlements.
* **Institutional Compliance Gateway:** Middleware hooks for corporate KYC/AML verification.

---

## 🛠 Project Structure (Target)

```text
equator-backend/
├── src/
│   ├── rfq/             # Real-time WebSocket server for RFQ order matching
│   ├── indexer/         # Soroban RPC event listener & database sync
│   ├── notifications/   # Email/Push notification dispatcher
│   └── kyc/             # Compliance gateway (Sumsub/Persona integration)
├── prisma/ (or db/)     # Database schema & migrations
├── docker-compose.yml
└── README.md
```

---

## 🚀 Development Phases

### Phase 1: RFQ Matching Engine & Soroban Event Indexer (MVP)
* **Goal:** Enable off-chain quote negotiation and track active Soroban contract states in real time.
* **Key Tasks & Deliverables:**
  * **WebSocket RFQ Server:** Build bi-directional WebSocket API for importers to broadcast RFQs and OTC desks to respond with rates.
  * **Soroban Event Listener:** Poll and index Soroban RPC logs to monitor `ForwardCreated`, `MarginLocked`, and `Settled` events.
  * **Database Layer:** Implement PostgreSQL database schema to store historical quotes, contract states, and user profiles.

### Phase 2: Real-time Alerting & Oracle Heartbeat Monitor
* **Goal:** Keep CFOs and desks informed of critical contract milestones and market volatility.
* **Key Tasks & Deliverables:**
  * **Notification Pipeline:** Dispatch automated alerts (Email via SendGrid, Push/Telegram) for:
    * RFQ acceptance
    * 24-hour maturity warnings
    * Settlement completions
  * **Oracle Discrepancy Monitor:** Track off-chain FX feeds against on-chain oracle reports to detect anomalies or stale prices early.

### Phase 3: Compliance Gateway & Automated Relaying
* **Goal:** Streamline institutional onboarding and provide zero-click transaction execution.
* **Key Tasks & Deliverables:**
  * **KYC/AML Gateway:** Middleware integrating Sumsub/Persona for corporate entity verification before trading access is granted.
  * **Auto-Settlement Relayer:** Automated bot service that triggers the `settle_at_maturity()` function on Soroban as soon as the maturity block height is reached.
