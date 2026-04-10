import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reportService } from "@/services/reportService";
import { timeEntryService } from "@/services/timeEntryService";
import { projectService } from "@/services/projectService";
import { taskService } from "@/services/taskService";
import { userService } from "@/services/userService";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Settings2, Trash2, Edit2, Loader2, AlertCircle, Plus, Receipt, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TimeEntryDialog } from "@/components/admin/TimeEntryDialog";
import { TimeEntryCreate } from "@/services/timeEntryService";

export default function TimeEntryManagement() {
    const queryClient = useQueryClient();
    const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Data fetching
    const { data: entries = [], isLoading: loadingEntries } = useQuery({
        queryKey: ["allTimeEntries"],
        queryFn: () => timeEntryService.getAllEntries()
    });

    const { data: usersData = [] } = useQuery({ queryKey: ["adminUsers"], queryFn: userService.getUsers });
    const { data: projectsData = [] } = useQuery({ queryKey: ["adminProjects"], queryFn: projectService.getAllProjects });
    const { data: tasksData = [] } = useQuery({ queryKey: ["adminTasks"], queryFn: taskService.getTasks });

    const users = usersData as any[];
    const projects = projectsData as any[];
    const tasks = tasksData as any[];

    const deleteMutation = useMutation({
        mutationFn: (id: string) => timeEntryService.deleteEntry(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["allTimeEntries"] });
            toast.success("Fichaje eliminado correctamente");
        },
        onError: () => toast.error("Error al eliminar el fichaje")
    });

    const createMutation = useMutation({
        mutationFn: (entry: TimeEntryCreate) => timeEntryService.createTimeEntry(entry),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["allTimeEntries"] });
            toast.success("Fichaje creado correctamente");
        },
        onError: (err: any) => toast.error(err.message || "Error al crear el fichaje")
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, entry }: { id: string, entry: TimeEntryCreate }) =>
            timeEntryService.updateEntry(id, entry),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["allTimeEntries"] });
            toast.success("Fichaje actualizado correctamente");
        },
        onError: (err: any) => toast.error(err.message || "Error al actualizar el fichaje")
    });

    const handleSave = async (entryData: TimeEntryCreate) => {
        if (selectedEntry) {
            await updateMutation.mutateAsync({ id: selectedEntry.id, entry: entryData });
        } else {
            await createMutation.mutateAsync(entryData);
        }
    };

    const handleEdit = (entry: any) => {
        setSelectedEntry(entry);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setSelectedEntry(null);
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id);
    };

    return (
        <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary shrink-0" />
                <h1 className="text-xl sm:text-2xl font-semibold">Modificación de Fichajes</h1>
            </div>
            <Button onClick={handleAdd} className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Nuevo Fichaje
            </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Listado Global de Fichajes</CardTitle>
                <CardDescription>
                    Registros ordenados por orden de llegada (más recientes primero).
                    Las jornadas superiores a 8h aparecen resaltadas.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* ── Mobile card list (< md) ── */}
                <div className="md:hidden space-y-3">
                    {loadingEntries ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : entries.length === 0 ? (
                        <p className="text-center text-muted-foreground py-10">No hay registros para mostrar.</p>
                    ) : entries.map(e => {
                        const user = users.find(u => u.id === e.user_id);
                        const project = projects.find(p => p.id === e.project_id);
                        const task = tasks.find(t => t.id === e.task_id);
                        const isOvertime = e.hours > 8;
                        return (
                            <div key={e.id} className={`rounded-lg border p-4 space-y-2 ${isOvertime ? "border-destructive/40 bg-destructive/5" : "bg-card"}`}>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-sm">{e.date}</span>
                                    <span className={`text-base font-bold ${isOvertime ? "text-destructive" : "text-primary"}`}>
                                        {e.hours}h {isOvertime && <AlertCircle className="h-3.5 w-3.5 inline ml-1" />}
                                    </span>
                                </div>
                                <p className="font-medium text-sm truncate">{user?.name || "—"}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {project ? `[${project.code}] ${project.name}` : "—"}
                                </p>
                                <p className="text-sm truncate">{task ? `${task.code} – ${task.name}` : "—"}</p>
                                <div className="flex items-center justify-between pt-1">
                                    <div className="flex gap-2">
                                        {e.meal_ticket_photo && (
                                            <a 
                                                href={e.meal_ticket_photo} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                                            >
                                                <Receipt className="h-3.5 w-3.5" /> Ticket
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex gap-2">

                                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleEdit(e)}>
                                        <Edit2 className="h-3.5 w-3.5" />Editar
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10">
                                                <Trash2 className="h-3.5 w-3.5" />Eliminar
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="w-[95vw] max-w-md">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar este fichaje?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Se eliminarán {e.hours}h del trabajador {user?.name}.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(e.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Desktop table (≥ md) ── */}
                <div className="hidden md:block rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Empleado</TableHead>
                                <TableHead>Proyecto</TableHead>
                                <TableHead>Tarea</TableHead>
                                <TableHead className="text-right">Horas</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingEntries ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : entries.map(e => {
                                const user = users.find(u => u.id === e.user_id);
                                const project = projects.find(p => p.id === e.project_id);
                                const task = tasks.find(t => t.id === e.task_id);
                                const isOvertime = e.hours > 8;

                                return (
                                    <TableRow key={e.id} className={isOvertime ? "bg-destructive/5" : ""}>
                                        <TableCell>{e.date}</TableCell>
                                        <TableCell className="font-medium">{user?.name || e.user_id.split("-")[0]}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {project ? `[${project.code}] ${project.name}` : "—"}
                                        </TableCell>
                                        <TableCell>{task?.code} - {task?.name}</TableCell>
                                        <TableCell className={`text-right ${isOvertime ? "text-destructive font-bold" : ""}`}>
                                            <div className="flex flex-col items-end">
                                                <span>{e.hours}h</span>
                                                {isOvertime && <span className="text-[10px] flex items-center gap-0.5"><AlertCircle className="h-2.5 w-2.5" /> Extra</span>}
                                                {e.meal_ticket_photo && (
                                                    <a 
                                                        href={e.meal_ticket_photo} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="mt-1 text-primary hover:text-primary/80"
                                                        title="Ver Ticket"
                                                    >
                                                        <Receipt className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(e)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Eliminar este fichaje?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción no se puede deshacer. Se eliminarán {e.hours}h del trabajador {user?.name}.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(e.id)} className="bg-destructive hover:bg-destructive/90">
                                                                Eliminar
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {!loadingEntries && entries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        No hay registros para mostrar.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>
                <strong>Nota para el Administrador:</strong> Estos cambios afectan directamente a los informes y métricas.
                Utiliza esta herramienta solo para correcciones o fichajes olvidados. Solo tú tienes permisos para modificar
                registros históricos o de otros usuarios.
            </p>
        </div>

        <TimeEntryDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            entry={selectedEntry}
            users={users}
            projects={projects}
            tasks={tasks}
            onSave={handleSave}
        />
    </div>

    );
}
