import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { USER_ROLES, UserRole } from "@/data/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";



export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: userService.getUsers });

  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario creado");
      setName(""); setHomeLocation(""); setRole(""); setPassword("");
      setOpen(false);
    },
    onError: () => toast.error("Error al crear usuario")
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
  const [employeeCode, setEmployeeCode] = useState("");
  const [name, setName] = useState("");
  const [homeLocation, setHomeLocation] = useState("");
  const [role, setRole] = useState<string>("");
  const [password, setPassword] = useState("");

  const handleCreate = () => {
    if (!employeeCode || !name || !role || !password) return;
    createMutation.mutate({
      employee_code: employeeCode,
      name,
      home_location: homeLocation,
      role,
      password,
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary shrink-0" />
          <h1 className="text-2xl font-semibold">Usuarios</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 w-full sm:w-auto"><Plus className="h-4 w-4" />Añadir Usuario</Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Crear Usuario</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Código Empleado</Label><Input value={employeeCode} onChange={e => setEmployeeCode(e.target.value)} /></div>
              <div><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
              <div><Label>Domicilio</Label><Input value={homeLocation} onChange={e => setHomeLocation(e.target.value)} /></div>
              <div>
                <Label>Rol</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Contraseña</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
              <Button onClick={handleCreate} className="w-full">Crear Usuario</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Mobile card list (< md) ── */}
      <div className="md:hidden space-y-3">
        {users.map(u => (
          <div key={u.id} className="rounded-lg border bg-card p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{u.name}</p>
              <p className="text-xs text-muted-foreground truncate">{u.home_location || "—"}</p>
              <span className="inline-block mt-1 text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">{u.role}</span>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => handleDelete(u.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* ── Desktop table (≥ md) ── */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Domicilio</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.home_location}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
