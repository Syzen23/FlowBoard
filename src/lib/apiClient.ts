import { getFirebaseAuth } from "@/src/features/auth/firebaseClient";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

type ApiClientOptions<TBody> = {
  body?: TBody;
  authenticated?: boolean;
  headers?: HeadersInit;
};

export type ApiErrorData = {
  error?: {
    message?: string;
  };
  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export class ApiNetworkError extends Error {
  cause: unknown;

  constructor(cause: unknown) {
    super("API request failed because the server is unreachable");
    this.name = "ApiNetworkError";
    this.cause = cause;
  }
}

export const apiClient = {
  get<TResponse>(path: string, options?: Omit<ApiClientOptions<never>, "body">) {
    return request<TResponse, never>("GET", path, options);
  },

  post<TResponse, TBody = unknown>(path: string, body: TBody, options?: Omit<ApiClientOptions<TBody>, "body">) {
    return request<TResponse, TBody>("POST", path, { ...options, body });
  },

  patch<TResponse, TBody = unknown>(path: string, body: TBody, options?: Omit<ApiClientOptions<TBody>, "body">) {
    return request<TResponse, TBody>("PATCH", path, { ...options, body });
  },

  delete(path: string, options?: Omit<ApiClientOptions<never>, "body">) {
    return request<void, never>("DELETE", path, options);
  },
};

async function request<TResponse, TBody>(
  method: string,
  path: string,
  options: ApiClientOptions<TBody> = {}
): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(createApiUrl(path), {
      method,
      headers: await createHeaders(options),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new ApiNetworkError(error);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, getErrorMessage(data, response.status), data);
  }

  return data as TResponse;
}

async function createHeaders<TBody>(options: ApiClientOptions<TBody>): Promise<Headers> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.authenticated !== false) {
    const token = await getCurrentUserToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return headers;
}

async function getCurrentUserToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  return user ? user.getIdToken() : null;
}

function createApiUrl(path: string): string {
  if (!apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }

  const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(response.status, "API response was not valid JSON", text);
  }
}

function getErrorMessage(data: unknown, status: number): string {
  if (isApiErrorData(data)) {
    return data.error?.message || `API request failed with status ${status}`;
  }

  return `API request failed with status ${status}`;
}

function isApiErrorData(value: unknown): value is ApiErrorData {
  return typeof value === "object" && value !== null;
}
