import {
  LayoutDashboard, Users, FolderKanban, ListTodo, FileBarChart, FileSpreadsheet,
  Clock, Briefcase, History, BarChart3, LogOut, HelpCircle, Settings2
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const adminItems = [
  { title: "Panel", url: "/", icon: LayoutDashboard },
  { title: "Usuarios", url: "/admin/users", icon: Users },
  { title: "Proyectos", url: "/admin/projects", icon: FolderKanban },
  { title: "Tareas", url: "/tasks", icon: ListTodo },
  { title: "Gestión de Fichajes", url: "/admin/management", icon: Settings2 },
  { title: "Informes", url: "/admin/reports", icon: FileBarChart },
  { title: "Exportar Excel", url: "/admin/export", icon: FileSpreadsheet },
  { title: "Ayuda", url: "/help", icon: HelpCircle },
];

const userItems = [
  { title: "Registrar Horas", url: "/", icon: Clock },
  { title: "Mis Proyectos", url: "/my-projects", icon: Briefcase },
  { title: "Historial", url: "/history", icon: History },
  { title: "Estadísticas", url: "/statistics", icon: BarChart3 },
  { title: "Tareas", url: "/tasks", icon: ListTodo },
  { title: "Ayuda", url: "/help", icon: HelpCircle },
];

export function AppSidebar() {
  const { isAdmin, user, logout } = useAuth();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const items = isAdmin ? adminItems : userItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <span className="text-xs font-semibold tracking-wider uppercase">
                {isAdmin ? "Panel Admin" : "Control Horario"}
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      onClick={() => setOpenMobile(false)}
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              className="hover:bg-sidebar-accent/50 cursor-pointer transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4 shrink-0" />
              {!collapsed && <span>Cerrar sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && user && (
          <div className="px-3 pb-3 text-xs text-sidebar-foreground/60">
            {user.name} · {isAdmin ? "Admin" : user.role}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
