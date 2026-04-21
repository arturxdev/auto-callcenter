import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { z, ZodError } from "zod"
import { auth } from "@/shared/lib/auth"

export const appRoleSchema = z.enum(["super_admin", "admin", "viewer"])
export type AppRole = z.infer<typeof appRoleSchema>

export const contactStatusSchema = z.enum([
  "pending",
  "called",
  "converted",
  "rejected",
  "dnc",
  "no_answer",
])

export const callResultSchema = z.enum([
  "positive",
  "rejected",
  "dnc",
  "no_answer",
])

type AuthenticatedSession = Session & {
  user: Session["user"] & { id: string; role: AppRole }
}

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}

export function parseWithSchema<T>(schema: z.ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "Request validation failed",
      result.error.flatten()
    )
  }

  return result.data
}

export async function requireSession(allowedRoles?: readonly AppRole[]) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required")
  }

  const role = parseWithSchema(appRoleSchema, session.user.role)
  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have access to this resource")
  }

  return session as AuthenticatedSession
}

export function assertWebhookSecret(
  request: Request,
  ...secretEnvNames: string[]
) {
  const secret = secretEnvNames
    .map((name) => process.env[name])
    .find((value) => typeof value === "string" && value.length > 0)

  if (!secret) {
    throw new ApiError(
      500,
      "WEBHOOK_NOT_CONFIGURED",
      "Webhook authentication is not configured"
    )
  }

  const bearer = request.headers.get("authorization")
  const provided =
    request.headers.get("x-webhook-secret") ??
    (bearer?.startsWith("Bearer ") ? bearer.slice(7) : null)

  if (!provided) {
    throw new ApiError(401, "UNAUTHORIZED", "Webhook authentication failed")
  }

  const expectedBuffer = Buffer.from(secret)
  const providedBuffer = Buffer.from(provided)

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new ApiError(401, "UNAUTHORIZED", "Webhook authentication failed")
  }
}

export function handleRouteError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.status }
    )
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "Request validation failed",
          details: error.flatten(),
        },
      },
      { status: 400 }
    )
  }

  console.error("Unhandled route error:", error)

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    },
    { status: 500 }
  )
}
