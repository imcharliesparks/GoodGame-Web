
# CODEX.md

## Project Overview

This repository contains a **modern full-stack web application** built with:

- **Next.js (App Router)**
- **React**
- **TypeScript**
- **Clerk Authentication**
- **Tailwind CSS**
- **ShadCN UI**
- **Bun** (package manager & local runtime)

The project is being developed in **clear, incremental phases**.  
At this stage, the focus is **purely on standard data fetching and backend architecture**, not AI or RAG.

---

## Current Phase: Core App & Data Layer (NO AI)

🚫 **IMPORTANT**  
This project is **NOT** using RAG, embeddings, vector databases, or AI yet.

Do **not** introduce:
- LlamaIndex usage
- OpenAI calls
- Vector databases
- Streaming AI responses
- AI-related abstractions

These will be added **later**, once the data layer is complete and stable.

---

## High-Level Goals

### Primary Goals
1. Establish a **clean Next.js backend architecture**
2. Create **auth-protected API routes**
3. Define **clear data boundaries**
4. Keep logic modular and boring
5. Ensure the system is **AI-ready later without refactors**

### Non-Goals (for now)
- No AI features
- No RAG pipelines
- No background workers
- No job queues
- No edge runtimes

---

## Architectural Principles

### 1. Clear Separation of Concerns

| Layer | Responsibility |
|-----|----------------|
| `app/api/*` | HTTP & auth boundary |
| `lib/data/*` | Business logic & data access |
| `lib/types/*` | Shared type contracts |
| `components/*` | UI only |
| `app/*` pages | Composition & routing |

- API routes **never** contain business logic
- Data logic **never** imports Next.js or Clerk
- Client components **never** access data directly

---

### 2. Authentication Rules

- Authentication is handled via **Clerk**
- Auth is enforced **at the API boundary**
- Every protected API route must:
    - Identify the user
    - Reject unauthenticated requests
- Client code must never assume authorization

---

### 3. API Design Rules

- REST-style routes under `/app/api`
- JSON-only request/response
- Consistent response shape:

```ts
{
  success: boolean;
  data?: T;
  error?: string;
}
