import { Navigate, Outlet } from "react-router-dom";
import { useAdminStore } from "@/store/adminStore";

export function ProtectedRoute() {
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
