import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, ExternalLink } from "lucide-react";
import { TimeEntryResponse, TimeEntryCreate } from "@/services/timeEntryService";

interface TimeEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry?: TimeEntryResponse | null;
    users: any[];
    projects: any[];
    tasks: any[];
    onSave: (entry: TimeEntryCreate) => Promise<void>;
}

export function TimeEntryDialog({
    open,
    onOpenChange,
    entry,
    users,
    projects,
    tasks,
    onSave
}: TimeEntryDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<TimeEntryCreate>>({
        date: new Date().toISOString().split("T")[0],
        hours: 0,
        overtime_hours: 0,
        is_holiday: false,
    });

    useEffect(() => {
        if (entry) {
            setFormData({
                user_id: entry.user_id,
                project_id: entry.project_id,
                task_id: entry.task_id,
                date: entry.date,
                hours: entry.hours,
                overtime_hours: entry.overtime_hours || 0,
                is_holiday: entry.is_holiday || false,
                vehicle_type: entry.vehicle_type || "",
                meals: entry.meals || false,
                meal_ticket_amount: (entry as any).meal_ticket_amount ?? undefined,
                distance_origin: entry.distance_origin || "",
                trip_type: entry.trip_type || "round",
                travel_time: (entry as any).travel_time ?? 0,
            });
        } else {
            setFormData({
                date: new Date().toISOString().split("T")[0],
                hours: 0,
                overtime_hours: 0,
                is_holiday: false,
                trip_type: "round",
            });
        }
    }, [entry, open]);

    const filteredUsers = useMemo(() => {
        if (!formData.project_id) return users;
        const selectedProject = projects.find(p => p.id === formData.project_id);
        if (!selectedProject) return users;
        return users.filter(u => selectedProject.assigned_users?.some((su: any) => su.user_id === u.id));
    }, [users, projects, formData.project_id]);

    const filteredTasks = useMemo(() => {
        if (!formData.project_id || !formData.user_id) return tasks;
        const selectedProject = projects.find(p => p.id === formData.project_id);
        const userProjectAssignment = selectedProject?.assigned_users?.find((su: any) => su.user_id === formData.user_id);
        const user = users.find(u => u.id === formData.user_id);
        const role = userProjectAssignment?.role || user?.role || "";
        
        if (!role) return [];
        return tasks
            .filter(t => 
                t.allowed_roles.length === 0 || 
                t.allowed_roles.some((r: string) => r.localeCompare(role, "es", { sensitivity: "base" }) === 0)
            )
            .sort((a, b) => a.code.localeCompare(b.code));
    }, [tasks, formData.project_id, formData.user_id, projects, users]);

    const handleSave = async () => {
        if (!formData.user_id || !formData.project_id || !formData.task_id) {
            return;
        }
        setLoading(true);
        try {
            await onSave(formData as TimeEntryCreate);
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{entry ? "Editar Fichaje" : "Crear Nuevo Fichaje"}</DialogTitle>
                    <DialogDescription>
                        Como administrador puedes gestionar cualquier registro sin restricciones de fecha.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Proyecto</Label>
                            <Select
                                value={formData.project_id}
                                onValueChange={(val) => setFormData({ ...formData, project_id: val, user_id: "" })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar proyecto" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>[{p.code}] {p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Usuario</Label>
                            <Select
                                value={formData.user_id}
                                onValueChange={(val) => setFormData({ ...formData, user_id: val })}
                                disabled={!formData.project_id}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={formData.project_id ? "Seleccionar usuario" : "Primero elige un proyecto"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredUsers.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tarea</Label>
                            <Select
                                value={formData.task_id}
                                onValueChange={(val) => setFormData({ ...formData, task_id: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tarea" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredTasks.length === 0 && formData.user_id ? (
                                        <div className="p-2 text-sm text-muted-foreground text-center">Sin tareas para el rol de este usuario</div>
                                    ) : (
                                        filteredTasks.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.code} - {t.name}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Horas Normales</Label>
                            <Input
                                type="number"
                                step="0.5"
                                value={formData.hours}
                                onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Horas Extra</Label>
                            <Input
                                type="number"
                                step="0.5"
                                value={formData.overtime_hours}
                                onChange={(e) => setFormData({ ...formData, overtime_hours: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col justify-end space-y-2 pb-2">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="holiday"
                                    checked={formData.is_holiday}
                                    onCheckedChange={(val) => setFormData({ ...formData, is_holiday: val })}
                                />
                                <Label htmlFor="holiday">Festivo</Label>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-4">Campos Adicionales (Desplazamiento/Dietas)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Vehículo</Label>
                                <Select
                                    value={formData.vehicle_type || "none"}
                                    onValueChange={(val) => setFormData({ 
                                        ...formData, 
                                        vehicle_type: val === "none" ? undefined : val,
                                        trip_type: val === "none" ? undefined : "round"
                                    })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tipo de vehículo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Ninguno</SelectItem>
                                        <SelectItem value="coche_personal">Coche particular</SelectItem>
                                        <SelectItem value="moto_personal">Moto particular</SelectItem>
                                        <SelectItem value="company">Vehículo de empresa</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                                <Label>Origen (Municipio/CP)</Label>
                                <Input
                                    placeholder="Ej: Vigo, 36201"
                                    value={formData.distance_origin || ""}
                                    onChange={(e) => setFormData({ ...formData, distance_origin: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 flex flex-col justify-end">
                                <div className="flex items-center space-x-2 py-2">
                                    <Switch
                                        id="meals"
                                        checked={formData.meals}
                                        onCheckedChange={(val) => setFormData({ ...formData, meals: val })}
                                    />
                                    <Label htmlFor="meals" className="cursor-pointer">Cobrar Dieta</Label>
                                </div>
                            </div>
                        </div>

                        {formData.meals && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                <div className="hidden sm:block"></div> {/* Spacer */}
                                <div className="space-y-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
                                    <Label className="text-xs font-bold uppercase text-primary">
                                        Importe Ticket Dieta (€)
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        className="bg-background font-semibold"
                                        value={(formData as any).meal_ticket_amount ?? ""}
                                        onChange={(e) => setFormData({ ...formData, meal_ticket_amount: e.target.value === "" ? undefined : parseFloat(e.target.value) } as any)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Introduce el importe exacto del ticket adjunto.</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 mt-4 pt-4 border-t">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                    Horas desplazamiento (admin)
                                </Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    placeholder="ej. 1.5"
                                    value={(formData as any).travel_time ?? ""}
                                    onChange={(e) => setFormData({ ...formData, travel_time: e.target.value === "" ? 0 : parseFloat(e.target.value) } as any)}
                                />
                                <p className="text-[10px] text-muted-foreground italic">Solo ida. El sistema calculará el total (ida+vuelta) automáticamente en los informes.</p>
                            </div>
                        </div>

                        {entry && (entry as any).meal_ticket_photo && (
                            <div className="mt-4 pt-4 border-t space-y-2">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground italic">
                                    Documento adjunto: Ticket de Dieta
                                </Label>
                                <div className="relative border rounded-md overflow-hidden bg-muted/30 group">
                                    <img 
                                        src={(entry as any).meal_ticket_photo} 
                                        alt="Ticket" 
                                        className="w-full max-h-60 object-contain mx-auto transition-all group-hover:opacity-90 cursor-zoom-in"
                                        onClick={() => window.open((entry as any).meal_ticket_photo, '_blank')}
                                    />
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button 
                                            variant="secondary" 
                                            size="icon" 
                                            className="h-8 w-8 shadow-md"
                                            onClick={() => window.open((entry as any).meal_ticket_photo, '_blank')}
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="text-[10px] text-center p-1 text-muted-foreground bg-background/50 border-t">
                                        Haz clic en la imagen para ampliar
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {entry ? "Actualizar" : "Crear"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
