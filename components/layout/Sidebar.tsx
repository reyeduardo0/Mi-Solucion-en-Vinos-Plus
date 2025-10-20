import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  DashboardIcon,
  EntryIcon,
  StockIcon,
  CreatePackIcon,
  PackModelIcon,
  GenerateLabelIcon,
  ExitIcon,
  IncidentIcon,
  ReportsIcon,
  TraceabilityIcon,
  UsersIcon,
  AuditIcon
} from '../../constants';
import { usePermissions } from '../../hooks/usePermissions';

const Sidebar: React.FC = () => {
    const { can } = usePermissions();

    const navLinks = [
        { path: '/', label: 'Dashboard', icon: <DashboardIcon />, permission: true },
        { path: '/entradas', label: 'Entradas', icon: <EntryIcon />, permission: can('entries:view') },
        { path: '/stock', label: 'Stock', icon: <StockIcon />, permission: can('stock:view') },
        { path: '/packing', label: 'Crear Pack', icon: <CreatePackIcon />, permission: can('packs:create') },
        { path: '/modelos-pack', label: 'Modelos de Pack', icon: <PackModelIcon />, permission: can('packs:manage_models') },
        { path: '/etiquetas', label: 'Generar Etiquetas', icon: <GenerateLabelIcon />, permission: can('labels:generate') },
        { path: '/salidas', label: 'Salidas', icon: <ExitIcon />, permission: can('dispatch:create') },
        { path: '/incidencias', label: 'Incidencias', icon: <IncidentIcon />, permission: can('incidents:manage') },
        { path: '/reportes', label: 'Reportes', icon: <ReportsIcon />, permission: can('reports:view') },
        { path: '/trazabilidad', label: 'Trazabilidad', icon: <TraceabilityIcon />, permission: true },
    ];
    
    const adminLinks = [
        { path: '/usuarios', label: 'Usuarios y Roles', icon: <UsersIcon />, permission: can('users:manage') },
        { path: '/auditoria', label: 'Auditoría', icon: <AuditIcon />, permission: true },
    ]

  return (
    <aside className="bg-brand-dark text-brand-light w-64 space-y-6 py-7 px-2 flex flex-col justify-between h-screen">
      <div>
        <div className="text-white font-bold text-center text-lg mb-8">
            Mi Solución en Vinos
        </div>
        <nav className="space-y-1">
            {navLinks.filter(link => link.permission).map((link) => (
                <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 p-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                        isActive
                          ? 'bg-brand-yellow text-brand-dark'
                          : 'hover:bg-brand-gray-dark hover:text-white'
                      }`
                    }
                >
                    {link.icon}
                    <span>{link.label}</span>
                </NavLink>
            ))}
        </nav>
        <div className="mt-6 pt-6 border-t border-brand-gray-dark">
             <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Administración</h3>
             <div className="space-y-1">
                {adminLinks.filter(link => link.permission).map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        className={({ isActive }) =>
                        `flex items-center space-x-3 p-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                            isActive
                            ? 'bg-brand-yellow text-brand-dark'
                            : 'hover:bg-brand-gray-dark hover:text-white'
                        }`
                        }
                    >
                        {link.icon}
                        <span>{link.label}</span>
                    </NavLink>
                ))}
             </div>
        </div>
      </div>
      <div className="px-2 pb-2 text-left">
          <p className="text-xs text-gray-500">Desarrollado por:</p>
          <p className="text-sm font-medium text-gray-400">Msc. Ing. Eduardo Rey</p>
      </div>
    </aside>
  );
};

export default Sidebar;