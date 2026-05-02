import { z } from "zod"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1"

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

type QueryValue = string | number | boolean | null | undefined
export type Query = Record<string, QueryValue>

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE_URL}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined) continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function parseError(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export async function apiGet<T>(
  path: string,
  schema: z.ZodType<T>,
  query?: Query,
): Promise<T> {
  const res = await fetch(buildUrl(path, query), {
    headers: { Accept: "application/json" },
  })
  if (!res.ok) {
    throw new ApiError(
      res.status,
      `GET ${path} failed with ${res.status}`,
      await parseError(res),
    )
  }
  return schema.parse(await res.json())
}

export async function apiPost<T>(
  path: string,
  schema: z.ZodType<T>,
  body: unknown,
): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new ApiError(
      res.status,
      `POST ${path} failed with ${res.status}`,
      await parseError(res),
    )
  }
  return schema.parse(await res.json())
}

export async function apiUpload<T>(
  path: string,
  schema: z.ZodType<T>,
  file: File,
  fieldName = "file",
): Promise<T> {
  const form = new FormData()
  form.append(fieldName, file)
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: { Accept: "application/json" },
    body: form,
  })
  if (!res.ok) {
    throw new ApiError(
      res.status,
      `POST ${path} failed with ${res.status}`,
      await parseError(res),
    )
  }
  return schema.parse(await res.json())
}
