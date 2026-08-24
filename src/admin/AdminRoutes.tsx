import { Route, Routes } from 'react-router-dom';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminAuthProvider } from './auth';
import { RequireAdmin } from './components/RequireAdmin';
import { AdminBrandsPage } from './pages/AdminBrandsPage';
import { AdminCategoriesPage } from './pages/AdminCategoriesPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminHomepagePage } from './pages/AdminHomepagePage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminProductEditPage } from './pages/AdminProductEditPage';
import { AdminProductNewPage } from './pages/AdminProductNewPage';
import { AdminProductsPage } from './pages/AdminProductsPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';
import { AdminOrderDetailPage } from './pages/AdminOrderDetailPage';
import { AdminSeoPage } from './pages/AdminSeoPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminNexoraPage } from './pages/AdminNexoraPage';

/**
 * The whole /admin subtree.
 *
 * Mounted from a single lazy route in App, so admin code never reaches a
 * customer's browser. Every route except /admin/login sits behind RequireAdmin.
 */
export function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />

        <Route
          index
          element={
            <RequireAdmin>
              <AdminDashboardPage />
            </RequireAdmin>
          }
        />
        <Route
          path="products"
          element={
            <RequireAdmin>
              <AdminProductsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="products/new"
          element={
            <RequireAdmin>
              <AdminProductNewPage />
            </RequireAdmin>
          }
        />
        <Route
          path="products/:id/edit"
          element={
            <RequireAdmin>
              <AdminProductEditPage />
            </RequireAdmin>
          }
        />
        <Route
          path="orders"
          element={
            <RequireAdmin>
              <AdminOrdersPage />
            </RequireAdmin>
          }
        />
        <Route
          path="orders/:id"
          element={
            <RequireAdmin>
              <AdminOrderDetailPage />
            </RequireAdmin>
          }
        />
        <Route
          path="categories"
          element={
            <RequireAdmin>
              <AdminCategoriesPage />
            </RequireAdmin>
          }
        />
        <Route
          path="brands"
          element={
            <RequireAdmin>
              <AdminBrandsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="homepage"
          element={
            <RequireAdmin>
              <AdminHomepagePage />
            </RequireAdmin>
          }
        />
        <Route
          path="seo"
          element={
            <RequireAdmin>
              <AdminSeoPage />
            </RequireAdmin>
          }
        />
        <Route
          path="settings"
          element={
            <RequireAdmin>
              <AdminSettingsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="settings/integrations/nexora"
          element={
            <RequireAdmin>
              <AdminNexoraPage />
            </RequireAdmin>
          }
        />
        <Route
          path="integrations"
          element={
            <RequireAdmin>
              <AdminNexoraPage />
            </RequireAdmin>
          }
        />
        <Route
          path="integrations/nexora"
          element={
            <RequireAdmin>
              <AdminNexoraPage />
            </RequireAdmin>
          }
        />

        {/* An unknown /admin/* path is still a 404, not a silent redirect. */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AdminAuthProvider>
  );
}
