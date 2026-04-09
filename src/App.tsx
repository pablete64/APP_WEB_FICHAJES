import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import HelpPage from "@/pages/HelpPage";

// User pages
import LogHours from "@/pages/user/LogHours";
import MyProjects from "@/pages/user/MyProjects";
import HistoryPage from "@/pages/user/HistoryPage";
import StatisticsPage from "@/pages/user/StatisticsPage";

// Admin pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import UsersPage from "@/pages/admin/UsersPage";
import ProjectsPage from "@/pages/admin/ProjectsPage";
import TasksPage from "@/pages/admin/TasksPage";
import ReportsPage from "@/pages/admin/ReportsPage";
import ExportPage from "@/pages/admin/ExportPage";
import TimeEntryManagement from "@/pages/admin/TimeEntryManagement";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, isAdmin } = useAuth();

  if (!user) return <LoginPage />;

  return (
    <AppLayout>
      <Routes>
        {isAdmin ? (
          <>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/projects" element={<ProjectsPage />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
            <Route path="/admin/export" element={<ExportPage />} />
            <Route path="/admin/management" element={<TimeEntryManagement />} />
          </>
        ) : (
          <>
            <Route path="/" element={<LogHours />} />
            <Route path="/my-projects" element={<MyProjects />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
          </>
        )}
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="*" element={<div className="text-center py-12 text-muted-foreground">Página no encontrada</div>} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
