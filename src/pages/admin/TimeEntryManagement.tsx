import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timeEntryService } from "@/services/timeEntryService";
import { projectService } from "@/services/projectService";
import { taskService } from "@/services/taskService";
import { userService } from "@/services/userService";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Settings2, Trash2, Edit2, Loader2, AlertCircle, Plus
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
import { TicketAttachmentsMenu } from "@/components/TicketAttachmentsMenu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatSpanishDate = (value: string) => {
    if (!value) return "—";
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("es-ES");
};

export default function TimeEntryManagement() {
    const queryClient = useQueryClient();
    const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState("");
    const [employeeFilter, setEmployeeFilter] = useState("");
    const [projectFilter, setProjectFilter] = useState("");
    const [taskFilter, setTaskFilter] = useState("");
    const [clientFilter, setClientFilter] = useState("");
    const [sortField, setSortField] = useState("created_at");
    const [sortDirection, setSortDirection] = useState("desc");

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

    const visibleEntries = useMemo(() => {
        const enriched = entries.map((entry: any) => {
            const user = users.find((item) => item.id === entry.user_id);
            const project = projects.find((item) => item.id === entry.project_id);
            const task = tasks.find((item) => item.id === entry.task_id);
            return { ...entry, _user: user, _project: project, _task: task };
        });

        const filtered = enriched.filter((entry: any) => {
            if (dateFilter && entry.date !== dateFilter) return false;
            if (employeeFilter && !(entry._user?.name || "").toLowerCase().includes(employeeFilter.toLowerCase())) return false;
            if (projectFilter && !(`[${entry._project?.code || ""}] ${entry._project?.name || ""}`.toLowerCase().includes(projectFilter.toLowerCase()))) return false;
            if (taskFilter && !(`${entry._task?.code || ""} ${entry._task?.name || ""}`.toLowerCase().includes(taskFilter.toLowerCase()))) return false;
            if (clientFilter && !(entry._project?.client || "").toLowerCase().includes(clientFilter.toLowerCase())) return false;
            return true;
        });

        filtered.sort((a: any, b: any) => {
            const direction = sortDirection === "asc" ? 1 : -1;
            const getValue = (entry: any) => {
                switch (sortField) {
                    case "date":
                        return entry.date || "";
                    case "employee":
                        return entry._user?.name || "";
                    case "project":
                        return `${entry._project?.code || ""} ${entry._project?.name || ""}`;
                    case "task":
                        return `${entry._task?.code || ""} ${entry._task?.name || ""}`;
                    case "client":
                        return entry._project?.client || "";
                    case "created_at":
                    default:
                        return entry.created_at || "";
                }
            };
            return String(getValue(a)).localeCompare(String(getValue(b)), "es", { sensitivity: "base" }) * direction;
        });

        return filtered;
    }, [entries, users, projects, tasks, dateFilter, employeeFilter, projectFilter, taskFilter, clientFilter, sortField, sortDirection]);

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
            return await updateMutation.mutateAsync({ id: selectedEntry.id, entry: entryData });
        } else {
            return await createMutation.mutateAsync(entryData);
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                    <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                    <Input value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} placeholder="Filtrar por empleado" />
                    <Input value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} placeholder="Filtrar por proyecto" />
                    <Input value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)} placeholder="Filtrar por tarea" />
                    <Input value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} placeholder="Filtrar por cliente" />
                    <Select value={sortField} onValueChange={setSortField}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="created_at">Orden llegada</SelectItem>
                            <SelectItem value="date">Fecha</SelectItem>
                            <SelectItem value="employee">Empleado</SelectItem>
                            <SelectItem value="project">Proyecto</SelectItem>
                            <SelectItem value="task">Tarea</SelectItem>
                            <SelectItem value="client">Cliente</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sortDirection} onValueChange={setSortDirection}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="desc">Descendente</SelectItem>
                            <SelectItem value="asc">Ascendente</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => {
                        setDateFilter("");
                        setEmployeeFilter("");
                        setProjectFilter("");
                        setTaskFilter("");
                        setClientFilter("");
                        setSortField("created_at");
                        setSortDirection("desc");
                    }}>
                        Limpiar filtros
                    </Button>
                </div>
                {/* ── Mobile card list (< md) ── */}
                <div className="md:hidden space-y-3">
                    {loadingEntries ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : visibleEntries.length === 0 ? (
                        <p className="text-center text-muted-foreground py-10">No hay registros para mostrar.</p>
                    ) : visibleEntries.map(e => {
                        const user = e._user;
                        const project = e._project;
                        const task = e._task;
                        const isOvertime = e.hours > 8;
                        return (
                            <div key={e.id} className={`rounded-lg border p-4 space-y-2 ${isOvertime ? "border-destructive/40 bg-destructive/5" : "bg-card"}`}>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-sm">{formatSpanishDate(e.date)}</span>
                                    <span className={`text-base font-bold ${isOvertime ? "text-destructive" : "text-primary"}`}>
                                        {e.hours}h {isOvertime && <AlertCircle className="h-3.5 w-3.5 inline ml-1" />}
                                    </span>
                                </div>
                                {e.overtime_hours > 0 && (
                                    <p className="text-xs font-bold text-amber-600">
                                        + {e.overtime_hours}h Extra
                                    </p>
                                )}
                                {(e as any).meal_ticket_amount > 0 && (
                                    <p className="text-xs font-semibold text-emerald-600">
                                        🎫 {(e as any).meal_ticket_amount.toFixed(2)}€ Dieta
                                    </p>
                                )}
                                <p className="font-medium text-sm truncate">{user?.name || "—"}</p>
                                <p className="text-xs text-muted-foreground truncate">Cliente: {project?.client || "—"}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {project ? `[${project.code}] ${project.name}` : "—"}
                                </p>
                                <p className="text-sm truncate">{task ? `${task.code} – ${task.name}` : "—"}</p>
                                <div className="flex items-center justify-between pt-1">
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-1">
                                            <TicketAttachmentsMenu
                                                entryId={e.id}
                                                attachments={e.ticket_attachments || []}
                                                canManage
                                            />
                                            <span className="text-xs text-primary">
                                                {e.ticket_attachments?.length > 0 ? "Tickets" : "Subir"}
                                            </span>
                                        </div>
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
                                <TableHead>Cliente</TableHead>
                                <TableHead>Proyecto</TableHead>
                                <TableHead>Tarea</TableHead>
                                <TableHead className="text-right">Horas</TableHead>
                                <TableHead className="text-right">H. Extra</TableHead>
                                <TableHead className="text-right">Ticket</TableHead>
                                <TableHead className="text-right">Dieta (€)</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingEntries ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-10">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : visibleEntries.map(e => {
                                const user = e._user;
                                const project = e._project;
                                const task = e._task;
                                const isOvertime = e.hours > 8;

                                return (
                                    <TableRow key={e.id} className={isOvertime ? "bg-destructive/5" : ""}>
                                        <TableCell>{formatSpanishDate(e.date)}</TableCell>
                                        <TableCell className="font-medium">{user?.name || e.user_id.split("-")[0]}</TableCell>
                                        <TableCell>{project?.client || "—"}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {project ? `[${project.code}] ${project.name}` : "—"}
                                        </TableCell>
                                        <TableCell>{task?.code} - {task?.name}</TableCell>
                                        <TableCell className="text-right">{e.hours}h</TableCell>
                                        <TableCell className="text-right font-bold text-amber-600">
                                            {e.overtime_hours > 0 ? `+${e.overtime_hours}h` : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="inline-flex justify-end">
                                                <TicketAttachmentsMenu
                                                    entryId={e.id}
                                                    attachments={e.ticket_attachments || []}
                                                    canManage
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {(e as any).meal_ticket_amount != null 
                                                ? `${Number((e as any).meal_ticket_amount).toFixed(2)}€` 
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-primary" onClick={() => handleEdit(e)}>
                                                    <Edit2 className="h-4 w-4" />
                                                    Editar
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10">
                                                            <Trash2 className="h-4 w-4" />
                                                            Borrar
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
                            {!loadingEntries && visibleEntries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
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
