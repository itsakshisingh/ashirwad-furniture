import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "./ui";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="pt-24"><PageLoader /></div>;
  if (!user || user.role !== "admin") return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
