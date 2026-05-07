// Task definitions grouped by category
export interface TaskDefinition {
  code: string;
  name: string;
  category: string;
  roleFilter: string[];
}

export const TASK_CATEGORIES = {
  OFFICINA_TECNICA: "OFICINA TECNICA",
  TALLER_NEWAL: "TALLER NEWAL",
  PLANTA_CLIENTE: "PLANTA CLIENTE",
} as const;

export const USER_ROLES = [
  "PROYECTISTAS MECANICOS",
  "PROYECTISTAS ELECTRICOS",
  "PROGRAMADORES",
  "MONTADORES",
] as const;

export type UserRole = typeof USER_ROLES[number];

const ALL_PRODUCTION_ROLES = [...USER_ROLES];

export const TASKS: TaskDefinition[] = [
  // --- BLOQUE 100: OFICINA TÉCNICA ---
  { code: "111", name: "Gestión Técnica Mecánica", category: TASK_CATEGORIES.OFFICINA_TECNICA, roleFilter: ["PROYECTISTAS MECANICOS"] },
  { code: "112", name: "Diseño 3D", category: TASK_CATEGORIES.OFFICINA_TECNICA, roleFilter: ["PROYECTISTAS MECANICOS"] },
  { code: "113", name: "Diseño 2D", category: TASK_CATEGORIES.OFFICINA_TECNICA, roleFilter: ["PROYECTISTAS MECANICOS"] },
  { code: "114", name: "Documentación Mecánica", category: TASK_CATEGORIES.OFFICINA_TECNICA, roleFilter: ["PROYECTISTAS MECANICOS"] },
  { code: "115", name: "Estudio ofertas", category: TASK_CATEGORIES.OFFICINA_TECNICA, roleFilter: ["PROYECTISTAS MECANICOS", "PROGRAMADORES"] },
  
  { code: "121", name: "Gestión Técnica Eléctrica", category: TASK_CATEGORIES.OFFICINA_TECNICA, roleFilter: ["PROYECTISTAS ELECTRICOS"] },
  { code: "122", name: "Diseño Elécrico", category: TASK_CATEGORIES.OFFICINA_TECNICA, roleFilter: ["PROYECTISTAS ELECTRICOS"] },
  
  { code: "123", name: "Programación PLC Off-line", category: TASK_CATEGORIES.OFFICINA_TECNICA, roleFilter: ["PROGRAMADORES"] },
  { code: "124", name: "Programación Robot OffLine", category: TASK_CATEGORIES.OFFICINA_TECNICA, roleFilter: ["PROGRAMADORES"] },
  { code: "125", name: "PeM PLC Newval", category: TASK_CATEGORIES.OFFICINA_TECNICA, roleFilter: ["PROGRAMADORES"] },
  { code: "126", name: "PeM Robot Newval", category: TASK_CATEGORIES.OFFICINA_TECNICA, roleFilter: ["PROGRAMADORES"] },
  { code: "127", name: "Doc. Eléctrica y Manuales", category: TASK_CATEGORIES.OFFICINA_TECNICA, roleFilter: ["PROGRAMADORES"] },

  // --- BLOQUE 200: MATERIALES ---
  { code: "211", name: "Comerciales Mecánicos (€)", category: "Materiales", roleFilter: ALL_PRODUCTION_ROLES },
  { code: "212", name: "Materia Prima (€)", category: "Materiales", roleFilter: ALL_PRODUCTION_ROLES },
  { code: "221", name: "Comerciales Eléctricos (€)", category: "Materiales", roleFilter: ALL_PRODUCTION_ROLES },
  { code: "222", name: "Comerciales Fluidos (€)", category: "Materiales", roleFilter: ALL_PRODUCTION_ROLES },

  // --- BLOQUE 300: TALLER NEWVAL ---
  { code: "311", name: "Fabricación", category: TASK_CATEGORIES.TALLER_NEWAL, roleFilter: ALL_PRODUCTION_ROLES },
  { code: "312", name: "Metrología", category: TASK_CATEGORIES.TALLER_NEWAL, roleFilter: ALL_PRODUCTION_ROLES },
  { code: "313", name: "Montaje y PaP", category: TASK_CATEGORIES.TALLER_NEWAL, roleFilter: ["MONTADORES"] },
  { code: "321", name: "Armarios y cajas", category: TASK_CATEGORIES.TALLER_NEWAL, roleFilter: ["MONTADORES"] },
  { code: "322", name: "Montaje e inst. Eléctrica", category: TASK_CATEGORIES.TALLER_NEWAL, roleFilter: ["MONTADORES"] },

  // --- BLOQUE 400: PLANTA CLIENTE ---
  { code: "411", name: "Montaje y PeM Cliente", category: TASK_CATEGORIES.PLANTA_CLIENTE, roleFilter: ["MONTADORES"] },
  { code: "421", name: "Montaje e Inst. Elec. PeM Cli", category: TASK_CATEGORIES.PLANTA_CLIENTE, roleFilter: ["MONTADORES"] },
  { code: "422", name: "Montaje e Inst. Flu.PeM Client", category: TASK_CATEGORIES.PLANTA_CLIENTE, roleFilter: ["MONTADORES"] },
  
  { code: "431", name: "PeM y Soft Cliente", category: TASK_CATEGORIES.PLANTA_CLIENTE, roleFilter: ["PROGRAMADORES"] },
  { code: "432", name: "PeM Robot Cliente", category: TASK_CATEGORIES.PLANTA_CLIENTE, roleFilter: ["PROGRAMADORES"] },
  { code: "433", name: "Formación PeM Cliente", category: TASK_CATEGORIES.PLANTA_CLIENTE, roleFilter: ["PROGRAMADORES"] },
];

export interface User {
  id: string;
  name: string;
  homeLocation: string;
  role: UserRole;
  password: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  location: string;
  distanceFromWorkshop: number;
  startDate: string;
  assignedUsers: string[]; // user IDs
  type: "standard" | "offer" | "non-productive";
}

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  roleInProject: UserRole;
  date: string;
  isHoliday: boolean;
  taskCode: string;
  hours: number;
  overtimeHours: number;
  // 4XX task fields
  vehicleUsed?: "personal" | "company";
  mealsAllowance?: boolean;
  distanceFrom?: "home" | "workshop";
}

export function isClientPlantTask(code: string): boolean {
  return code.startsWith("4");
}

export function getTasksForRole(role: string): TaskDefinition[] {
  return TASKS.filter(t => t.roleFilter.length === 0 || t.roleFilter.includes(role));
}
