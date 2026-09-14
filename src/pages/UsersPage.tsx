import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { UserPlus, Settings, Trash2, Check, X, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  permissions?: string[];
  created_at: string;
}

const AVAILABLE_PERMISSIONS = [
  { key: 'can_edit_orders', label: 'Crear y Editar Órdenes', desc: 'Permite registrar órdenes y modificar datos del vehículo/cliente' },
  { key: 'can_delete_orders', label: 'Eliminar / Archivar Órdenes', desc: 'Permite borrar registros de órdenes del sistema' },
  { key: 'can_manage_claims', label: 'Gestión de Reclamos', desc: 'Permite abrir, registrar seguimiento y resolver garantías' },
  { key: 'can_manage_users', label: 'Administración de Usuarios', desc: 'Permite crear cuentas y cambiar permisos del personal' },
  { key: 'can_view_financials', label: 'Ver Cifras Financieras', desc: 'Permite visualizar precios, abonos, subtotal y balances' },
  { key: 'can_export_reports', label: 'Reportes e Inteligencia IA', desc: 'Permite descargar reportes ejecutivos y disparar escaneos IA' },
];

const DEFAULT_ROLE_PERMS: Record<string, string[]> = {
  admin: AVAILABLE_PERMISSIONS.map(p => p.key),
  manager: ['can_edit_orders', 'can_manage_claims', 'can_view_financials', 'can_export_reports'],
  operator: ['can_edit_orders', 'can_manage_claims', 'can_view_financials'],
  viewer: []
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator',
    permissions: DEFAULT_ROLE_PERMS.operator
  });

  const [editData, setEditData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator',
    active: true,
    permissions: [] as string[]
  });

  const fetchUsers = async () => {
    try {
      const resp = await api.get('/users');
      setUsers(resp.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChangeCreate = (newRole: string) => {
    const defaultPerms = DEFAULT_ROLE_PERMS[newRole] || [];
    setFormData(prev => ({ ...prev, role: newRole, permissions: defaultPerms }));
  };

  const handleRoleChangeEdit = (newRole: string) => {
    const defaultPerms = DEFAULT_ROLE_PERMS[newRole] || [];
    setEditData(prev => ({ ...prev, role: newRole, permissions: defaultPerms }));
  };

  const togglePermissionCreate = (permKey: string) => {
    setFormData(prev => {
      const current = prev.permissions || [];
      const updated = current.includes(permKey)
        ? current.filter(k => k !== permKey)
        : [...current, permKey];
      return { ...prev, permissions: updated };
    });
  };

  const togglePermissionEdit = (permKey: string) => {
    setEditData(prev => {
      const current = prev.permissions || [];
      const updated = current.includes(permKey)
        ? current.filter(k => k !== permKey)
        : [...current, permKey];
      return { ...prev, permissions: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', formData);
      setShowModal(false);
      fetchUsers();
      setFormData({ name: '', email: '', password: '', role: 'operator', permissions: DEFAULT_ROLE_PERMS.operator });
      toast.success('Usuario creado con matriz de permisos asignada');
    } catch (err) {
      toast.error('Error al crear usuario');
    }
  };

  const toggleStatus = async (user: UserData) => {
    try {
      await api.put(`/users/${user.id}`, { 
        name: user.name, 
        email: user.email,
        role: user.role, 
        active: !user.active,
        permissions: user.permissions || []
      });
      fetchUsers();
      toast.success('Estado de usuario actualizado');
    } catch (err) {
      toast.error('Error al actualizar estado');
    }
  };

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setEditData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: !!user.active,
      permissions: user.permissions || DEFAULT_ROLE_PERMS[user.role] || []
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await api.put(`/users/${editingUser.id}`, {
        name: editData.name,
        email: editData.email,
        password: editData.password,
        role: editData.role,
        active: editData.active,
        permissions: editData.permissions
      });

      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
      toast.success('Usuario y matriz de permisos actualizados correctamente');
    } catch (err) {
      toast.error('Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    try {
      await api.delete(`/users/${user.id}`);
      fetchUsers();
      toast.success('Usuario eliminado correctamente');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="font-outfit" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Gestión de Usuarios & Matriz de Permisos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Control de acceso RBAC granular para asignar qué puede y qué no puede hacer cada usuario.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={18} />
          Nuevo Usuario
        </button>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1.25rem' }}>Usuario</th>
              <th style={{ padding: '1.25rem' }}>Email</th>
              <th style={{ padding: '1.25rem' }}>Rol</th>
              <th style={{ padding: '1.25rem' }}>Permisos Activos</th>
              <th style={{ padding: '1.25rem' }}>Estado</th>
              <th style={{ padding: '1.25rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={6} className="skeleton" style={{ height: '60px', margin: '10px 0' }} /></tr>
              ))
            ) : (
              users.map(user => {
                const perms = user.permissions || [];
                const isAdmin = user.role.toLowerCase() === 'admin';

                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color: 'white' }}>
                          {user.name[0]}
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: 'white', display: 'block' }}>{user.name}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>ID #{user.id}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                    <td style={{ padding: '1.25rem' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        background: user.role === 'admin' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: user.role === 'admin' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                        color: user.role === 'admin' ? '#60a5fa' : 'var(--text-secondary)'
                      }}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxWidth: '320px' }}>
                        {isAdmin ? (
                          <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.15)', color: '#4ade80', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                            ⚡ Acceso Total (Super Admin)
                          </span>
                        ) : perms.length === 0 ? (
                          <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                            🔒 Lectura Únicamente
                          </span>
                        ) : (
                          perms.map(pKey => {
                            const found = AVAILABLE_PERMISSIONS.find(ap => ap.key === pKey);
                            return (
                              <span key={pKey} style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.06)', color: '#93c5fd', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                ✓ {found ? found.label : pKey}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: user.active ? '#10b981' : 'var(--danger)' }}>
                        {user.active ? <Check size={14} /> : <X size={14} />}
                        {user.active ? 'Activo' : 'Inactivo'}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => openEditModal(user)} style={{ padding: '0.4rem' }} title="Editar usuario y permisos">
                          <Settings size={16} />
                        </button>
                        <button className="btn btn-secondary" onClick={() => toggleStatus(user)} style={{ padding: '0.4rem' }} title={user.active ? 'Desactivar usuario' : 'Activar usuario'}>
                          {user.active ? <X size={16} /> : <Check size={16} />}
                        </button>
                        <button className="btn btn-secondary" onClick={() => setUserToDelete(user)} style={{ padding: '0.4rem', color: 'var(--danger)' }} title="Eliminar usuario">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR USUARIO */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Crear Nuevo Usuario" maxWidth="650px">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label">Nombre Completo</label>
              <input className="input-field" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Carlos Mendoza" />
            </div>
            <div>
              <label className="label">Correo Electrónico</label>
              <input className="input-field" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="ejemplo@radar.com" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label">Contraseña</label>
              <input className="input-field" type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
            </div>
            <div>
              <label className="label">Rol General</label>
              <select className="input-field" value={formData.role} onChange={e => handleRoleChangeCreate(e.target.value)}>
                <option value="operator">Operador (Estándar)</option>
                <option value="manager">Gerente / Supervisor</option>
                <option value="admin">Administrador (Super Access)</option>
                <option value="viewer">Solo Lectura</option>
              </select>
            </div>
          </div>

          {/* MATRIZ DE PERMISOS GRANULARES */}
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={16} /> MATRIZ DE PERMISOS GRANULARES DEL USUARIO
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {AVAILABLE_PERMISSIONS.map(p => {
                const isChecked = (formData.permissions || []).includes(p.key);
                return (
                  <div 
                    key={p.key}
                    onClick={() => togglePermissionCreate(p.key)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '0.6rem', 
                      padding: '0.6rem 0.75rem', 
                      borderRadius: '8px', 
                      background: isChecked ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                      border: isChecked ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => {}} 
                      style={{ marginTop: '0.15rem', cursor: 'pointer' }}
                    />
                    <div>
                      <strong style={{ fontSize: '0.78rem', color: isChecked ? 'white' : 'var(--text-secondary)', display: 'block' }}>{p.label}</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{p.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Crear Usuario con Permisos</button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR USUARIO */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditingUser(null); }} title={editingUser ? `Configurar Permisos: ${editingUser.name}` : 'Editar Usuario'} maxWidth="650px">
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label">Nombre Completo</label>
              <input className="input-field" required value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Correo Electrónico</label>
              <input className="input-field" type="email" required value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label">Contraseña (Opcional)</label>
              <input className="input-field" type="password" value={editData.password} onChange={e => setEditData({ ...editData, password: e.target.value })} placeholder="Dejar vacía para conservar" />
            </div>
            <div>
              <label className="label">Rol General</label>
              <select className="input-field" value={editData.role} onChange={e => handleRoleChangeEdit(e.target.value)}>
                <option value="operator">Operador (Estándar)</option>
                <option value="manager">Gerente / Supervisor</option>
                <option value="admin">Administrador (Super Access)</option>
                <option value="viewer">Solo Lectura</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <input id="edit-active" type="checkbox" checked={editData.active} onChange={e => setEditData({ ...editData, active: e.target.checked })} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            <label htmlFor="edit-active" className="label" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>Usuario Activo en el Sistema</label>
          </div>

          {/* MATRIZ DE PERMISOS GRANULARES EN EDICIÓN */}
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={16} /> ASIGNAR O REVOCAR CAPACIDADES ESPECÍFICAS
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {AVAILABLE_PERMISSIONS.map(p => {
                const isChecked = (editData.permissions || []).includes(p.key);
                return (
                  <div 
                    key={p.key}
                    onClick={() => togglePermissionEdit(p.key)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '0.6rem', 
                      padding: '0.6rem 0.75rem', 
                      borderRadius: '8px', 
                      background: isChecked ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                      border: isChecked ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => {}} 
                      style={{ marginTop: '0.15rem', cursor: 'pointer' }}
                    />
                    <div>
                      <strong style={{ fontSize: '0.78rem', color: isChecked ? 'white' : 'var(--text-secondary)', display: 'block' }}>{p.label}</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{p.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowEditModal(false); setEditingUser(null); }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Cambios de Permisos</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={userToDelete !== null}
        title="Eliminar usuario"
        message={userToDelete ? `¿Seguro que deseas eliminar al usuario ${userToDelete.name}?` : ''}
        confirmText="Eliminar"
        danger
        onClose={() => setUserToDelete(null)}
        onConfirm={async () => {
          if (!userToDelete) return;
          await handleDeleteUser(userToDelete);
          setUserToDelete(null);
        }}
      />
    </div>
  );
};

export default UsersPage;
