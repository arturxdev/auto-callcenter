# Verify Report: spec04-gaps — Call Registration & Contact Import Gaps

**Date:** 2026-03-18  
**Overall Status: PASS**

All 5 gaps fully implemented. TypeScript check: 0 errors.

---

## Gap 1 — processingStatus (`src/entities/calls/repository.ts`)

**Status: PASS**

- Line 108: `processingStatus: "unprocessed"` present in `.values({})` INSERT block ✓
- UPDATE path (lines 58–80): no `processingStatus` field anywhere in the `updates` object ✓
- `UpsertCallData` interface (lines 15–30): does NOT expose `processingStatus` — insert-only contract ✓

Spec scenarios covered:
- New call insert sets processingStatus explicitly ✓
- Existing call update preserves processingStatus (field absent from updates object) ✓
- Tool-call insert also sets processingStatus (same `upsert` code path) ✓

---

## Gap 2 — Batch name from filename (`src/app/api/contacts/import/route.ts`)

**Status: PASS**

- Line 48: `const batchName = file.name.trim() || \`Import ${new Date().toISOString().slice(0, 16).replace("T", " ")}\`` ✓
- Uses `file.name` as primary source ✓
- Falls back to timestamp format when name is empty/whitespace ✓

Spec scenarios covered:
- Batch named after uploaded file ✓
- Fallback when file name is empty ✓

---

## Gap 3 — Random agent assignment (`src/app/api/contacts/import/route.ts`)

**Status: PASS**

- Line 74: `const idx = Math.floor(Math.random() * activeAgents.length)` ✓
- Line 75: `const agent = activeAgents[idx]` ✓
- No `agentIndex` counter variable anywhere in the file ✓

Spec scenarios covered:
- Random assignment per contact ✓
- No active agents error case (lines 34–39) ✓

**Minor note:** Comment on line 32 reads `// Get active agents for round-robin` — stale, cosmetic only.

---

## Gap 4 — Agent breakdown + batch link

**Status: PASS**

### Backend (`src/app/api/contacts/import/route.ts`)

- Line 64: `Map<string, { agentName: string; count: number }>` declared before contact loop ✓
- Lines 87–92: Map upsert (increment or init count=1) inside loop ✓
- Lines 107–111: Serialized to `agentBreakdown` array via `Array.from(agentBreakdown.entries()).map(...)` ✓
- Response shape: `{ agentId, agentName, count }` per entry ✓

### Frontend (`src/widgets/contacts/import-dialog.tsx`)

- Lines 16–20: `AgentBreakdownEntry` interface defined ✓
- Line 28: `agentBreakdown: AgentBreakdownEntry[]` in `ImportResult` ✓
- Lines 117–129: Per-agent rows rendered (Fragment grid, agentName + count) ✓
- Lines 130–136: `<Link href="/batches">Ver batch →</Link>` present ✓
- `Link` imported from `next/link` (line 5) ✓

Spec scenarios covered:
- Import response includes agentBreakdown ✓
- Import dialog shows per-agent rows ✓
- Import dialog shows batch navigation link to `/batches` ✓
- Empty import returns `agentBreakdown: []` ✓

---

## Gap 5 — Test script (`scripts/test-webhook.ts`)

**Status: PASS**

- Localhost guard (lines 18–26): parses hostname, rejects non-`localhost`/`127.0.0.1`, exits non-zero ✓
- Mock payload typed as `RetellPostCallPayload` — confirmed shape via `tsc` ✓
- All required fields present: `call_id`, `agent_id`, `call_status`, `to_number`, `from_number`, `start_timestamp`, `end_timestamp`, `transcript`, `recording_url`, `call_cost` ✓
- Exits non-zero on HTTP error (lines 60–63) ✓

Spec scenarios covered:
- Script sends mock payload to localhost ✓
- Script refuses non-localhost URL ✓
- Script payload matches Retell post-call schema ✓

---

## TypeScript Check

```
npx tsc --noEmit
```

**Result: 0 errors** ✓

---

## Issues Found

| Severity | Location | Issue |
|----------|----------|-------|
| Cosmetic | `import/route.ts:32` | Stale comment `// Get active agents for round-robin` — should say "random assignment". No functional impact. |

No blocking issues.

---

## Summary

| Gap | Description | Status |
|-----|-------------|--------|
| 1 | `processingStatus: "unprocessed"` on insert only | PASS |
| 2 | Batch name from `file.name` with timestamp fallback | PASS |
| 3 | `Math.random()` per contact, no `agentIndex` counter | PASS |
| 4 | `agentBreakdown` in API response + per-agent rows + `/batches` link | PASS |
| 5 | `scripts/test-webhook.ts` with localhost guard + valid payload | PASS |
| — | TypeScript (`npx tsc --noEmit`) | PASS (0 errors) |
