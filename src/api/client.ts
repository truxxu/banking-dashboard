import type { ApiError } from './types'

export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, body: ApiError) {
    super(body.message)
    this.status = status
    this.code = body.code
  }
}

/** Every request goes to /api/*; MSW answers it in the browser. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ code: 'unknown', message: res.statusText }))) as ApiError
    throw new ApiRequestError(res.status, body)
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

export function toSearchParams(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}
