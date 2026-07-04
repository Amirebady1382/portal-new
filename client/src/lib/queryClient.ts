import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { errorHandler } from "./error-handler";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login')) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    }

    let errorData: any = { status: res.status };
    
    try {
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorData = await res.json();
        errorData.status = res.status;
      } else {
        const text = await res.text();
        errorData.message = text || res.statusText;
        errorData.status = res.status;
      }
    } catch (parseError) {
      // اگر پارس کردن خطا با مشکل مواجه شد، از پیام پیش‌فرض استفاده کن
      errorData.message = res.statusText;
      errorData.status = res.status;
    }
    
    // استفاده از error handler برای استاندارد کردن خطا
    throw errorHandler.standardizeError(errorData);
  }
}

export async function apiRequest<T = any>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  data?: any,
  options?: { rawResponse?: boolean }
): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const headers: HeadersInit = {};
  
  if (data && !(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  if (options?.rawResponse) {
    return res as any;
  }

  // برای DELETE و سایر درخواست‌ها که ممکن است response body نداشته باشند
  const contentLength = res.headers.get('content-length');
  const contentType = res.headers.get('content-type');
  
  if (contentLength === '0' || !contentType?.includes('application/json')) {
    return {} as T; // برای DELETE requests که response body ندارند
  }
  
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Build URL with query parameters
    let url = queryKey[0] as string;
    const params = queryKey[1] as Record<string, any> | undefined;
    
    if (params) {
      const urlParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlParams.append(key, String(value));
        }
      });
      
      if (urlParams.toString()) {
        url += (url.includes('?') ? '&' : '?') + urlParams.toString();
      }
    }

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});
