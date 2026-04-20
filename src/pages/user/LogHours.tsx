import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { CheckCircle2, Clock, Upload, X, Receipt, Car, Info } from "lucide-react";
import { isTaskAllowedForRole } from "@/lib/time-entry-access";

const MAX_TICKET_IMAGE_DIMENSION = 1600;
const TARGET_TICKET_SIZE_BYTES = 1 * 1024 * 1024;

const loadImageFromFile = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("No se pudo cargar la imagen seleccionada."));
    };
    img.src = imageUrl;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("No se pudo procesar la imagen."));
    }, "image/jpeg", quality);
  });

const optimizeTicketImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith("image/")) return file;

  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  let width = image.naturalWidth;
  let height = image.naturalHeight;
  const initialScale = Math.min(
    1,
    MAX_TICKET_IMAGE_DIMENSION / Math.max(width, height)
  );
  width = Math.max(1, Math.round(width * initialScale));
  height = Math.max(1, Math.round(height * initialScale));

  let quality = 0.82;
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    blob = await canvasToBlob(canvas, quality);
    if (blob.size <= TARGET_TICKET_SIZE_BYTES) break;

    if (quality > 0.5) {
      quality = Math.max(0.5, quality - 0.08);
      continue;
    }

    width = Math.max(900, Math.round(width * 0.8));
    height = Math.max(900, Math.round(height * 0.8));
  }

  if (!blob) return file;

  if (blob.size >= file.size && file.size <= TARGET_TICKET_SIZE_BYTES) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "ticket";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
};

export default function LogHours() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const [step, setStep] = useState(1);
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(today);
  const [isHoliday, setIsHoliday] = useState(false);
  const [taskCode, setTaskCode] = useState("");
  const [hours, setHours] = useState("");
  const [vehicleUsed, setVehicleUsed] = useState<string>("empresa");
  const [hasMealTicket, setHasMealTicket] = useState(false);
  const [ticketAmount, setTicketAmount] = useState("");
  const [ticketFiles, setTicketFiles] = useState<File[]>([]);
  const [ticketPreviews, setTicketPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const roleInProject = useMemo(() => {
    if (!selectedProject || !user) return "";
    const assignment = selectedProject.assigned_users?.find((su: any) => su.user_id === user.id);
    return assignment?.role || user.role || "";
  }, [selectedProject, user]);

  // Travel time from project config (minutes → hours, read-only for user)
  const projectTravelMinutes: number = (selectedProject as any)?.travel_time ?? 0;
  const projectTravelHours: string | null = projectTravelMinutes > 0
    ? (projectTravelMinutes / 60).toFixed(1)
    : null;

  const filteredTasks = useMemo(
    () => roleInProject
      ? tasks
          .filter(t => isTaskAllowedForRole(roleInProject, t, selectedProject))
          .sort((a, b) => a.code.localeCompare(b.code))
      : [],
    [tasks, roleInProject, selectedProject]
  );

  const selectedTaskObj = tasks.find(t => t.code === taskCode);
  // 4XX tasks have requires_extra_fields=true → show transport/ticket panel
  const isClientTask: boolean = (selectedTaskObj as any)?.requires_extra_fields ?? false;

  const reset = () => {
    setStep(1);
    setProjectId("");
    setDate(today);
    setIsHoliday(false);
    setTaskCode("");
    setHours("");
    setVehicleUsed("empresa");
    setHasMealTicket(false);
    setTicketAmount("");
    setTicketFiles([]);
    setTicketPreviews([]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const optimizedFiles = await Promise.all(files.map(optimizeTicketImage));
      setTicketFiles((prev) => [...prev, ...optimizedFiles]);
      setTicketPreviews((prev) => [...prev, ...optimizedFiles.map((file) => URL.createObjectURL(file))]);
    } catch {
      setTicketFiles((prev) => [...prev, ...files]);
      setTicketPreviews((prev) => [...prev, ...files.map((file) => URL.createObjectURL(file))]);
      toast.error("No se pudo optimizar la foto. Se intentara subir el archivo original.");
    }
    e.target.value = "";
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user || !projectId || !taskCode || !hours) throw new Error("Datos incompletos");

      // 1. Create the time entry (travel_time is 0 — admin sets it later)
      const entry = await timeEntryService.createTimeEntry({
        project_id: projectId,
        task_id: (selectedTaskObj as any)?.id || "",
        date,
        is_holiday: isHoliday,
        hours: parseFloat(hours),
        overtime_hours: 0,
        ...(isClientTask && {
          vehicle_type: vehicleUsed,
          meals: hasMealTicket,
          meal_ticket_amount: hasMealTicket && ticketAmount ? parseFloat(ticketAmount) : undefined,
          distance_origin: "NAVE",
          trip_type: "round",
          travel_time: 0,
        }),
      });

      // 2. Upload ticket photo if provided
      if (isClientTask && hasMealTicket && ticketFiles.length > 0 && entry.id) {
        for (const ticketFile of ticketFiles) {
          await timeEntryService.uploadTicketPhoto(entry.id, ticketFile);
        }
      }

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myEntries"] });
      toast.success("¡Horas registradas correctamente!");
      reset();
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al registrar horas");
    },
  });

  const stepTitles = [
    "Seleccionar Proyecto",
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
          <CardTitle className="text-lg">
            {allProjects.length === 0
              ? "Sin Proyectos Asignados"
              : `Paso ${step}: ${step === 5 ? "Registro Final" : stepTitles[step - 1]}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {allProjects.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground">No tienes proyectos asignados actualmente. Contacta con administración para poder registrar tus horas.</p>
              <Button variant="outline" onClick={() => window.location.reload()}>Actualizar</Button>
            </div>
          ) : (
            <>
          {/* ── Step 1: Project ── */}
          {step === 1 && (
            <>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Elige un proyecto" /></SelectTrigger>
                <SelectContent>
                  {allProjects.map(p => {
                    const r = (p as any).assigned_users?.find((su: any) => su.user_id === user?.id)?.role || user?.role;
                    return (
                      <SelectItem key={p.id} value={p.id}>[{p.code}] {p.name} {r ? `(${r})` : ""}</SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <Button disabled={!projectId} onClick={() => setStep(2)} className="w-full">Siguiente</Button>
            </>
          )}

          {/* ── Step 2: Date ── */}
          {step === 2 && (
            <>
              <Input
                type="date"
                value={date}
                min={today}
                max={today}
                onChange={e => setDate(e.target.value === today ? e.target.value : today)}
              />
              <p className="text-xs text-muted-foreground">
                Solo puedes registrar horas para la fecha de hoy.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Atrás</Button>
                <Button onClick={() => setStep(3)} className="flex-1" disabled={date !== today}>Siguiente</Button>
              </div>
            </>
          )}

          {/* ── Step 3: Holiday ── */}
          {step === 3 && (
            <>
              <div className="flex items-center gap-3">
                <Switch checked={isHoliday} onCheckedChange={setIsHoliday} id="holiday" />
                <Label htmlFor="holiday">Este día es festivo</Label>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Atrás</Button>
                <Button onClick={() => setStep(4)} className="flex-1">Siguiente</Button>
              </div>
            </>
          )}

          {/* ── Step 4: Task ── */}
          {step === 4 && (
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
                  No hay tareas disponibles para tu rol ({roleInProject}).
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Atrás</Button>
                <Button disabled={!taskCode} onClick={() => setStep(5)} className="flex-1">Siguiente</Button>
              </div>
            </>
          )}

          {/* ── Step 5: Hours + 4XX transport/ticket fields ── */}
          {step === 5 && (
            <>
              <div>
                <Label>Horas trabajadas</Label>
                <Input
                  type="number" min="0" max="24" step="0.5"
                  value={hours} onChange={e => setHours(e.target.value)} placeholder="ej. 8"
                />
              </div>

              {isClientTask && (
                <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Detalles desplazamiento — Planta Cliente (4XX)
                  </p>

                  {/* Project travel time — read-only info */}
                  {projectTravelHours ? (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-background border text-sm">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">Tiempo de desplazamiento del proyecto:</span>
                        {" "}<strong>{projectTravelHours}h</strong> (ida + vuelta)
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Este tiempo es gestionado por el área de administración.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-background border text-sm text-muted-foreground">
                      <Info className="h-4 w-4 shrink-0" />
                      El tiempo de desplazamiento será registrado por administración.
                    </div>
                  )}

                  {/* Vehicle */}
                  <div>
                    <Label className="flex items-center gap-1.5 mb-1.5">
                      <Car className="h-3.5 w-3.5" />Vehículo utilizado
                    </Label>
                    <Select value={vehicleUsed} onValueChange={setVehicleUsed}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coche_personal">Coche particular</SelectItem>
                        <SelectItem value="moto_personal">Moto particular</SelectItem>
                        <SelectItem value="empresa">Vehículo de empresa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Meal ticket section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={hasMealTicket}
                        onCheckedChange={(v) => {
                          setHasMealTicket(v);
                          if (!v) { setTicketAmount(""); setTicketFiles([]); setTicketPreviews([]); }
                        }}
                        id="meals"
                      />
                      <Label htmlFor="meals" className="flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5" />
                        ¿Hay ticket de dieta?
                      </Label>
                    </div>

                    {hasMealTicket && (
                      <div className="space-y-3 pl-3 border-l-2 border-primary/30">
                        <div>
                          <Label>Importe del ticket (€)</Label>
                          <Input
                            type="number" min="0" step="0.01"
                            value={ticketAmount}
                            onChange={e => setTicketAmount(e.target.value)}
                            placeholder="ej. 12.50"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Foto del ticket</Label>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            capture="environment"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-1.5 w-full gap-2"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4" />
                            {ticketPreviews.length > 0 ? "Anadir otra foto del ticket" : "Subir foto del ticket"}
                          </Button>
                          {ticketPreviews.length > 0 && (
                            <div className="mt-3 space-y-3">
                              {ticketPreviews.map((preview, index) => (
                                <div key={`${preview}-${index}`} className="relative">
                                  <img
                                    src={preview}
                                    alt={`Ticket ${index + 1}`}
                                    className="w-full max-h-48 object-contain rounded-md border"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 h-7 w-7 bg-background/80 hover:bg-background"
                                    onClick={() => {
                                      setTicketFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
                                      setTicketPreviews((prev) => prev.filter((_, previewIndex) => previewIndex !== index));
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Opcional. Puedes anadir varias fotos y se optimizan automaticamente antes de subirlas.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1">Atrás</Button>
                <Button
                  onClick={() => mutation.mutate()}
                  disabled={!hours || mutation.isPending}
                  className="flex-1 gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {mutation.isPending ? "Guardando..." : "Enviar"}
                </Button>
              </div>
            </>
          )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
