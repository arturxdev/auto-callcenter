# Proposal: SPEC-04 Gaps — Call Registration & Contact Import

## Intent

SPEC-04 defines the complete flow for registering Retell post-call webhooks and importing contacts via CSV/Excel. A validation pass found five concrete gaps between the spec and the current implementation:

1. The webhook upsert never sets `processingStatus: "unprocessed"` on new call inserts, even though the schema defines this field as required for downstream processing pipelines.
2. Batch names are generated from a timestamp instead of from the uploaded file's name, making batches hard to identify.
3. Agent assignment during import is sequential (round-robin) instead of random, contradicting the spec's "aleatoriamente" requirement.
4. The post-import summary dialog shows aggregate counts but is missing a per-agent breakdown and a navigable link to the newly created batch.
5. There are no test scripts or documented manual procedures for validating the webhook integration against Retell.

This change closes all five gaps with minimal blast radius: no schema migrations needed, no API surface changes except for an additive field in the import response.

## Scope

### In Scope
- Set `processingStatus: "unprocessed"` explicitly on new call inserts in `CallsRepository.upsert`
- Replace timestamp-based batch name with `file.name` in the import route
- Replace sequential `agentIndex` with `Math.floor(Math.random() * activeAgents.length)` per contact
- Extend the import API response to include `agentBreakdown: { agentId, agentName, count }[]`
- Update `ImportDialog` to display per-agent breakdown and a clickable link to `/batches/{batchId}`
- Add a manual webhook test script (`scripts/test-webhook.ts`) with documented curl examples

### Out of Scope
- Building a full `/batches/[id]` detail page (Batches page currently shows "Proximamente...")
- Changing the calls schema (no migration needed — `processingStatus` already has `.default("unprocessed")`)
- Replacing the DB-level default with an application-level default for existing rows
- Automated E2E tests for the Retell integration (deferred to a dedicated testing change)

## Approach

**Gap 1 — processingStatus on webhook**
In `CallsRepository.upsert`, the new-insert block (line ~91) does not pass `processingStatus`. The DB default (`"unprocessed"`) already fires, so behavior is technically correct today, but explicit setting guards against future default changes and satisfies spec traceability. Add `processingStatus: "unprocessed"` to both the `UpsertCallData` interface and the `.values({...})` insert block. No update path change needed — updates should never reset `processingStatus`.

**Gap 2 — Batch name from filename**
Replace line 49 in `import/route.ts`:
```ts
// Before
const batchName = `Import ${now.toISOString().slice(0, 16).replace("T", " ")}`
// After
const batchName = file.name
```
Simple one-line fix. The `now` variable becomes unused and can be removed.

**Gap 3 — Random agent assignment**
Replace sequential `agentIndex % activeAgents.length` with a per-contact random pick:
```ts
// Before
assignedAgentId: activeAgents[agentIndex % activeAgents.length].id,
agentIndex++
// After
assignedAgentId: activeAgents[Math.floor(Math.random() * activeAgents.length)].id,
```
Remove the `let agentIndex = 0` declaration and the `agentIndex++` statement.

**Gap 4 — Import summary: agent breakdown + batch link**
Backend change: track a `Map<agentId, { name, count }>` while building `contactsToInsert`. After the bulk insert, serialize it to `agentBreakdown: { agentId, agentName, count }[]` and add it to the JSON response. Agent names are available from `activeAgents` (already fetched).

Frontend change in `ImportDialog`:
- Extend `ImportResult` interface with `agentBreakdown`.
- Add a section in the success view listing agent assignment counts.
- Add a "Ver batch" link: `<Link href={`/batches/${result.batchId}`}>Ver batch →</Link>`. Since the batches detail page is not yet built, the link navigates to the list page (`/batches`) as a fallback, or shows the batchId if no detail route exists. Use Next.js `<Link>` (already available via `next/link`).

**Gap 5 — Webhook test procedure**
Add `scripts/test-webhook.ts` — a runnable ts-node/tsx script that sends a mock Retell post-call payload to `localhost:3000/api/webhook/retell`. Document the expected payload shape and how to run it in a `README` block within the file. Also add a `curl` equivalent in comments.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/entities/calls/repository.ts` | Modified | Add `processingStatus` to `UpsertCallData` interface; set it explicitly in insert block |
| `src/app/api/contacts/import/route.ts` | Modified | Use `file.name` as batch name; random agent pick; compute and return `agentBreakdown` |
| `src/widgets/contacts/import-dialog.tsx` | Modified | Show agent breakdown rows; add "Ver batch" link in success state |
| `scripts/test-webhook.ts` | New | Manual test script for Retell webhook with documented curl examples |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `file.name` may be empty or contain unsafe chars for display | Low | Trim and fallback to timestamp if empty: `file.name.trim() \|\| \`Import \${now.toISOString().slice(0,16).replace("T"," ")}\`` |
| Random distribution may be uneven for small contact sets | Low | Acceptable — spec says "aleatoriamente", not "evenly distributed"; document if it becomes an issue |
| Batches detail page not built — link navigates to list | Low | Navigate to `/batches` with a toast/note indicating the batch name; upgrade link once detail page ships |
| Webhook test script accidentally runs against prod | Low | Add a guard: script reads `WEBHOOK_URL` env var and refuses if it doesn't contain `localhost` |

## Rollback Plan

All changes are additive or trivially reversible:
- Gap 1: Remove the explicit `processingStatus` from insert; DB default still fires.
- Gap 2: Revert to the timestamp-based name formula.
- Gap 3: Revert to sequential `agentIndex` counter.
- Gap 4: Remove `agentBreakdown` from response; hide the new dialog section behind a feature check.
- Gap 5: Delete `scripts/test-webhook.ts`.

No schema migrations are involved. No breaking API changes. Rollback requires a single deploy of the reverted commit.

## Dependencies

- `activeAgents` array is already fetched before the loop — no extra queries needed for agent names in the breakdown.
- `/batches/[id]` detail page is a future dependency for the "Ver batch" link to be fully functional.
- Retell sandbox account required for manually running the webhook test script.

## Success Criteria

- [ ] New calls inserted via webhook have `processingStatus = "unprocessed"` in the database (verified by direct DB query after a test call).
- [ ] Batch name matches the uploaded filename exactly (verified in the batches table after import).
- [ ] Running 1000-contact imports 5 times produces no monotonically sequential agent assignment pattern (chi-square or visual inspection).
- [ ] Import dialog success state shows per-agent row counts summing to `imported`.
- [ ] Import dialog shows a "Ver batch" link that navigates to `/batches` (or `/batches/{id}` once available).
- [ ] `scripts/test-webhook.ts` runs without error against a local dev server and returns `{ ok: true }`.
