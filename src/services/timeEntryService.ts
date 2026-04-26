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
    created_at?: string;
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

    createTimeEntryWithTickets: async (entry: TimeEntryCreate, files: File[]): Promise<TimeEntryResponse> => {
        const form = new FormData();
        form.append('project_id', entry.project_id);
        form.append('task_id', entry.task_id);
        form.append('date', entry.date);
        form.append('hours', String(entry.hours));
        form.append('overtime_hours', String(entry.overtime_hours ?? 0));
        form.append('is_holiday', String(entry.is_holiday ?? false));

        if (entry.vehicle_type != null) form.append('vehicle_type', entry.vehicle_type);
        if (entry.meals != null) form.append('meals', String(entry.meals));
        if (entry.meal_ticket_amount != null) form.append('meal_ticket_amount', String(entry.meal_ticket_amount));
        if (entry.meal_ticket_photo != null) form.append('meal_ticket_photo', entry.meal_ticket_photo);
        if (entry.distance_origin != null) form.append('distance_origin', entry.distance_origin);
        if (entry.trip_type != null) form.append('trip_type', entry.trip_type);
        if (entry.travel_time != null) form.append('travel_time', String(entry.travel_time));
        if (entry.user_id != null) form.append('user_id', entry.user_id);

        for (const file of files) {
            form.append('files', file);
        }

        return fetchApi<TimeEntryResponse>('/time-entries/with-tickets', {
            method: 'POST',
            body: form,
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
