import { fetchApi } from './api';

export interface TicketAttachmentResponse {
    id: string;
    file_path: string;
    original_filename?: string;
    created_at?: string;
}

export interface TimeEntryCreate {
    project_id: string;
    task_id: string;
    date: string;
    hours: number;
    overtime_hours?: number;
    is_holiday?: boolean;
    vehicle_type?: string;
    meals?: boolean;
    meal_ticket_amount?: number;   // € amount from receipt
    meal_ticket_photo?: string;    // stored file path (set after upload)
    distance_origin?: string;
    trip_type?: string;
    travel_time?: number;
    user_id?: string;
}

export interface TimeEntryResponse extends TimeEntryCreate {
    id: string;
    user_id: string;
    travel_time?: number;
    ticket_attachments: TicketAttachmentResponse[];
}

export const timeEntryService = {
    createTimeEntry: async (entry: TimeEntryCreate): Promise<TimeEntryResponse> => {
        return fetchApi<TimeEntryResponse>('/time-entries/', {
            method: 'POST',
            body: JSON.stringify(entry),
        });
    },

    uploadTicketPhoto: async (entryId: string, file: File): Promise<TimeEntryResponse> => {
        const form = new FormData();
        form.append('file', file);
        return fetchApi<TimeEntryResponse>(`/time-entries/${entryId}/upload-ticket`, {
            method: 'POST',
            body: form,
        });
    },

    deleteTicketAttachment: async (entryId: string, attachmentId: string): Promise<TimeEntryResponse> => {
        return fetchApi<TimeEntryResponse>(`/time-entries/${entryId}/ticket-attachments/${attachmentId}`, {
            method: 'DELETE',
        });
    },

    getMyEntries: async (): Promise<TimeEntryResponse[]> => {
        return fetchApi<TimeEntryResponse[]>('/time-entries/me');
    },

    getAllEntries: async (): Promise<TimeEntryResponse[]> => {
        return fetchApi<TimeEntryResponse[]>('/time-entries/');
    },

    deleteEntry: async (id: string): Promise<void> => {
        return fetchApi<void>(`/time-entries/${id}`, {
            method: 'DELETE',
        });
    },

    updateEntry: async (id: string, entry: TimeEntryCreate): Promise<TimeEntryResponse> => {
        return fetchApi<TimeEntryResponse>(`/time-entries/${id}`, {
            method: 'PUT',
            body: JSON.stringify(entry),
        });
    }
};
