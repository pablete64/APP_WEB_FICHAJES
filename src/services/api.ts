const BASE_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

export const fetchApi = async <T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
    const token = sessionStorage.getItem('token');

    const headers = new Headers(options.headers);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Si no se especifica content type y no es un form data
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorMessage = 'An error occurred';
        if (response.status === 413) {
            errorMessage = 'La foto es demasiado grande. Reduce el tamano o usa una imagen mas ligera.';
        }
        try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
            // Ignorar si no se puede parsear
        }

        // Si fue error de Auth (401), podríamos limpiar token
        if (response.status === 401) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user'); // Si lo guardamos
            window.dispatchEvent(new Event('auth:unauthorized'));
        }

        throw new ApiError(response.status, errorMessage);
    }

    // Si intentamos descargar un Blob (como CSV o XLSX)
    const contentType = response.headers.get('content-type');
    if (contentType && (
        contentType.includes('text/csv') ||
        contentType.includes('application/octet-stream') ||
        contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    )) {
        return (await response.blob()) as unknown as T;
    }

    // Algunos endpoints (DELETE 204) no devuelven body json
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
};
