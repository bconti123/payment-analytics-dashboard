import { z } from "zod"

import { ApiError, apiGet } from "./client"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1"

export const userRoleSchema = z.enum(["admin", "viewer"])
export type UserRole = z.infer<typeof userRoleSchema>

export const meSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: userRoleSchema,
  created_at: z.string(),
})
export type Me = z.infer<typeof meSchema>

export const tokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
})
export type Token = z.infer<typeof tokenSchema>

export async function login(email: string, password: string): Promise<Token> {
  const body = new URLSearchParams()
  body.set("username", email)
  body.set("password", password)
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  })
  if (!res.ok) {
    let parsed: unknown = null
    try {
      parsed = await res.json()
    } catch {
      // ignore
    }
    throw new ApiError(res.status, `Login failed with ${res.status}`, parsed)
  }
  return tokenSchema.parse(await res.json())
}

export function getMe(): Promise<Me> {
  return apiGet("/auth/me", meSchema)
}
