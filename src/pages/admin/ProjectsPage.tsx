import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectService } from "@/services/projectService";
import { userService } from "@/services/userService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { formatDashboardDate } from "./dashboardUtils";

const TYPE_LABELS: Record<string, string> = {
  standard: "Estándar",
  offer: "Preparación de Oferta",
  "non-productive": "No Productivo",
};

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery({ queryKey: ["adminProjects"], queryFn: projectService.getAllProjects });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: userService.getUsers });

  const createMutation = useMutation({
    mutationFn: projectService.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProjects"] });
      toast.success("Proyecto creado");
      setName(""); setCode(""); setClient(""); setLocation(""); setDistance("0");
      setTravelTime("0");
      setSelectedUsers([]); setProjectType("standard");

      setOpen(false);
    },
    onError: () => toast.error("Error al crear proyecto"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => projectService.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProjects"] });
      toast.success("Proyecto actualizado");
      setOpen(false);
      resetForm();
    },
    onError: () => toast.error("Error al actualizar proyecto"),
  });

  const deleteMutation = useMutation({
    mutationFn: projectService.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProjects"] });
      toast.success("Proyecto eliminado");
    },
    onError: () => toast.error("Error al eliminar proyecto"),
  });

  const [open, setOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [client, setClient] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [location, setLocation] = useState("");
  const [distance, setDistance] = useState("0");
  const [travelTime, setTravelTime] = useState("0");
  const [kmRate, setKmRate] = useState("0.19");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedUsers, setSelectedUsers] = useState<{user_id: string, role?: string}[]>([]);

  const [projectType, setProjectType] = useState<"standard" | "offer" | "non-productive">("standard");

  const resetForm = () => {
    setEditingProjectId(null);
    setName(""); setCode(""); setClient(""); setLocation(""); setDistance("0"); setTravelTime("0");
    setKmRate("0.19");
    setStartDate(new Date().toISOString().split("T")[0]);
    setSelectedUsers([]); setProjectType("standard");

  };

  const nonAdminUsers = users.filter((u: any) => !u.is_admin);
  const availableClients = Array.from(
    new Set(
      projects
        .map((p: any) => (p.client || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  const filteredProjects = projects.filter((p: any) => {
    const normalizedSearch = searchFilter.trim().toLowerCase();
    const matchesClient = clientFilter === "all" || (p.client || "").trim() === clientFilter;
    const matchesSearch =
      !normalizedSearch ||
      p.name.toLowerCase().includes(normalizedSearch) ||
      p.code.toLowerCase().includes(normalizedSearch) ||
      (p.client || "").toLowerCase().includes(normalizedSearch) ||
      (p.location || "").toLowerCase().includes(normalizedSearch);

    return matchesClient && matchesSearch;
  });
  
  const ROLES = [
    "PROYECTISTAS MECANICOS", "PROYECTISTAS ELECTRICOS",
    "PROGRAMADORES", "MONTADORES", "MANAGEMENT", "ADMIN"
  ];

  const handleSave = () => {
    if (!name || !code || selectedUsers.some((u) => !u.role)) return;
    const payload = {
      name,
      code,
      client,
      location,
      distance_from_workshop: parseFloat(distance) || 0,
      travel_time: parseInt(travelTime) || 0,
      km_rate: parseFloat(kmRate) || 0,
      start_date: startDate,
      assigned_users: selectedUsers,
      type: projectType,

    };

    if (editingProjectId) {
      updateMutation.mutate({ id: editingProjectId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleOpenEdit = (p: any) => {
    setEditingProjectId(p.id);
    setName(p.name);
    setCode(p.code);
    setClient(p.client || "");
    setLocation(p.location || "");
    setDistance(p.distance_from_workshop?.toString() || "0");
    setTravelTime(((p.travel_time || 0) / 2).toString()); // Mostrar solo ida
    setKmRate((p.km_rate ?? 0.19).toString());
    setStartDate(p.start_date);
    setProjectType(p.type);
    setSelectedUsers(p.assigned_users || []);

    setOpen(true);
  };

  const handleDelete = (project: { id: string; code: string; name: string }) => {
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar el proyecto [${project.code}] ${project.name}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    deleteMutation.mutate(project.id);
  };

  const toggleUser = (u: any) => {
    setSelectedUsers(prev => {
      if (prev.some(x => x.user_id === u.id)) {
        return prev.filter(x => x.user_id !== u.id);
      }
      return [...prev, { user_id: u.id, role: u.role || undefined }];
    });
  };

  const updateRole = (uid: string, role: string) => {
    setSelectedUsers(prev => prev.map(x => x.user_id === uid ? { ...x, role } : x));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-primary shrink-0" />
          <h1 className="text-2xl font-semibold">Proyectos</h1>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 w-full sm:w-auto" onClick={() => resetForm()}><Plus className="h-4 w-4" />Añadir Proyecto</Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingProjectId ? "Editar Proyecto" : "Crear Proyecto"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Tipo</Label>
                <Select value={projectType} onValueChange={(v: "standard" | "offer" | "non-productive") => setProjectType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Estándar</SelectItem>
                    <SelectItem value="offer">Preparación de Oferta</SelectItem>
                    <SelectItem value="non-productive">No Productivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Nombre del Proyecto</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
              <div><Label>Código del Proyecto</Label><Input value={code} onChange={e => setCode(e.target.value)} placeholder={projectType === "non-productive" ? "000" : ""} /></div>
              <div><Label>Cliente</Label><Input value={client} onChange={e => setClient(e.target.value)} placeholder="Ej: Thyssen, Bamesa..." /></div>
              <div><Label>Ubicación</Label><Input value={location} onChange={e => setLocation(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Distancia taller (km)</Label><Input type="number" value={distance} onChange={e => setDistance(e.target.value)} /></div>
                <div><Label>Tiempo trayecto (ida, min)</Label><Input type="number" min="0" value={travelTime} onChange={e => setTravelTime(e.target.value)} /></div>
                <div><Label>Precio €/KM</Label><Input type="number" step="0.01" min="0" value={kmRate} onChange={e => setKmRate(e.target.value)} /></div>
              </div>
              <div><Label>Fecha de inicio</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div className="space-y-1">
                <Label>Asignar Usuarios</Label>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                  {nonAdminUsers.map((u: any) => {
                    const sel = selectedUsers.find(su => su.user_id === u.id);
                    return (
                      <div key={u.id} className="flex items-center gap-2 border rounded min-h-9 px-2">
                         <Switch checked={!!sel} onCheckedChange={() => toggleUser(u)} />
                         <span className="text-sm flex-1">{u.name}</span>
                         {sel && (
                           <Select value={sel.role} onValueChange={(val) => updateRole(u.id, val)}>
                              <SelectTrigger className="h-7 text-xs w-[180px]">
                                <SelectValue placeholder="Selecciona rol" />
                              </SelectTrigger>
                              <SelectContent>
                                 {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                              </SelectContent>
                           </Select>
                         )}
                      </div>
                    )
                  })}
                </div>
              </div>

               <Button onClick={handleSave} className="w-full" disabled={selectedUsers.some((u) => !u.role)}>
                 {editingProjectId ? "Actualizar Proyecto" : "Crear Proyecto"}
               </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="w-full md:max-w-sm">
          <Label htmlFor="project-search">Buscar proyecto</Label>
          <Input
            id="project-search"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Código, nombre, cliente o ubicación"
          />
        </div>
        <div className="w-full md:max-w-xs">
          <Label>Filtrar por cliente</Label>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {availableClients.map((clientName) => (
                <SelectItem key={clientName} value={clientName}>
                  {clientName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Mobile card list (< md) ── */}
      <div className="md:hidden space-y-3">
        {filteredProjects.map(p => (
          <div key={p.id} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{p.code}</Badge>
                  <span className="font-semibold text-sm truncate">{p.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">Cliente: {p.client || "—"}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{p.location || "—"}</p>
              </div>
             <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={() => handleOpenEdit(p)}>
                <Edit className="h-4 w-4 text-primary" />
                Editar
              </Button>
              <Button variant="ghost" size="sm" className="shrink-0 h-9 gap-1.5" onClick={() => handleDelete(p)}>
                <Trash2 className="h-4 w-4 text-destructive" />
                Borrar
              </Button>
            </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-muted rounded px-2 py-0.5">{TYPE_LABELS[p.type] || p.type}</span>
              <span className="text-xs text-muted-foreground">{formatDashboardDate(p.start_date, true)}</span>
              {(p.travel_time || 0) > 0 && (
                <span className="text-xs text-muted-foreground">Viaje: {p.travel_time}′</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop table (≥ md) ── */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Viaje</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map(p => (
                <TableRow key={p.id}>
                  <TableCell><Badge variant="secondary">{p.code}</Badge></TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.client || "—"}</TableCell>
                  <TableCell>{p.location}</TableCell>
                  <TableCell>{TYPE_LABELS[p.type] || p.type}</TableCell>
                  <TableCell>{formatDashboardDate(p.start_date, true)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {(p.travel_time || 0) > 0 ? `${p.travel_time}′` : "—"}
                  </TableCell>
                   <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => handleOpenEdit(p)}>
                        <Edit className="h-4 w-4 text-primary" />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => handleDelete(p)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        Borrar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
