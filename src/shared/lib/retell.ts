export interface RetellPostCallPayload {
  call_id: string
  agent_id: string
  call_status: string
  start_timestamp: number
  end_timestamp: number
  transcript: string
  recording_url: string
  to_number: string
  from_number: string
  call_cost: number
  call_analysis?: {
    call_summary?: string
    user_sentiment?: string
    call_successful?: boolean
    custom_analysis_data?: Record<string, unknown>
  }
}

export interface RetellToolPayload {
  name: string
  address: string
  phone: string
  date: string
  block: string
  time: string
  transcription: string
}

export function mapPostCallToDb(payload: RetellPostCallPayload) {
  const durationSeconds =
    payload.start_timestamp && payload.end_timestamp
      ? Math.round((payload.end_timestamp - payload.start_timestamp) / 1000)
      : null

  return {
    retellCallId: payload.call_id,
    customerPhone: payload.to_number || payload.from_number,
    startedAt: payload.start_timestamp
      ? new Date(payload.start_timestamp)
      : null,
    endedAt: payload.end_timestamp ? new Date(payload.end_timestamp) : null,
    durationSeconds,
    transcript: payload.transcript || null,
    audioUrl: payload.recording_url || null,
    cost: payload.call_cost?.toString() ?? null,
    summary: payload.call_analysis?.call_summary ?? null,
  }
}

export function mapToolCallToDb(payload: RetellToolPayload) {
  return {
    customerName: payload.name || null,
    customerAddress: payload.address || null,
    customerPhone: payload.phone,
    summary: `Appointment: ${payload.date} — Block: ${payload.block} — Time: ${payload.time}`,
    transcript: payload.transcription || null,
    result: "positive" as const,
  }
}
