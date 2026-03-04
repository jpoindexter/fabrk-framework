# FABRK Vision

## The Problem

Next.js has great DX. But Vercel's model is: free hosting, then charge for every useful feature — ISR, image optimization, edge middleware, analytics, log drains. Every useful thing costs money. It gets slow (cold starts). It gets big. You're paying for the abstraction, not the infra.

## What FABRK Is

**Next.js-caliber DX, deploys anywhere, no platform tax.**

| | Next.js + Vercel | FABRK |
|--|--|--|
| File-system routing | ✓ | ✓ |
| SSR | ✓ | ✓ |
| Components | ✗ (bring your own) | ✓ 100+ built in |
| Design system | ✗ | ✓ 18 themes |
| Auth | ✗ | ✓ adapter included |
| Payments | ✗ | ✓ adapter included |
| Email | ✗ | ✓ adapter included |
| AI primitives | ✗ | ✓ `useAgent`, streaming, tools |
| Deploy target | Vercel (or fight it) | Cloudflare, Fly, Railway, VPS, anything |
| Cost at scale | Grows fast | Infra cost only |

## Who It's For

A developer (or AI coding agent) who wants to ship multiple polished apps quickly — without reinventing auth, payments, and UI from scratch every time, and without getting locked into a platform that charges for every useful feature.

## What It Is Not

FABRK is a **web framework with tasteful AI primitives** — not a LangGraph clone, not a Mastra clone, not an AI orchestration platform.

The following do not belong in FABRK:
- StateGraph / cyclic workflow engines (that's LangGraph's job)
- Agent networks / supervisor orchestration (separate concern)
- Time-travel debugging (agent platform feature)
- A2A protocol compliance (niche, separate product)
- Computer use tools (separate product)
- Voice / realtime audio (separate product)
- 67-provider LLM registry (pick one clean abstraction)

## The Test

Before adding any feature: **"Would someone building their 3rd FABRK app need this, or are we chasing competitor parity?"**

If it's parity-chasing, skip it.

## The Stack

- **Runtime:** Vite 7, file-system routing, SSR, edge-ready
- **UI:** 100+ components, 18 themes, design system
- **Services:** Auth, payments, email, storage — adapter pattern, swap providers
- **AI:** `useAgent` hook, SSE streaming, tool execution, basic evals
- **Deploy:** Any Node/edge runtime — Cloudflare, Fly, Railway, bare VPS
