import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";
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
                distance_origin: entry.distance_origin || "",
                trip_type: entry.trip_type || "",
            });
        } else {
            setFormData({
                date: new Date().toISOString().split("T")[0],
                hours: 0,
                overtime_hours: 0,
                is_holiday: false,
            });
        }
    }, [entry, open]);

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
                            <Label>Usuario</Label>
                            <Select
                                value={formData.user_id}
                                onValueChange={(val) => setFormData({ ...formData, user_id: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar usuario" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
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
                            <Label>Proyecto</Label>
                            <Select
                                value={formData.project_id}
                                onValueChange={(val) => setFormData({ ...formData, project_id: val })}
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
                            <Label>Tarea</Label>
                            <Select
                                value={formData.task_id}
                                onValueChange={(val) => setFormData({ ...formData, task_id: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tarea" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tasks.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.code} - {t.name}</SelectItem>
                                    ))}
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
                                    onValueChange={(val) => setFormData({ ...formData, vehicle_type: val === "none" ? undefined : val })}
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
                            <div className="space-y-2">
                                <Label>Trayecto</Label>
                                <Select
                                    value={formData.trip_type || "none"}
                                    onValueChange={(val) => setFormData({ ...formData, trip_type: val === "none" ? undefined : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tipo de trayecto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Solo Ida</SelectItem>
                                        <SelectItem value="round">Ida y Vuelta</SelectItem>
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
                            <div className="flex flex-col justify-end space-y-2 pb-2">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="meals"
                                        checked={formData.meals}
                                        onCheckedChange={(val) => setFormData({ ...formData, meals: val })}
                                    />
                                    <Label htmlFor="meals">Cobrar Dieta</Label>
                                </div>
                            </div>
                        </div>
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
