import React, { useState, useEffect } from 'react';
import { Menu, LayoutDashboard, Package, Users, FileText, Settings, Bell } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    document.body.classList.add('mobile-nav-open');
    return () => document.body.classList.remove('mobile-nav-open');
  }, [mobileSidebarOpen]);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('orders')) return 'Órdenes';
    if (path.includes('customers')) return 'Clientes';
    if (path.includes('claims')) return 'Reclamos';
    if (path.includes('calls')) return 'Llamadas';
    if (path.includes('invoices')) return 'Facturación';
    if (path.includes('logistics')) return 'Logística';
    if (path.includes('deliveries')) return 'Despachos';
    if (path.includes('warranties')) return 'Garantías';
    if (path.includes('notifications')) return 'Alertas IA';
    if (path.includes('ai-reports')) return 'Reportes IA';
    if (path.includes('system')) return 'Sistema';
    if (path.includes('users')) return 'Usuarios';
    return 'RADAR V3';
  };

  return (
    <div className="app-shell">
      <div className="app-top-bar">
        <button
          type="button"
          className="app-mobile-menu-btn"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <div className="app-top-bar-brand">
          <span className="app-top-bar-logo font-outfit">RADAR V3</span>
          <span className="app-top-bar-subtitle">{getPageTitle()}</span>
        </div>
        <div className="app-top-bar-actions">
          <NavLink to="/notifications" className="topbar-link" aria-label="Alertas">
            <Bell size={20} />
          </NavLink>
          <NavLink to="/system" className="topbar-link" aria-label="Sistema">
            <Settings size={20} />
          </NavLink>
        </div>
      </div>

      <header className="app-mobile-header">
        <button
          type="button"
          className="app-mobile-menu-btn"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>
        <div className="app-mobile-brand">
          <span className="font-outfit">RADAR V2</span>
        </div>
      </header>

      <Sidebar isMobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
      
      <main className="app-main">
        <div className="glass-card app-main-card">
          <div className="wizard-experience">
            {children}
          </div>
        </div>
      </main>

      <nav className="app-bottom-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={22} />
          <span>Inicio</span>
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Package size={22} />
          <span>Órdenes</span>
        </NavLink>
        <NavLink to="/customers" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Users size={22} />
          <span>Clientes</span>
        </NavLink>
        <NavLink to="/invoices" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <FileText size={22} />
          <span>Facturas</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default Layout;
