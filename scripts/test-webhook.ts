/**
 * Test script — POST a mock Retell post-call payload to the local webhook endpoint.
 *
 * Usage:
 *   npx tsx scripts/test-webhook.ts
 *   WEBHOOK_URL=http://localhost:3000/api/webhook/retell npx tsx scripts/test-webhook.ts
 *
 * The script refuses to run against any non-localhost URL to prevent
 * accidentally hitting staging or production environments.
 */

import type { RetellPostCallPayload } from "../src/shared/lib/retell"

const WEBHOOK_URL =
  process.env.WEBHOOK_URL ?? "http://localhost:3000/api/webhook/retell"

// Guard: only allow localhost / 127.0.0.1
const parsedUrl = new URL(WEBHOOK_URL)
if (parsedUrl.hostname !== "localhost" && parsedUrl.hostname !== "127.0.0.1") {
  console.error(
    `[test-webhook] ERROR: Refusing to run against non-localhost URL.\n` +
      `  Provided: ${WEBHOOK_URL}\n` +
      `  Only localhost or 127.0.0.1 targets are allowed.`
  )
  process.exit(1)
}

const mockPayload: RetellPostCallPayload = {
  call_id: `test-call-${Date.now()}`,
  agent_id: "test-agent-001",
  call_status: "ended",
  to_number: "+1234567890",
  from_number: "+0987654321",
  start_timestamp: Date.now() - 60_000,
  end_timestamp: Date.now(),
  transcript: "Agent: Hello, how can I help you today?\nUser: I am interested in your services.",
  recording_url: "",
  call_cost: 0.05,
  call_analysis: {
    call_summary: "Mock test call — contact expressed interest.",
    user_sentiment: "positive",
    call_successful: true,
  },
}

console.log(`[test-webhook] POSTing to ${WEBHOOK_URL}`)
console.log(`[test-webhook] Payload call_id: ${mockPayload.call_id}`)

const response = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(mockPayload),
})

const body = await response.text()

console.log(`[test-webhook] HTTP ${response.status} ${response.statusText}`)
console.log(`[test-webhook] Response body:\n${body}`)

if (!response.ok) {
  console.error(`[test-webhook] Request failed with status ${response.status}`)
  process.exit(1)
}

console.log("[test-webhook] Done.")
