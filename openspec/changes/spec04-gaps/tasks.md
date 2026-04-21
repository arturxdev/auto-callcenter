# Tasks: spec04-gaps — Call Registration & Contact Import Gaps

## Phase 1: Backend — Repository Fix

- [ ] 1.1 In `src/entities/calls/repository.ts`, locate the `.values({})` INSERT block and add `processingStatus: "unprocessed"` as an explicit field. Verify the UPDATE path does NOT contain `processingStatus`.

## Phase 2: Backend — Import Route Fixes

- [ ] 2.1 In `src/app/api/contacts/import/route.ts`, replace the `batchName` timestamp formula with: `const batchName = file.name.trim() || \`Import ${new Date().toISOString().slice(0, 16).replace("T", " ")}\``

- [ ] 2.2 In `src/app/api/contacts/import/route.ts`, remove the `agentIndex` counter variable. Replace `activeAgents[agentIndex % activeAgents.length]` (and the `agentIndex++` increment) with: `const idx = Math.floor(Math.random() * activeAgents.length); const agent = activeAgents[idx]`

- [ ] 2.3 In `src/app/api/contacts/import/route.ts`, declare `const agentBreakdown = new Map<string, { agentName: string; count: number }>()` before the contact loop. Inside the loop (after picking the random agent), upsert the map entry: if entry exists increment `count`, otherwise set `{ agentName: agent.name, count: 1 }`.

- [ ] 2.4 In `src/app/api/contacts/import/route.ts`, add `agentBreakdown` to the JSON response: `agentBreakdown: Array.from(agentBreakdown.entries()).map(([agentId, v]) => ({ agentId, agentName: v.agentName, count: v.count }))`. Verify the sum of counts equals the `imported` total.

## Phase 3: Frontend — Import Dialog Update

- [ ] 3.1 In `src/widgets/contacts/import-dialog.tsx`, add `agentBreakdown: { agentId: string; agentName: string; count: number }[]` to the `ImportResult` interface (or create a named `AgentBreakdownEntry` interface and reference it).

- [ ] 3.2 In `src/widgets/contacts/import-dialog.tsx`, in the success state render block, add a per-agent rows section that maps over `result.agentBreakdown` and renders a row for each entry showing `agentName` and `count`.

- [ ] 3.3 In `src/widgets/contacts/import-dialog.tsx`, import `Link` from `next/link` and add `<Link href="/batches">Ver batch →</Link>` in the success state, below the agent breakdown rows.

## Phase 4: New Script — Webhook Test Utility

- [ ] 4.1 Create `scripts/test-webhook.ts`. Import `RetellPostCallPayload` from `@/shared/lib/retell` (or define an inline type matching the schema). Define a mock payload with required fields: `call_id`, `agent_id`, `to_number`, `from_number`, `start_timestamp`, `end_timestamp`, `transcript`, `recording_url`.

- [ ] 4.2 In `scripts/test-webhook.ts`, read `WEBHOOK_URL` from `process.env` with default `http://localhost:3000/api/webhook/retell`. Parse the URL hostname — if it is neither `localhost` nor `127.0.0.1`, print an error to `console.error` and call `process.exit(1)`.

- [ ] 4.3 In `scripts/test-webhook.ts`, after the guard, POST the mock payload to the target URL using `fetch` (or `node-fetch`). Print the response status and response body to stdout. Exit non-zero if the HTTP status indicates an error.

## Phase 5: Verification

- [ ] 5.1 Run `npx tsx scripts/test-webhook.ts` against a running local server. Query the `calls` table and confirm `processingStatus = "unprocessed"` on the newly created row.

- [ ] 5.2 Run `npx tsx scripts/test-webhook.ts` with `WEBHOOK_URL=https://example.com/api/webhook/retell` and confirm it exits with a non-zero exit code without sending any request.

- [ ] 5.3 Import a CSV file named `clientes-zona-norte.csv` via the UI. Verify the created batch has `name = "clientes-zona-norte.csv"` (not a timestamp).

- [ ] 5.4 Import 30 contacts with 3 active agents. Verify the import dialog success state shows per-agent rows with counts summing to 30 and a working "Ver batch →" link pointing to `/batches`.

- [ ] 5.5 Import any CSV where all rows are duplicates. Verify the API response contains `agentBreakdown: []`.
