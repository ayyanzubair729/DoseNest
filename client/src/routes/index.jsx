import { Routes, Route } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import HomePage from "../pages/HomePage";
import DashboardPage from "../pages/DashboardPage";
import MedicationsPage from "../pages/MedicationsPage";
import FamilyCarePage from "../pages/FamilyCarePage";
import FamilyMemberDetailPage from "../pages/FamilyMemberDetailPage";
import SettingsPage from "../pages/SettingsPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import NotFoundPage from "../pages/NotFoundPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medications"
          element={
            <ProtectedRoute>
              <MedicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family-care"
          element={
            <ProtectedRoute>
              <FamilyCarePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family-care/:id"
          element={
            <ProtectedRoute>
              <FamilyMemberDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
