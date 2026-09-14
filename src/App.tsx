import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AuthProvider, useAuth } from './store/AuthContext';
import { ThemeProvider } from './store/ThemeContext';
import { SystemSettingsProvider, useSystemSettings } from './store/SystemSettingsContext';
import Layout from './components/Layout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const ClaimsPage = lazy(() => import('./pages/ClaimsPage'));
const LogisticsPage = lazy(() => import('./pages/LogisticsPage'));
const DeliveriesPage = lazy(() => import('./pages/DeliveriesPage'));
const CallsPage = lazy(() => import('./pages/CallsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SystemAdminPage = lazy(() => import('./pages/SystemAdminPage'));
const WarrantyPage = lazy(() => import('./pages/WarrantyPage'));
const PublicTrackPage = lazy(() => import('./pages/PublicTrackPage'));
const AIReportsPage = lazy(() => import('./pages/AIReportsPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) return <div>Cargando...</div>;
  if (!token) return <Navigate to="/login" />;
  
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading, user } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!token) return <Navigate to="/login" />;
  if (user?.role?.toLowerCase() !== 'admin') return <Navigate to="/dashboard" />;

  return <>{children}</>;
};

const RoleRoute: React.FC<{ allowedRoles: string[]; children: React.ReactNode }> = ({ allowedRoles, children }) => {
  const { token, loading, user } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!token) return <Navigate to="/login" />;

  const role = String(user?.role || '').toLowerCase();
  const canAccess = allowedRoles.map(r => r.toLowerCase()).includes(role);
  if (!canAccess) return <Navigate to="/dashboard" />;

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { settings } = useSystemSettings();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/orders" element={
        <ProtectedRoute>
          <Layout>
            <OrdersPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/orders/new" element={
        <ProtectedRoute>
          <Layout>
            <OrdersPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/orders/:orderId/edit" element={
        <ProtectedRoute>
          <Layout>
            <OrdersPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/orders/:orderId" element={
        <ProtectedRoute>
          <Layout>
            <OrdersPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/customers" element={
        <ProtectedRoute>
          <Layout>
            <CustomersPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/claims" element={
        <ProtectedRoute>
          <Layout>
            <ClaimsPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/logistics" element={
        <ProtectedRoute>
          {settings.logisticsEnabled ? (
            <Layout>
              <LogisticsPage />
            </Layout>
          ) : (
            <Navigate to="/dashboard" />
          )}
        </ProtectedRoute>
      } />
      <Route path="/deliveries" element={
        <ProtectedRoute>
          {settings.deliveriesEnabled ? (
            <Layout>
              <DeliveriesPage />
            </Layout>
          ) : (
            <Navigate to="/dashboard" />
          )}
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <AdminRoute>
          <Layout>
            <UsersPage />
          </Layout>
        </AdminRoute>
      } />
      <Route path="/calls" element={
        <ProtectedRoute>
          <Layout>
            <CallsPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute>
          {settings.notificationsEnabled ? (
            <Layout>
              <NotificationsPage />
            </Layout>
          ) : (
            <Navigate to="/dashboard" />
          )}
        </ProtectedRoute>
      } />
      <Route path="/system" element={
        <AdminRoute>
          <Layout>
            <SystemAdminPage />
          </Layout>
        </AdminRoute>
      } />
      <Route path="/warranties" element={
        <ProtectedRoute>
          <Layout>
            <WarrantyPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/ai-reports" element={
        <RoleRoute allowedRoles={['admin', 'operator', 'manager']}>
          {settings.aiReportsEnabled ? (
            <Layout>
              <AIReportsPage />
            </Layout>
          ) : (
            <Navigate to="/dashboard" />
          )}
        </RoleRoute>
      } />
      <Route path="/invoices" element={
        <ProtectedRoute>
          <Layout>
            <InvoicesPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/track/:hash" element={<PublicTrackPage />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SystemSettingsProvider>
          <MotionConfig reducedMotion="always">
            <BrowserRouter>
              <Suspense fallback={<div>Cargando...</div>}>
                <AppRoutes />
              </Suspense>
            </BrowserRouter>
          </MotionConfig>
        </SystemSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
