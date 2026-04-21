import { z } from "zod"
import { callResultSchema } from "@/shared/lib/http"

const customAnalysisDataSchema = z
  .object({
    result: callResultSchema.optional(),
  })
  .passthrough()

export const retellPostCallPayloadSchema = z
  .object({
    call_id: z.string().min(1),
    agent_id: z.string().min(1),
    call_status: z.string().min(1),
    start_timestamp: z.number().int().nonnegative(),
    end_timestamp: z.number().int().nonnegative(),
    transcript: z.string().default(""),
    recording_url: z.string().url().or(z.literal("")).default(""),
    to_number: z.string().default(""),
    from_number: z.string().default(""),
    call_cost: z.number().nonnegative().default(0),
    call_analysis: z
      .object({
        call_summary: z.string().optional(),
        user_sentiment: z.string().optional(),
        call_successful: z.boolean().optional(),
        custom_analysis_data: customAnalysisDataSchema.optional(),
      })
      .optional(),
  })
  .refine((payload) => payload.to_number.length > 0 || payload.from_number.length > 0, {
    message: "A phone number is required",
    path: ["to_number"],
  })

export type RetellPostCallPayload = z.infer<typeof retellPostCallPayloadSchema>

export const retellToolPayloadSchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  date: z.string().trim().min(1),
  block: z.string().trim().min(1),
  time: z.string().trim().min(1),
  transcription: z.string().default(""),
})

export type RetellToolPayload = z.infer<typeof retellToolPayloadSchema>
