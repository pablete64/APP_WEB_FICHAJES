import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { timeEntryService } from "@/services/timeEntryService";
import { projectService } from "@/services/projectService";
import { taskService } from "@/services/taskService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

export default function HistoryPage() {
  const { data: rawEntries = [] } = useQuery({ queryKey: ["myEntries"], queryFn: timeEntryService.getMyEntries });
  const { data: projects = [] } = useQuery({ queryKey: ["myProjects"], queryFn: projectService.getMyProjects });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: taskService.getTasks });

  const entries = useMemo(() => {
    return [...rawEntries].sort((a, b) => b.date.localeCompare(a.date));
  }, [rawEntries]);

  const getProject = (id: string) => projects.find(p => p.id === id);
  const getTask = (id: string) => tasks.find(t => t.id === id);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <History className="h-5 w-5 text-primary shrink-0" />
        <h1 className="text-2xl font-semibold">Historial</h1>
      </div>

      {/* ── Mobile card list (< md) ── */}
      <div className="md:hidden space-y-3">
        {entries.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Aún no hay registros</p>
        )}
        {entries.map(e => {
          const task = getTask(e.task_id);
          const project = getProject(e.project_id);
          return (
            <div key={e.id} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">{e.date}</span>
                <div className="flex gap-1.5">
                  {e.is_holiday && <Badge variant="outline" className="text-xs">Festivo</Badge>}
                  {e.overtime_hours > 0 && (
                    <Badge variant="secondary" className="text-xs">{e.overtime_hours}h extra</Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {project ? `[${project.code}] ${project.name}` : "—"}
              </p>
              <p className="text-sm truncate">{task ? `${task.code} – ${task.name}` : "—"}</p>
              <p className="text-base font-bold text-primary">{e.hours}h</p>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table (≥ md) ── */}
      <div className="hidden md:block rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Proyecto</TableHead>
              <TableHead>Tarea</TableHead>
              <TableHead className="text-right">Horas</TableHead>
              <TableHead className="text-right">H. Extra</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(e => {
              const task = getTask(e.task_id);
              const project = getProject(e.project_id);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.date}{e.is_holiday && <Badge variant="outline" className="ml-2 text-xs">Festivo</Badge>}</TableCell>
                  <TableCell>{project ? `[${project.code}] ${project.name}` : "—"}</TableCell>
                  <TableCell>{task ? `${task.code} – ${task.name}` : "—"}</TableCell>
                  <TableCell className="text-right">{e.hours}h</TableCell>
                  <TableCell className="text-right">{e.overtime_hours}h</TableCell>
                </TableRow>
              );
            })}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">Aún no hay registros</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
