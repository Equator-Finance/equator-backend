# AI Agent Development Guidelines (`equator-backend`)

This repository is configured for an **AI-Native Stellar Development Workflow**.

---

## 🛠 Active AI Resources & Tools

### 1. Raven Remote MCP Server (`https://raven.stellar.buzz`)
This repository includes `.mcp.json` connecting your AI assistant to **Raven**, the remote Stellar Model Context Protocol (MCP) server.
* Use `search` to query live Stellar RPC event subscription methods, Horizon APIs, and SEP specs.
* Use `execute` to query live network transactions and testnet block heights.

### 2. Stellar Developer Skills
Official Stellar developer skills are located in `.github/skills/`:
* 🧠 `data`: Guidelines for querying Stellar RPC, indexing Soroban event streams, and using `@stellar/stellar-sdk`.
* 🧠 `standards`: Guidelines for Stellar Ecosystem Proposals (SEPs) and CAPs.

### 3. Documentation Context (`llms.txt`)
AI assistants can reference the structured documentation index at:
* 🌐 `https://developers.stellar.org/llms.txt`

---

## 🤖 Rules for AI Assistants Working on Backend

1. **NestJS Architecture Integrity:** Maintain modular separation (`RfqModule`, `IndexerModule`, `RelayerModule`).
2. **Soroban RPC Event Polling:** Use batch RPC event queries with exponential backoff and error recovery.
3. **Prisma Type Safety:** Ensure all database mutations use Prisma Client types and handle transaction rollbacks gracefully.
