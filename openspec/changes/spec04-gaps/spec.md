# Delta Spec: spec04-gaps — Call Registration & Contact Import Gaps

## Overview

This delta spec closes five gaps identified between the SPEC-04 specs and the current implementation. Changes span three domains: `retell-webhook`, `contact-import`, and a new `webhook-test-script` domain.

---

## Domain: retell-webhook

### MODIFIED Requirements

#### Requirement: Persistir metadata post-call de Retell (processingStatus)

When a new call record is created via the webhook upsert, the system MUST explicitly set `processingStatus` to `"unprocessed"`. When updating an existing call record, the system MUST NOT reset `processingStatus` to any value — it MUST be preserved as-is.

(Previously: the spec did not address `processingStatus` explicitly; the DB default was relied upon for new inserts, leaving the application-level contract undefined.)

##### Scenario: New call insert sets processingStatus explicitly

- GIVEN a Retell post-call payload arrives with a `retellCallId` that does not exist in `calls`
- WHEN the system creates a new call record
- THEN the record MUST be persisted with `processingStatus = "unprocessed"`

##### Scenario: Existing call update preserves processingStatus

- GIVEN a call record exists in `calls` with a non-null `processingStatus` (e.g., `"processing"`)
- WHEN the system receives a webhook payload for the same `retellCallId`
- THEN the system MUST update the call's metadata fields (transcript, audioUrl, etc.) without changing `processingStatus`

##### Scenario: Tool-call insert also sets processingStatus explicitly

- GIVEN an N8N tool-call payload arrives for a phone number that has no existing call record
- WHEN the system creates a new call record via the tool-call webhook
- THEN the record MUST be persisted with `processingStatus = "unprocessed"`

---

## Domain: contact-import

### MODIFIED Requirements

#### Requirement: Creación automática de batch — nombre desde archivo

When importing contacts, the batch name MUST match the uploaded file's name (`file.name`). If the file name is empty or missing, the system MUST fall back to the timestamp format `Import YYYY-MM-DD HH:MM`.

(Previously: the spec required `"Import YYYY-MM-DD HH:mm"` format unconditionally. This is now a fallback only.)

##### Scenario: Batch named after uploaded file

- GIVEN the user uploads a file named `clientes-zona-norte.csv`
- WHEN the import is processed
- THEN the created batch MUST have `name = "clientes-zona-norte.csv"`

##### Scenario: Fallback when file name is empty

- GIVEN the uploaded file has an empty or whitespace-only `file.name`
- WHEN the import is processed
- THEN the created batch MUST have `name` in format `Import YYYY-MM-DD HH:MM` using the current timestamp

---

#### Requirement: Asignación aleatoria de agentes

When assigning agents to imported contacts, the system MUST assign each contact to a randomly selected active agent. The system MUST NOT use sequential or round-robin ordering. Distribution does not need to be mathematically uniform — random selection per contact is sufficient.

(Previously: the spec was named "Asignación round-robin de agentes" and explicitly described sequential round-robin distribution. This requirement replaces it entirely.)

##### Scenario: Random assignment per contact

- GIVEN 3 active agents and 9 contacts to import
- WHEN the import runs
- THEN each contact is independently assigned to a randomly selected agent — the assignment order MUST NOT be predictable or sequential

##### Scenario: Sin agentes activos (unchanged)

- GIVEN no agents with `isActive = true` exist in the system
- WHEN the user attempts to import contacts
- THEN the system MUST return an error indicating no active agents are available

---

#### Requirement: Resumen post-importación con desglose por agente y enlace al batch

After a successful import, the API response MUST include an `agentBreakdown` array containing one entry per active agent who received contacts, each entry with: `agentId`, `agentName`, and `count` (number of contacts assigned to that agent). The sum of all `count` values MUST equal the total number of imported contacts.

The import dialog MUST display the per-agent breakdown as a list of rows showing agent name and contact count. The import dialog MUST also display a navigable link that takes the user to the batch list at `/batches`. If a `/batches/{batchId}` detail page exists, the link SHOULD navigate directly to the created batch.

(Previously: the spec required only `{ imported, duplicates, dnc, batchId, batchName }` in the response. `agentBreakdown` and the batch navigation link are new additions.)

##### Scenario: Import response includes agentBreakdown

- GIVEN an import of 9 contacts assigned to 3 active agents
- WHEN the import completes
- THEN the API response MUST include `agentBreakdown` as an array where:
  - Each entry has `agentId`, `agentName`, and `count`
  - The array has at most one entry per agent
  - The sum of all `count` values equals `imported` (the total imported contact count)

##### Scenario: Import dialog shows per-agent rows

- GIVEN an import completes successfully with 3 agents receiving contacts
- WHEN the success state of the import dialog is displayed
- THEN the dialog MUST show a row for each agent listing their name and the count of contacts assigned to them

##### Scenario: Import dialog shows batch navigation link

- GIVEN an import completes successfully and a batch was created with a known `batchId`
- WHEN the success state of the import dialog is displayed
- THEN the dialog MUST show a clickable link that navigates the user to `/batches` (or `/batches/{batchId}` when the detail page is available)

##### Scenario: No agents in breakdown for empty import

- GIVEN an import where all contacts are duplicates or invalid (0 contacts imported)
- WHEN the import completes
- THEN the API response MUST include `agentBreakdown: []` (empty array)

---

## Domain: webhook-test-script (NEW)

### Requirements

#### Requirement: Script de prueba para el webhook de Retell

A test script MUST exist at `scripts/test-webhook.ts`. The script MUST send a mock Retell post-call payload to the webhook endpoint running on the local development server. The script MUST refuse to execute if the target URL is not a localhost URL.

##### Scenario: Script sends mock payload to localhost

- GIVEN the local development server is running at `localhost:3000`
- WHEN the script is executed without a custom `WEBHOOK_URL` environment variable
- THEN the script MUST send an HTTP POST request to `http://localhost:3000/api/webhook/retell` with a valid mock Retell post-call payload, and MUST print the HTTP response status and body to stdout

##### Scenario: Script refuses to run against non-localhost URL

- GIVEN the `WEBHOOK_URL` environment variable is set to a non-localhost URL (e.g., `https://production.example.com/api/webhook/retell`)
- WHEN the script is executed
- THEN the script MUST exit with a non-zero exit code and print an error message stating it refuses to run against non-localhost URLs

##### Scenario: Script payload matches Retell post-call schema

- GIVEN the script is executed against localhost
- WHEN the POST request is sent
- THEN the payload MUST include at minimum: `call_id` (string), `agent_id` (string), `to_number` (string), `from_number` (string), `start_timestamp` (number), `end_timestamp` (number), `transcript` (string), `recording_url` (string or null)
