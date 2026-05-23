export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
export const PMA_URL = process.env.NEXT_PUBLIC_PMA_URL || 'http://localhost:8081';

/**
 * Single source of truth for the localStorage key that holds the Sanctum token.
 * Both apiFetch (read on every request) and AuthProvider (read/write/clear)
 * must use this constant.
 */
export const AUTH_TOKEN_STORAGE_KEY = 'auth_token';

/**
 * Custom event broadcast when the API replies with 401.
 * Layouts and route guards subscribe to this and decide how to redirect
 * (using next/navigation router) without doing a full page reload.
 */
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

export async function apiFetch(endpoint: string, options: any = {}) {
    const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Get token from localStorage if exists
    const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) : null;

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (response.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
            window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
        }

        return response;
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        console.error(`[API Fetch Error] Failed to connect to ${url}:`, error);
        throw error;
    }
}
