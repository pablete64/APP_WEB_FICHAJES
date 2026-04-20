import type { TaskResponse } from "@/services/taskService";
import type { ProjectResponse } from "@/services/projectService";

export function normalizeRole(role?: string | null): string {
  return (role || "").trim().toUpperCase();
}

export function isManagementRole(role?: string | null): boolean {
  return ["MANAGEMENT", "ADMIN"].includes(normalizeRole(role));
}

export function isTaskAllowedForRole(
  role: string | undefined | null,
  task: TaskResponse,
  _project?: ProjectResponse | null
): boolean {
  const normalizedRole = normalizeRole(role);
  const code = String(task.code || "");

  if (!normalizedRole || !code) return false;
  if (isManagementRole(normalizedRole)) return true;

  if (normalizedRole === "PROYECTISTAS MECANICOS") {
    return code === "100" || code.startsWith("11");
  }

  if (normalizedRole === "PROYECTISTAS ELECTRICOS") {
    return code === "100" || code.startsWith("12") || code.startsWith("32") || code.startsWith("42");
  }

  if (normalizedRole === "PROGRAMADORES") {
    return code === "100" || code.startsWith("12") || code.startsWith("43");
  }

  if (normalizedRole === "MONTADORES") {
    return code.startsWith("2");
  }

  return false;
}
