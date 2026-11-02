const localApiUrl = `${window.location.protocol}//${window.location.hostname}:8000`
const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? localApiUrl

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    let message = '요청을 처리하지 못했습니다.'
    try {
      const errorBody = (await response.json()) as { detail?: string }
      if (typeof errorBody.detail === 'string') message = errorBody.detail
    } catch {
      // Use the safe default message when the response is not JSON.
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
