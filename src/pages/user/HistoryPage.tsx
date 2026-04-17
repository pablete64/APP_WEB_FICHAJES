import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { timeEntryService } from "@/services/timeEntryService";
import { projectService } from "@/services/projectService";
import { taskService } from "@/services/taskService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { TicketAttachmentsMenu } from "@/components/TicketAttachmentsMenu";

const formatSpanishDate = (value: string) => {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-ES");
};

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
                <span className="font-semibold text-sm">{formatSpanishDate(e.date)}</span>
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
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <p className="text-base font-bold text-primary">{e.hours}h</p>
                  {e.meal_ticket_amount > 0 && (
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {e.meal_ticket_amount.toFixed(2)}€ Dieta
                    </span>
                  )}
                </div>
                {e.ticket_attachments?.length > 0 && (
                  <div className="flex items-center gap-1.5 rounded bg-primary/5 px-2 py-1">
                    <TicketAttachmentsMenu entryId={e.id} attachments={e.ticket_attachments} />
                    <span className="text-xs text-primary">Ver tickets</span>
                  </div>
                )}
              </div>
              {e.vehicle_type && (
                <div className="flex flex-wrap gap-2 pt-1 border-t mt-2">
                  <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                    🚗 {e.vehicle_type.replace("_", " ")}
                  </span>
                  {e.travel_time > 0 && (
                    <span className="text-[10px] bg-blue-50 px-1.5 py-0.5 rounded text-blue-600 font-bold">
                      ⏱️ {e.travel_time}h viaje
                    </span>
                  )}
                </div>
              )}
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
              <TableHead className="text-right">Dieta (€)</TableHead>
              <TableHead className="text-right">Ticket</TableHead>
              <TableHead className="text-right">Desplazamiento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(e => {
              const task = getTask(e.task_id);
              const project = getProject(e.project_id);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{formatSpanishDate(e.date)}{e.is_holiday && <Badge variant="outline" className="ml-2 text-xs">Festivo</Badge>}</TableCell>
                  <TableCell>{project ? `[${project.code}] ${project.name}` : "—"}</TableCell>
                  <TableCell>{task ? `${task.code} – ${task.name}` : "—"}</TableCell>
                  <TableCell className="text-right">{e.hours}h</TableCell>
                  <TableCell className="text-right">{e.overtime_hours}h</TableCell>
                  <TableCell className="text-right font-medium text-muted-foreground">
                    {e.meal_ticket_amount ? `${e.meal_ticket_amount.toFixed(2)}€` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {e.ticket_attachments?.length > 0 ? (
                      <div className="inline-flex justify-end">
                        <TicketAttachmentsMenu entryId={e.id} attachments={e.ticket_attachments} />
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {e.vehicle_type ? (
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {e.vehicle_type.replace("_", " ")}
                        </Badge>
                        {e.travel_time > 0 && (
                          <span className="text-[10px] font-bold text-blue-600">
                            {e.travel_time}h viaje
                          </span>
                        )}
                      </div>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">Aún no hay registros</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
