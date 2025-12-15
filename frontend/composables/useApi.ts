import { FetchError } from 'ofetch'

export class ApiError extends Error {
  status: number
  code: string
  details: unknown

  constructor(status: number, code: string, details?: unknown) {
    super(code)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type QueryParams = Record<string, string | number | boolean | null | undefined>

interface RequestOptions {
  body?: unknown
  query?: QueryParams
}

let refreshPromise: Promise<boolean> | null = null

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error
  if (error instanceof FetchError) {
    const status = error.response?.status ?? 0
    const data = error.response?._data as { message?: string | string[]; details?: unknown } | undefined
    const message = Array.isArray(data?.message) ? 'VALIDATION_FAILED' : data?.message
    const details = Array.isArray(data?.message) ? data?.message : data?.details
    return new ApiError(status, message ?? (status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR'), details)
  }
  return new ApiError(0, error instanceof Error ? error.message : 'UNKNOWN_ERROR')
}

const cleanQuery = (query?: QueryParams): Record<string, string | number | boolean> | undefined => {
  if (!query) return undefined
  const result: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    result[key] = value
  }
  return result
}

const extractFilename = (disposition: string | null, fallback: string): string => {
  if (!disposition) return fallback
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  if (utf8?.[1]) return decodeURIComponent(utf8[1])
  const plain = /filename="?([^";]+)"?/i.exec(disposition)
  return plain?.[1] ?? fallback
}

export const useApi = () => {
  const config = useRuntimeConfig()
  const auth = useAuthStore()
  const baseURL = config.public.apiBase

  const authHeaders = (): Record<string, string> => (auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {})

  const refreshOnce = (): Promise<boolean> => {
    if (!refreshPromise) {
      refreshPromise = auth.refresh().finally(() => {
        refreshPromise = null
      })
    }
    return refreshPromise
  }

  const shouldRetry = (path: string, status: number | undefined, retry: boolean): boolean =>
    retry && status === 401 && Boolean(auth.refreshToken) && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')

  const request = async <T>(method: HttpMethod, path: string, options: RequestOptions = {}, retry = true): Promise<T> => {
    try {
      return await $fetch<T>(path, {
        baseURL,
        method,
        body: options.body as Record<string, unknown> | undefined,
        query: cleanQuery(options.query),
        headers: authHeaders(),
      })
    } catch (error) {
      const status = error instanceof FetchError ? error.response?.status : undefined
      if (shouldRetry(path, status, retry)) {
        const refreshed = await refreshOnce()
        if (refreshed) return request<T>(method, path, options, false)
        await auth.forceLogout('SESSION_EXPIRED')
      }
      throw toApiError(error)
    }
  }

  const download = async (path: string, body: unknown, fallbackFilename: string, retry = true): Promise<void> => {
    try {
      const response = await $fetch.raw<Blob>(path, {
        baseURL,
        method: 'POST',
        body: body as Record<string, unknown>,
        headers: authHeaders(),
        responseType: 'blob',
      })
      const blob = response._data as Blob
      const filename = extractFilename(response.headers.get('content-disposition'), fallbackFilename)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      const status = error instanceof FetchError ? error.response?.status : undefined
      if (shouldRetry(path, status, retry)) {
        const refreshed = await refreshOnce()
        if (refreshed) return download(path, body, fallbackFilename, false)
        await auth.forceLogout('SESSION_EXPIRED')
      }
      throw toApiError(error)
    }
  }

  return {
    get: <T>(path: string, query?: QueryParams) => request<T>('GET', path, { query }),
    post: <T>(path: string, body?: unknown, query?: QueryParams) => request<T>('POST', path, { body, query }),
    put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
    delete: <T>(path: string, query?: QueryParams) => request<T>('DELETE', path, { query }),
    download,
  }
}
