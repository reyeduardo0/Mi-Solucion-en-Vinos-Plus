
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
  UsersIcon,
  TraceabilityIcon,
  AuditIcon,
  ChangelogIcon,
  ProductionIcon,
  AdjustmentsIcon,
  BillingIcon
} from '../../constants';
import { usePermissions } from '../../hooks/usePermissions';

interface SidebarProps {
  onLinkClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLinkClick }) => {
    const { can } = usePermissions();

    const navLinks = [
        { path: '/', label: 'Dashboard', icon: <DashboardIcon />, permission: true },
        { path: '/entradas', label: 'Entradas', icon: <EntryIcon />, permission: can('entries:view') },
        { path: '/inventario', label: 'Inventario', icon: <StockIcon />, permission: can('stock:view') },
        { path: '/packing', label: 'Crear Pack', icon: <CreatePackIcon />, permission: can('packs:create') },
        { path: '/modelos-pack', label: 'Modelos de Pack', icon: <PackModelIcon />, permission: can('packs:manage_models') },
        { path: '/partes-montaje', label: 'Partes de Montaje', icon: <ProductionIcon />, permission: can('production:manage') },
        { path: '/etiquetas', label: 'Generar Etiquetas', icon: <GenerateLabelIcon />, permission: can('labels:generate') },
        { path: '/salidas', label: 'Salidas', icon: <ExitIcon />, permission: can('dispatch:create') },
        { path: '/incidencias', label: 'Incidencias', icon: <IncidentIcon />, permission: can('incidents:manage') },
        { path: '/reportes', label: 'Reportes', icon: <ReportsIcon />, permission: can('reports:view') },
        { path: '/trazabilidad', label: 'Trazabilidad', icon: <TraceabilityIcon />, permission: can('traceability:view') },
        { path: '/facturacion', label: 'Facturación', icon: <BillingIcon />, permission: can('billing:manage') },
    ];
    
    const adminLinks = [
        { path: '/usuarios', label: 'Usuarios y Roles', icon: <UsersIcon />, permission: can('users:manage') },
        { path: '/auditoria', label: 'Auditoría', icon: <AuditIcon />, permission: can('audit:view') },
        { path: '/ajustes-inventario', label: 'Ajustes de Inventario', icon: <AdjustmentsIcon />, permission: can('inventory:adjust') },
    ]

    const systemLinks = [
        { path: '/changelog', label: 'Historial de Cambios', icon: <ChangelogIcon />, permission: true },
    ]

  return (
    <aside className="bg-brand-dark text-brand-light w-64 flex flex-col h-full overflow-hidden select-none border-r border-gray-800 shadow-xl">
      {/* Brand Header */}
      <div className="py-5 px-4 flex items-center justify-center border-b border-brand-gray-dark/50 flex-shrink-0">
        <div className="flex items-center space-x-2">
            <span className="w-2 h-5 bg-brand-yellow rounded-full inline-block"></span>
            <span className="text-white font-bold text-lg tracking-tight">Mi Solución en Vinos</span>
        </div>
      </div>

      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-3 py-4 space-y-5 min-h-0">
        <nav className="space-y-1">
            {navLinks.filter(link => link.permission).map((link) => (
                <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.path === '/'}
                    onClick={onLinkClick}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2 rounded-md font-medium text-sm transition-colors duration-150 ${
                        isActive
                          ? 'bg-brand-yellow text-brand-dark font-semibold shadow-sm'
                          : 'hover:bg-brand-gray-dark hover:text-white text-gray-300'
                      }`
                    }
                >
                    <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">{link.icon}</span>
                    <span className="truncate">{link.label}</span>
                </NavLink>
            ))}
        </nav>

        <div className="pt-4 border-t border-brand-gray-dark/60">
             <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Administración</h3>
             <div className="space-y-1">
                {adminLinks.filter(link => link.permission).map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        onClick={onLinkClick}
                        className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2 rounded-md font-medium text-sm transition-colors duration-150 ${
                            isActive
                            ? 'bg-brand-yellow text-brand-dark font-semibold shadow-sm'
                            : 'hover:bg-brand-gray-dark hover:text-white text-gray-300'
                        }`
                        }
                    >
                        <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">{link.icon}</span>
                        <span className="truncate">{link.label}</span>
                    </NavLink>
                ))}
             </div>
        </div>

        <div className="pt-4 border-t border-brand-gray-dark/60">
             <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sistema</h3>
             <div className="space-y-1">
                {systemLinks.filter(link => link.permission).map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        onClick={onLinkClick}
                        className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2 rounded-md font-medium text-sm transition-colors duration-150 ${
                            isActive
                            ? 'bg-brand-yellow text-brand-dark font-semibold shadow-sm'
                            : 'hover:bg-brand-gray-dark hover:text-white text-gray-300'
                        }`
                        }
                    >
                        <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">{link.icon}</span>
                        <span className="truncate">{link.label}</span>
                    </NavLink>
                ))}
             </div>
        </div>
      </div>

      {/* Sticky Bottom Footer */}
      <div className="p-4 border-t border-brand-gray-dark/60 bg-brand-dark flex-shrink-0 text-left">
          <p className="text-xs text-gray-400">Desarrollado por:</p>
          <p className="text-sm font-semibold text-gray-200 truncate">Msc. Ing. Eduardo Rey</p>
      </div>
    </aside>
  );
};

export default Sidebar;