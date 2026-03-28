import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { projectService } from "@/services/projectService";
import { taskService } from "@/services/taskService";
import { timeEntryService } from "@/services/timeEntryService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Clock } from "lucide-react";

// Dropdown labels shown to the user.
// Values use UPPERCASE to match the allowed_roles format stored in the DB task catalog.
// The filter uses localeCompare (sensitivity:'base') so it also matches Title Case variants.
const ROLES = [
  { value: "PROYECTISTAS MECÁNICOS", label: "Proyectistas Mecánicos" },
  { value: "PROYECTISTAS ELECTRICOS", label: "Proyectistas Eléctricos" },
  { value: "PROGRAMADORES", label: "Programadores" },
  { value: "MONTADORES", label: "Montadores" },
];

// Case- and accent-insensitive role comparison
const rolesMatch = (a: string, b: string) =>
  a.localeCompare(b, "es", { sensitivity: "base" }) === 0;

export default function LogHours() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [projectId, setProjectId] = useState("");
  const [roleInProject, setRoleInProject] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isHoliday, setIsHoliday] = useState(false);
  const [taskCode, setTaskCode] = useState("");
  const [hours, setHours] = useState("");
  const [vehicleUsed, setVehicleUsed] = useState<string>("empresa");
  const [mealsAllowance, setMealsAllowance] = useState(false);
  const [travelTime, setTravelTime] = useState(""); // horas de desplazamiento (solo ida)

  const { data: allProjects = [] } = useQuery({
    queryKey: ["myProjects"],
    queryFn: projectService.getMyProjects,
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: taskService.getTasks,
  });

  const selectedProject = allProjects.find(p => p.id === projectId);

  // Filter tasks using case- and accent-insensitive role comparison
  const filteredTasks = useMemo(
    () => roleInProject
      ? tasks.filter(t =>
        t.allowed_roles.length === 0 ||
        t.allowed_roles.some(r => rolesMatch(r, roleInProject))
      )
      : [],
    [tasks, roleInProject]
  );

  const selectedTaskObj = tasks.find(t => t.code === taskCode);
  // 4XX tasks have requires_extra_fields=true in DB → show transport/meals panel
  const isClientTask = selectedTaskObj?.requires_extra_fields ?? false;

  const reset = () => {
    setStep(1);
    setProjectId("");
    setRoleInProject("");
    setDate(new Date().toISOString().split("T")[0]);
    setIsHoliday(false);
    setTaskCode("");
    setHours("");
    setVehicleUsed("empresa");
    setMealsAllowance(false);
    setTravelTime("");
  };

  const mutation = useMutation({
    mutationFn: timeEntryService.createTimeEntry,
    onSuccess: () => {
      toast.success("¡Horas registradas correctamente!");
      reset();
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al registrar horas");
    },
  });

  const handleSubmit = () => {
    if (!user || !projectId || !taskCode || !hours) return;
    mutation.mutate({
      project_id: projectId,
      task_id: selectedTaskObj?.id || "",
      date,
      is_holiday: isHoliday,
      hours: parseFloat(hours),
      overtime_hours: 0, // Backend auto-splits hours > 8 into overtime
      ...(isClientTask && {
        vehicle_type: vehicleUsed,
        meals: mealsAllowance,
        distance_origin: "NAVE",
        trip_type: "round",  // siempre ida+vuelta; el backend×2 aplica en el tiempo
        travel_time: travelTime ? parseFloat(travelTime) : 0, // tiempo de IDA (se multiplica ×2 en el export)
      }),
    });
  };

  const stepTitles = [
    "Seleccionar Proyecto",
    "Seleccionar Rol",
    "Seleccionar Fecha",
    "¿Festivo?",
    "Seleccionar Tarea",
    "Horas Trabajadas",
  ];

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold">Registrar Horas</h1>
      </div>

      <div className="flex gap-1 mb-6">
        {stepTitles.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i + 1 <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paso {step}: {step === 6 ? "Registro Final" : stepTitles[step - 1]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Step 1: Project ── */}
          {step === 1 && (
            <>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Elige un proyecto" /></SelectTrigger>
                <SelectContent>
                  {allProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>[{p.code}] {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button disabled={!projectId} onClick={() => setStep(2)} className="w-full">Siguiente</Button>
            </>
          )}

          {/* ── Step 2: Role ── */}
          {step === 2 && (
            <>
              <Select value={roleInProject} onValueChange={setRoleInProject}>
                <SelectTrigger><SelectValue placeholder="Tu rol en este proyecto" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Atrás</Button>
                <Button disabled={!roleInProject} onClick={() => setStep(3)} className="flex-1">Siguiente</Button>
              </div>
            </>
          )}

          {/* ── Step 3: Date ── */}
          {step === 3 && (
            <>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Atrás</Button>
                <Button onClick={() => setStep(4)} className="flex-1">Siguiente</Button>
              </div>
            </>
          )}

          {/* ── Step 4: Holiday ── */}
          {step === 4 && (
            <>
              <div className="flex items-center gap-3">
                <Switch checked={isHoliday} onCheckedChange={setIsHoliday} id="holiday" />
                <Label htmlFor="holiday">Este día es festivo</Label>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Atrás</Button>
                <Button onClick={() => setStep(5)} className="flex-1">Siguiente</Button>
              </div>
            </>
          )}

          {/* ── Step 5: Task ── */}
          {step === 5 && (
            <>
              {selectedProject?.type === "offer" ? (
                <div className="p-3 rounded-lg bg-muted text-sm">
                  Selección automática: <strong>115 – Estudio de oferta</strong>
                  {(() => { if (!taskCode) setTaskCode("115"); return null; })()}
                </div>
              ) : (
                <>
                  <Select value={taskCode} onValueChange={setTaskCode}>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        filteredTasks.length > 0 ? "Elige una tarea" : "Sin tareas para este rol"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTasks.map(t => (
                        <SelectItem key={t.code} value={t.code}>{t.code} – {t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filteredTasks.length === 0 && roleInProject && (
                    <p className="text-xs text-muted-foreground">
                      No hay tareas disponibles para el rol seleccionado.
                    </p>
                  )}
                </>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1">Atrás</Button>
                <Button disabled={!taskCode} onClick={() => setStep(6)} className="flex-1">Siguiente</Button>
              </div>
            </>
          )}

          {/* ── Step 6: Hours + 4XX transport fields ── */}
          {step === 6 && (
            <>
              <div>
                <Label>Horas trabajadas</Label>
                <Input
                  type="number" min="0" max="24" step="0.5"
                  value={hours} onChange={e => setHours(e.target.value)} placeholder="ej. 8"
                />
              </div>

              {isClientTask && (
                <div className="space-y-3 p-3 rounded-lg border bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Detalles desplazamiento — Planta Cliente (4XX)
                  </p>

                  {/* Dieta */}
                  <div className="flex items-center gap-3">
                    <Switch checked={mealsAllowance} onCheckedChange={setMealsAllowance} id="meals" />
                    <Label htmlFor="meals">¿Hubo dieta de comida?</Label>
                  </div>

                  {/* Vehículo */}
                  <div>
                    <Label>Vehículo utilizado</Label>
                    <Select
                      value={vehicleUsed}
                      onValueChange={setVehicleUsed}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coche_personal">Coche particular</SelectItem>
                        <SelectItem value="moto_personal">Moto particular</SelectItem>
                        <SelectItem value="empresa">Vehículo de empresa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Horas de desplazamiento */}
                  <div>
                    <Label>Horas de desplazamiento (trayecto)</Label>
                    <Input
                      type="number" min="0" max="12" step="0.5"
                      value={travelTime}
                      onChange={e => setTravelTime(e.target.value)}
                      placeholder="ej. 1.5"
                    />
                    {travelTime && hours && parseFloat(travelTime) > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Horas netas efectivas: <strong>{(parseFloat(hours) - parseFloat(travelTime) * 2).toFixed(1)}h</strong>
                        {" "}<span className="opacity-60">(trayecto: {parseFloat(travelTime).toFixed(1)}h ida × 2)</span>
                      </p>
                    )}
                  </div>

                  {/* Tipo de trayecto eliminado: siempre ida+vuelta, el backend aplica ×2 */}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setStep(5)} className="flex-1">Atrás</Button>
                <Button onClick={handleSubmit} disabled={!hours || mutation.isPending} className="flex-1 gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {mutation.isPending ? "Guardando..." : "Enviar"}
                </Button>
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
