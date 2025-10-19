import React from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardIcon, EntryIcon, StockIcon, CreatePackIcon, GenerateLabelIcon, ExitIcon, IncidentIcon, ReportsIcon, UsersIcon, AuditIcon, SyncIcon, PackModelIcon, TraceabilityIcon } from '../../constants';

interface SidebarProps {
  isSidebarOpen: boolean;
}

const LogoIcon = () => (
    <div className="w-9 h-9 bg-brand-yellow rounded-md flex justify-center items-center flex-shrink-0">
        <div className="flex space-x-1.5">
            <div className="w-1 h-4 bg-brand-dark rounded-full"></div>
            <div className="w-1 h-4 bg-brand-dark rounded-full"></div>
        </div>
    </div>
);

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen }) => {
  const mainNavItems = [
    { to: "/", icon: <DashboardIcon />, label: "Dashboard" },
    { to: "/entradas", icon: <EntryIcon />, label: "Entradas" },
    { to: "/inventory", icon: <StockIcon />, label: "Stock" },
    { to: "/pack-models", icon: <PackModelIcon />, label: "Modelos de Pack" },
    { to: "/packing", icon: <CreatePackIcon />, label: "Crear Pack" },
    { to: "/labels", icon: <GenerateLabelIcon />, label: "Generar Etiquetas" },
    { to: "/salidas", icon: <ExitIcon />, label: "Salidas" },
    { to: "/incidents", icon: <IncidentIcon />, label: "Incidencias" },
    { to: "/trazabilidad", icon: <TraceabilityIcon />, label: "Trazabilidad" },
    { to: "/reportes", icon: <ReportsIcon />, label: "Reportes" },
  ];

  const adminNavItems = [
    { to: "/usuarios", icon: <UsersIcon />, label: "Usuarios" },
    { to: "/auditoria", icon: <AuditIcon />, label: "Auditoría" },
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
    `flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 ${
      isActive ? 'bg-brand-yellow text-black' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`;

  return (
    <aside className={`bg-brand-dark text-white w-64 absolute inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out z-30 flex flex-col`}>
      <div className="flex items-center space-x-3 p-4 border-b border-brand-gray-dark">
        <LogoIcon />
        <span className="text-xl font-bold">MiSoluciónVinos</span>
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-4">
        <div className="space-y-1">
            {mainNavItems.map(item => (
                <NavLink key={item.to} to={item.to} className={navLinkClass} end>
                {item.icon}
                <span className="ml-3">{item.label}</span>
                </NavLink>
            ))}
        </div>
        
        <div className="mt-8">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Administración</h3>
            <div className="space-y-1">
                {adminNavItems.map(item => (
                    <NavLink key={item.to} to={item.to} className={navLinkClass} end>
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </div>
      </nav>

      <div className="mt-auto px-3 py-4 border-t border-brand-gray-dark">
        <p className="text-xs text-gray-500 text-center">Desarrollado Por:</p>
        <p className="text-sm text-gray-400 text-center">Msc. Ing. Eduardo Rey</p>
      </div>
    </aside>
  );
};

export default Sidebar;