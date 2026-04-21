# Design: spec04-gaps — Call Registration & Contact Import Gaps

## Technical Approach

Five isolated fixes across three files plus one new script. All changes are additive or surgical replacements with no schema migrations, no new API routes, and no breaking interface changes. The single API surface addition (`agentBreakdown` in the import response) is purely additive and backwards-compatible.

Each gap maps 1:1 to a targeted change:

| Gap | File | Change type |
|-----|------|-------------|
| 1 — processingStatus | `repository.ts` | Interface field + insert value |
| 2 — Batch name | `import/route.ts` | One-liner formula replacement |
| 3 — Random assignment | `import/route.ts` | Remove counter, inline random pick |
| 4 — Agent breakdown + batch link | `import/route.ts` + `import-dialog.tsx` | Backend Map + frontend rows + Link |
| 5 — Test script | `scripts/test-webhook.ts` | New file |

---

## Architecture Decisions

### Decision: processingStatus only on insert, never on update

**Choice**: Add `processingStatus: "unprocessed"` to the `.values({})` insert block only. Do not add it to the update-path `updates` object and do not add it to the `UpsertCallData` interface as a caller-settable field.

**Alternatives considered**:
- Allow callers to pass `processingStatus` via `UpsertCallData` — rejected because no caller needs to set it to anything other than `"unprocessed"` at creation time; exposing it would invite bugs where update calls accidentally reset a `"processed"` record.
- Leave it to the DB default — rejected because the spec now requires an explicit application-level contract, and DB defaults silently break if the column default is ever changed.

**Rationale**: The insert path is the only point where the value is known and invariant (`"unprocessed"`). The update path must preserve whatever the processing pipeline has set. Hardcoding in the insert block satisfies the spec without polluting the interface.

---

### Decision: Map-based agent breakdown accumulated during the insert loop

**Choice**: Declare a `Map<agentId, { agentName: string; count: number }>` before the contact loop. Inside the loop, after picking the random agent, increment the map entry. After the bulk insert, serialize to `AgentBreakdownEntry[]` for the response.

**Alternatives considered**:
- Post-hoc DB aggregate query (`GROUP BY assigned_agent_id`) — rejected: adds a DB round-trip, requires a join with `agents`, and couples the breakdown to what was persisted rather than what was processed.
- Array with `findIndex` per iteration — rejected: O(n×m) vs O(n) with Map.

**Rationale**: The Map is O(1) per lookup and is co-located with the assignment logic, making it trivially correct. `Array.from(agentBreakdown.values())` is a clean serialization with no extra queries.

---

### Decision: Link to `/batches` list, not `/batches/{batchId}` detail

**Choice**: `<Link href="/batches">` in the success state.

**Alternatives considered**:
- `<Link href={`/batches/${result.batchId}`}>` — technically correct per spec's "SHOULD" clause, but the detail page is not yet built ("Proximamente…" placeholder). A broken link is worse than a working list link.

**Rationale**: The spec says "The link SHOULD navigate directly to the created batch." The list page is live; the detail page is not. A `SHOULD` allows the list as fallback. This can be upgraded to the detail link when the page ships.

---

### Decision: Localhost guard in test script via URL prefix check

**Choice**: Parse `WEBHOOK_URL`, check that the hostname is `localhost` or `127.0.0.1`. If not, `console.error` + `process.exit(1)`.

**Alternatives considered**:
- Env var flag (`ALLOW_PROD=true`) — rejected: requires explicit opt-out discipline; easier to bypass accidentally.
- No guard — rejected: a dev running the script with a stale env file could hit production.

**Rationale**: A hostname check is deterministic and cannot be accidentally bypassed by forgetting to unset a flag. The script is only ever meant for local development.

---

## Data Flow

### Gap 4 — Agent Breakdown (import route)

```
POST /api/contacts/import
  │
  ├─ activeAgents = AgentsRepository.getActive()
  │
  ├─ agentBreakdown = new Map<agentId, { agentName, count }>()
  │
  ├─ for each contact in parsed:
  │    idx = Math.floor(Math.random() * activeAgents.length)
  │    agent = activeAgents[idx]
  │    contactsToInsert.push({ assignedAgentId: agent.id, ... })
  │    agentBreakdown.set(agent.id, { agentName: agent.name, count: +1 })
  │
  ├─ ContactsRepository.bulkInsert(contactsToInsert)
  │
  └─ return JSON {
       imported, duplicates, dnc, batchId, batchName,
       agentBreakdown: Array.from(agentBreakdown.values())
     }
```

### Gap 4 — Frontend Success State

```
ImportDialog (success state)
  │
  ├─ Aggregate stats (imported / duplicates / dnc / batchName)
  ├─ Per-agent rows: result.agentBreakdown.map(a => <row>{a.agentName} — {a.count}</row>)
  └─ <Link href="/batches">Ver batch →</Link>
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/entities/calls/repository.ts` | Modify | Add `processingStatus: "unprocessed"` to insert `.values({})` block |
| `src/app/api/contacts/import/route.ts` | Modify | Batch name from `file.name`; random agent pick; `agentBreakdown` Map + response field |
| `src/widgets/contacts/import-dialog.tsx` | Modify | Extend `ImportResult` type; per-agent rows; `<Link>` to `/batches` |
| `scripts/test-webhook.ts` | Create | Mock Retell payload POST to localhost webhook with guard |

---

## Interfaces / Contracts

### Gap 1 — `UpsertCallData` (no change to interface)

The `processingStatus` field is NOT added to `UpsertCallData`. It is hardcoded in the insert block. No callers need to change.

```typescript
// BEFORE — insert block (repository.ts:93-108)
.values({
  retellCallId: data.retellCallId ?? null,
  agentId: data.agentId!,
  contactId: data.contactId ?? null,
  customerName: data.customerName ?? null,
  customerPhone: data.customerPhone,
  customerAddress: data.customerAddress ?? null,
  startedAt: data.startedAt ?? null,
  endedAt: data.endedAt ?? null,
  durationSeconds: data.durationSeconds ?? null,
  result: data.result ?? null,
  summary: data.summary ?? null,
  transcript: data.transcript ?? null,
  audioUrl: data.audioUrl ?? null,
  cost: data.cost ?? null,
})

// AFTER — insert block
.values({
  retellCallId: data.retellCallId ?? null,
  agentId: data.agentId!,
  contactId: data.contactId ?? null,
  customerName: data.customerName ?? null,
  customerPhone: data.customerPhone,
  customerAddress: data.customerAddress ?? null,
  startedAt: data.startedAt ?? null,
  endedAt: data.endedAt ?? null,
  durationSeconds: data.durationSeconds ?? null,
  result: data.result ?? null,
  processingStatus: "unprocessed",   // ← GAP 1 FIX
  summary: data.summary ?? null,
  transcript: data.transcript ?? null,
  audioUrl: data.audioUrl ?? null,
  cost: data.cost ?? null,
})
```

---

### Gap 2 — Batch name (import/route.ts)

```typescript
// BEFORE (line 48-49)
const now = new Date()
const batchName = `Import ${now.toISOString().slice(0, 16).replace("T", " ")}`

// AFTER
const batchName =
  file.name.trim() ||
  `Import ${new Date().toISOString().slice(0, 16).replace("T", " ")}`
```

---

### Gap 3 — Random agent assignment (import/route.ts)

```typescript
// BEFORE (lines 65-85 — relevant parts)
let agentIndex = 0
for (const contact of parsed) {
  // ...
  contactsToInsert.push({
    assignedAgentId: activeAgents[agentIndex % activeAgents.length].id,
    // ...
  })
  agentIndex++
}

// AFTER — remove agentIndex, inline random pick
for (const contact of parsed) {
  // ...
  const idx = Math.floor(Math.random() * activeAgents.length)
  contactsToInsert.push({
    assignedAgentId: activeAgents[idx].id,
    // ...
  })
  // no agentIndex++ 
}
```

---

### Gap 4 — Agent breakdown (import/route.ts + import-dialog.tsx)

**Backend — new type + Map logic:**

```typescript
// New type (co-located at top of route.ts)
interface AgentBreakdownEntry {
  agentId: string
  agentName: string
  count: number
}

// Before the loop:
const agentBreakdown = new Map<string, AgentBreakdownEntry>()

// Inside the loop (after random pick):
const idx = Math.floor(Math.random() * activeAgents.length)
const agent = activeAgents[idx]
contactsToInsert.push({
  assignedAgentId: agent.id,
  // ...
})
const existing = agentBreakdown.get(agent.id)
if (existing) {
  existing.count++
} else {
  agentBreakdown.set(agent.id, { agentId: agent.id, agentName: agent.name, count: 1 })
}

// Response:
return NextResponse.json({
  imported: contactsToInsert.length,
  duplicates,
  dnc: dncCount,
  batchId: batch.id,
  batchName: batch.name,
  agentBreakdown: Array.from(agentBreakdown.values()),  // ← GAP 4 FIX
})
```

**Frontend — extended type + new UI rows + Link:**

```typescript
// BEFORE
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

interface ImportResult {
  imported: number
  duplicates: number
  dnc: number
  batchId: string
  batchName: string
}

// AFTER
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface AgentBreakdownEntry {
  agentId: string
  agentName: string
  count: number
}

interface ImportResult {
  imported: number
  duplicates: number
  dnc: number
  batchId: string
  batchName: string
  agentBreakdown: AgentBreakdownEntry[]   // ← GAP 4 FIX
}

// Success state additions (after existing grid rows):
{result.agentBreakdown.length > 0 && (
  <>
    <span className="text-muted-foreground col-span-2 text-xs font-medium pt-1">
      Por agente:
    </span>
    {result.agentBreakdown.map((a) => (
      <>
        <span key={a.agentId} className="text-muted-foreground pl-2">{a.agentName}:</span>
        <span key={a.agentId + "-count"}>{a.count}</span>
      </>
    ))}
  </>
)}

// Batch link (above the close button):
<Link
  href="/batches"
  className="text-sm text-primary underline-offset-4 hover:underline"
  onClick={() => handleClose(false)}
>
  Ver batch →
</Link>
```

---

### Gap 5 — Test script (scripts/test-webhook.ts)

```typescript
// scripts/test-webhook.ts
import { RetellPostCallPayload } from "@/shared/lib/retell"

const url = process.env.WEBHOOK_URL ?? "http://localhost:3000/api/webhook/retell"

// Guard: refuse non-localhost
const hostname = new URL(url).hostname
if (hostname !== "localhost" && hostname !== "127.0.0.1") {
  console.error(`ERROR: Refusing to run against non-localhost URL: ${url}`)
  process.exit(1)
}

const payload: RetellPostCallPayload = {
  call_id: "test-call-" + Date.now(),
  agent_id: process.env.TEST_AGENT_ID ?? "REPLACE_WITH_RETELL_AGENT_ID",
  call_status: "ended",
  to_number: process.env.TEST_PHONE ?? "+5215512345678",
  from_number: "+18005551234",
  start_timestamp: Date.now() - 60_000,
  end_timestamp: Date.now(),
  transcript: "Agent: Hello. Customer: Hi, I am interested.",
  recording_url: "https://example.com/recording.mp3",
  call_cost: 0.05,
  call_analysis: {
    call_summary: "Customer expressed interest.",
    call_successful: true,
    custom_analysis_data: { result: "positive" },
  },
}

console.log(`POST ${url}`)
console.log("Payload:", JSON.stringify(payload, null, 2))

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
})

const body = await res.text()
console.log(`Status: ${res.status}`)
console.log("Response:", body)

if (!res.ok) process.exit(1)
```

**Invocation:**

```bash
# Default (localhost:3000)
npx tsx scripts/test-webhook.ts

# Custom agent and phone
TEST_AGENT_ID=agent_abc123 TEST_PHONE=+5215599990000 npx tsx scripts/test-webhook.ts

# Will REFUSE (non-localhost):
WEBHOOK_URL=https://prod.example.com/api/webhook/retell npx tsx scripts/test-webhook.ts
```

The project already has `tsx ^4.21.0` as a dependency and uses it in `db:migrate` and `db:seed` scripts, so no new dependency is required.

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | Gap 1: new call has `processingStatus = "unprocessed"` in DB | Run `scripts/test-webhook.ts` against local dev, query DB |
| Manual | Gap 2: batch name matches filename | Import a CSV named `test-contacts.csv`, verify batch name in UI |
| Manual | Gap 3: random distribution | Import 30 contacts with 3 agents, verify non-sequential assignment in DB |
| Manual | Gap 4: breakdown shown in dialog | Import any file, verify per-agent rows sum to imported count |
| Manual | Gap 5: script guard | Run with `WEBHOOK_URL=https://example.com/...`, expect exit code 1 |
| Visual | Import dialog success state | Verify agent breakdown rows + "Ver batch" link render correctly |

No automated tests are added in this change. A dedicated testing change is out of scope per the proposal.

---

## Migration / Rollout

No migration required. The `processingStatus` column already exists with `default("unprocessed")` — adding the explicit value in the insert block has no effect on existing rows. All API response additions are additive. Frontend changes are UI-only with no persistence.

---

## Open Questions

- [ ] Should the batch link use `result.batchId` once the `/batches/[id]` detail page ships? (Deferred — upgrade the `href` in `import-dialog.tsx` when ready)
- [ ] Should `scripts/test-webhook.ts` also be added to `package.json` scripts as `"test:webhook"`? (Convenience — low priority)
