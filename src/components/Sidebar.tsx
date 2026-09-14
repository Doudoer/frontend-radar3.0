import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Phone, LogOut, Package, Users, AlertCircle, Settings, Sun, Moon, Bell, Bot, X } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { useSystemSettings } from '../store/SystemSettingsContext';
import api from '../services/api';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onCloseMobile }) => {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSystemSettings();
  const location = useLocation();

  // State for active warranties
  const [activeWarranties, setActiveWarranties] = React.useState([] as any[]);

  React.useEffect(() => {
    if (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'manager' || user?.role?.toLowerCase() === 'operator') {
      api.get('/warranties/active', { skipGlobalErrorToast: true } as any)
        .then(res => setActiveWarranties(res.data?.data || []))
        .catch(() => setActiveWarranties([]));
    }
  }, [user]);

  React.useEffect(() => {
    if (isMobileOpen) {
      onCloseMobile?.();
    }
  }, [location.pathname]);

  const role = user?.role?.toLowerCase();
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isOperator = role === 'operator';
  const canAccessOperationalModules = isAdmin || isManager || isOperator;

  const links = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/orders', icon: <Package size={20} />, label: 'Órdenes' },
    { to: '/customers', icon: <Users size={20} />, label: 'Clientes' },
    { to: '/claims', icon: <AlertCircle size={20} />, label: 'Reclamos' },
    { to: '/calls', icon: <Phone size={20} />, label: 'Registro de Llamadas' },
    ...(canAccessOperationalModules ? [
      ...(settings.notificationsEnabled ? [{ to: '/notifications', icon: <Bell size={20} />, label: 'Alertas IA' }] : []),
      ...(settings.aiReportsEnabled ? [{ to: '/ai-reports', icon: <Bot size={20} />, label: 'Reportes IA' }] : []),
      ...(isAdmin ? [{ to: '/system', icon: <Settings size={20} />, label: 'Sistema' }] : []),
      ...(isAdmin ? [{ to: '/users', icon: <Users size={20} />, label: 'Usuarios' }] : [])
    ] : []),
  ];

  return (
    <>
      <button
        type="button"
        className={`app-sidebar-backdrop ${isMobileOpen ? 'is-open' : ''}`}
        onClick={onCloseMobile}
        aria-label="Cerrar menú"
      />
      <aside className={`glass-card app-sidebar ${isMobileOpen ? 'is-open' : ''}`}>
      <div className="app-sidebar-brand-row">
        <h2 className="sidebar-logo">RADAR V3</h2>
        <button
          type="button"
          className="app-sidebar-close-btn"
          onClick={onCloseMobile}
          aria-label="Cerrar menú lateral"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="app-sidebar-nav">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onCloseMobile}
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}

        {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'manager' || user?.role?.toLowerCase() === 'operator') && activeWarranties.length > 0 && (
          <div className="sidebar-warranty-list">
            <h3>Vencen Pronto</h3>
            <ul>
              {activeWarranties.slice(0, 5).map(w => (
                <li key={w.id} className="sidebar-warranty-item">
                  <span>{w.order_code}</span>
                  <span className={w.days_left <= 7 ? 'warning' : 'secondary'}>{w.days_left}d</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={toggleTheme}
          className="sidebar-toggle-btn"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </button>

        <div className="sidebar-user-info">
          <p>{user?.name}</p>
          <p>{user?.role.toUpperCase()}</p>
        </div>

        <button
          onClick={logout}
          className="sidebar-logout-btn"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
