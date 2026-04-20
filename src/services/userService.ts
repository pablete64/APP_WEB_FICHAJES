import { fetchApi } from './api';

export interface AssignedProjectRole {
    project_id: string;
    project_name: string;
    project_code: string;
    role: string;
}

export interface UserResponse {
    id: string;
    employee_code: string;
    name: string;
    home_location?: string;
    role: string;
    is_admin: boolean;
    active: boolean;
    created_at: string;
    assigned_projects: AssignedProjectRole[];
}

export const userService = {
    getUsers: async (): Promise<UserResponse[]> => {
        return fetchApi<UserResponse[]>('/users/');
    },

    createUser: async (userData: any): Promise<UserResponse> => {
        return fetchApi<UserResponse>('/users/', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },

    deleteUser: async (id: string): Promise<void> => {
        return fetchApi<void>(`/users/${id}`, {
            method: 'DELETE',
        });
    },

    updateUser: async (id: string, userData: any): Promise<UserResponse> => {
        return fetchApi<UserResponse>(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }
};
