export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
export const PMA_URL = process.env.NEXT_PUBLIC_PMA_URL || 'http://localhost:8081';

export async function apiFetch(endpoint: string, options: any = {}) {
    const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    // Get token from localStorage if exists
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

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

        if (response.status === 401) {
            // Handle unauthorized (redirect to login or refresh token)
            if (typeof window !== 'undefined') {
                localStorage.removeItem('auth_token');
                window.location.href = '/auth/login';
            }
        }

        return response;
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        console.error(`[API Fetch Error] Failed to connect to ${url}:`, error);
        throw error;
    }
}
