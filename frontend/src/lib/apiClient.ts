import { useSessionStore } from '../store/sessionStore';
import { ApiErrorResponse, ErrorCode } from '@khojyatra/types';

export class AppApiError extends Error {
  constructor(
    public code: ErrorCode,
    public override message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppApiError.prototype);
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  authToken?: string;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, authToken, headers, ...customConfig } = options;

  let url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!url.startsWith('/api/v1')) {
    url = `/api/v1${url}`;
  }

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((val) => searchParams.append(key, String(val)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Get active session id
  const sessionId = useSessionStore.getState().sessionId || useSessionStore.getState().initializeSession();

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Session-Id': sessionId,
    ...(headers as Record<string, string>)
  };

  if (authToken) {
    requestHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    headers: requestHeaders,
    ...customConfig
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = json as ApiErrorResponse | null;
    const code: ErrorCode = errorBody?.error?.code || 'INTERNAL';
    const message = errorBody?.error?.message || response.statusText || 'Request failed';
    throw new AppApiError(code, message, response.status, errorBody?.error?.details);
  }

  // Convention: unpack standard { data, meta } envelope
  return json?.data !== undefined ? json.data : json;
}
