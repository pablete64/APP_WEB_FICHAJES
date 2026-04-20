import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLES } from "@/data/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

import { projectService, ProjectResponse } from "@/services/projectService";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: userService.getUsers });
  const { data: projects = [] as ProjectResponse[] } = useQuery({ queryKey: ["projects"], queryFn: projectService.getAllProjects });

  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario creado");
      setOpen(false);
      resetForm();
    },
    onError: () => toast.error("Error al crear usuario")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => userService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario actualizado");
      setOpen(false);
      resetForm();
    },
    onError: () => toast.error("Error al actualizar usuario")
  });

  const deleteMutation = useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario eliminado");
    },
    onError: () => toast.error("Error al eliminar usuario")
  });

  const [open, setOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [employeeCode, setEmployeeCode] = useState("");
  const [name, setName] = useState("");
  const [homeLocation, setHomeLocation] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [assignedProjects, setAssignedProjects] = useState<any[]>([]);
  const [newProjectId, setNewProjectId] = useState("");
  const [newProjectRole, setNewProjectRole] = useState("");

  const resetForm = () => {
    setEditingUserId(null);
    setEmployeeCode("");
    setName("");
    setHomeLocation("");
    setPassword("");
    setRole("");
    setAssignedProjects([]);
    setNewProjectId("");
    setNewProjectRole("");
  };

  const handleOpenCreate = () => {
    resetForm();
    setOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setEditingUserId(user.id);
    setEmployeeCode(user.employee_code);
    setName(user.name);
    setHomeLocation(user.home_location || "");
    setRole(user.role || "");
    setPassword(""); // Clear password field for security
    setAssignedProjects([...(user.assigned_projects || [])]);
    setNewProjectId("");
    setNewProjectRole(user.role || "");
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!name || !role) return;
    
    if (editingUserId) {
      let finalProjects = [...assignedProjects];
      if (newProjectId && newProjectRole) {
        const pInfo = projects.find((p: any) => p.id === newProjectId);
        if (pInfo && !finalProjects.find(ap => ap.project_id === newProjectId)) {
           finalProjects.push({
             project_id: newProjectId,
             project_code: pInfo.code,
             project_name: pInfo.name,
             role: newProjectRole
           });
        }
      }
      const data: any = { name, home_location: homeLocation, role, assigned_projects: finalProjects };
      if (password) data.password = password;
      updateMutation.mutate({ id: editingUserId, data });
    } else {
      if (!employeeCode || !password) return;
      createMutation.mutate({
        employee_code: employeeCode,
        name,
        home_location: homeLocation,
        role,
        password,
      });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary shrink-0" />
          <h1 className="text-2xl font-semibold">Usuarios</h1>
        </div>
        <Button size="sm" className="gap-1.5 w-full sm:w-auto" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" />Añadir Usuario
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) resetForm(); }}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingUserId ? "Editar Usuario" : "Crear Usuario"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-4">
            <div>
              <Label>Código Empleado / Usuario</Label>
              <Input
                value={employeeCode}
                onChange={e => setEmployeeCode(e.target.value)}
                disabled={!!editingUserId}
                placeholder="Ej: mariogar"
              />
            </div>
            <div><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div>
              <Label>Rol Predeterminado</Label>
              <Select value={role} onValueChange={(value) => {
                setRole(value);
                if (!newProjectRole) {
                  setNewProjectRole(value);
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contraseña {editingUserId && "(dejar en blanco para no cambiar)"}</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {/* Edición de roles por proyecto en modo edición */}
            {editingUserId && (
              <div className="pt-4 border-t mt-4 space-y-3">
                 <Label className="text-sm font-semibold block text-primary">Proyectos y Roles Asignados</Label>
                 
                 {/* Añadir nuevo proyecto */}
                 <div className="grid grid-cols-1 gap-3 bg-muted/30 p-3 rounded-lg border border-dashed sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                    <div className="min-w-0">
                      <Label className="text-xs">Proyecto</Label>
                      <Select value={newProjectId} onValueChange={setNewProjectId}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {projects.filter(p => !assignedProjects.find(ap => ap.project_id === p.id)).map(p => (
                            <SelectItem key={p.id} value={p.id}>[{p.code}] {p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-0">
                      <Label className="text-xs">Rol en Proyecto</Label>
                      <Select value={newProjectRole} onValueChange={setNewProjectRole}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Rol..." /></SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="h-8 w-full sm:w-auto"
                      disabled={!newProjectId || !newProjectRole}
                      onClick={(e) => {
                        e.preventDefault();
                        const projectInfo = projects.find((p: any) => p.id === newProjectId);
                        if (!projectInfo) return;
                        setAssignedProjects([...assignedProjects, {
                          project_id: newProjectId,
                          project_code: projectInfo.code,
                          project_name: projectInfo.name,
                          role: newProjectRole
                        }]);
                        setNewProjectId("");
                        setNewProjectRole(role);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                 </div>

                 {/* Lista editable de proyectos actuales */}
                 {assignedProjects.length === 0 ? (
                   <p className="text-sm text-muted-foreground p-2">El usuario no está asignado a ningún proyecto.</p>
                 ) : (
                   <div className="space-y-2 max-h-56 overflow-y-auto">
                     {assignedProjects.map((p: any, idx) => (
                       <div key={p.project_id} className="flex flex-col gap-2 text-sm bg-card border shadow-sm p-3 rounded-lg sm:flex-row sm:items-center">
                          <span className="font-medium leading-tight text-xs min-w-0 flex-1">
                            [{p.project_code}] {p.project_name}
                          </span>
                          <div className="flex items-center gap-2 sm:shrink-0">
                          <Select 
                            value={p.role} 
                            onValueChange={(newRole) => {
                               const updated = [...assignedProjects];
                               updated[idx].role = newRole;
                               setAssignedProjects(updated);
                            }}
                          >
                            <SelectTrigger className="h-8 w-full text-xs sm:w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {USER_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setAssignedProjects(assignedProjects.filter(ap => ap.project_id !== p.project_id));
                            }}
                          >
                             <Trash2 className="h-4 w-4" />
                          </Button>
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
            )}

            <Button onClick={handleSubmit} className="w-full mt-4" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingUserId ? "Actualizar Usuario" : "Crear Usuario"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile view */}
      <div className="md:hidden space-y-3">
        {users.map(u => (
          <div key={u.id} className="rounded-lg border bg-card p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{u.name}</p>
                {u.is_admin && <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full font-semibold">Admin</span>}
              </div>
              <p className="text-xs text-muted-foreground">{u.employee_code}</p>
              <p className="text-xs text-muted-foreground">Rol: {u.role || "Sin rol base"}</p>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9" 
                onClick={() => handleOpenEdit(u)}
                disabled={u.is_admin && u.id !== currentUser?.id}
                title={u.is_admin && u.id !== currentUser?.id ? "No puedes editar a otros administradores" : ""}
              >
                <Edit className="h-4 w-4 text-primary" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9" 
                onClick={() => {
                  if (window.confirm(`¿Estás seguro de que deseas eliminar a ${u.name}?`)) {
                    deleteMutation.mutate(u.id);
                  }
                }}
                disabled={u.is_admin}
                title={u.is_admin ? "No se pueden eliminar administradores" : ""}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>


      {/* Desktop view */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.employee_code}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {u.name}
                      {u.is_admin && <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full font-semibold">Admin</span>}
                    </div>
                  </TableCell>
                  <TableCell>{u.role || "Sin rol base"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleOpenEdit(u)}
                        disabled={u.is_admin && u.id !== currentUser?.id}
                        title={u.is_admin && u.id !== currentUser?.id ? "No puedes editar a otros administradores" : ""}
                      >
                        <Edit className="h-4 w-4 text-primary" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de que deseas eliminar a ${u.name}?`)) {
                            deleteMutation.mutate(u.id);
                          }
                        }}
                        disabled={u.is_admin}
                        title={u.is_admin ? "No se pueden eliminar administradores" : ""}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
