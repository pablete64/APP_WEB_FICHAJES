import { fetchApi } from './api';

export interface User {
    id: string;
    employee_code: string;
    name: string;
    role: string;
    is_admin: boolean;
    is_super_admin: boolean;
    time_entry_mode: string;
    home_location?: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: User; // Solo si backend lo devuelve, en todo caso la lógica manda decodear del backend
}

export const authService = {
    login: async (employeeCode: string, password: string): Promise<LoginResponse> => {
        // fastapi OAuth2PasswordRequestForm espera form-data urlencoded
        const formData = new URLSearchParams();
        formData.append('username', employeeCode);
        formData.append('password', password);

        const response = await fetchApi<LoginResponse>('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });

        return response;
    },

    logout: () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
    },
};
