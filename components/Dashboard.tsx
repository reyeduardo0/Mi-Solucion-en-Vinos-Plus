import React from 'react';
import Card from './ui/Card';
import { NewEntryIcon, NewPackIcon, NewExitIcon } from '../constants';
// FIX: Added CartesianGrid to recharts import.
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Albaran, Incident, WinePack } from '../types';

interface DashboardProps {
  albaranes: Albaran[];
  incidents: Incident[];
  packs: WinePack[];
  salidas: any[]; // Assuming simple array for now
  navigateTo: (path: string) => void;
}

const QuickAccessButton: React.FC<{ icon: React.ReactNode; text: string; onClick: () => void; }> = ({ icon, text, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center justify-center p-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors duration-200">
        {icon}
        <span>{text}</span>
    </button>
);

const StatCard: React.FC<{ title: string; value: string | number; colorClass: string; }> = ({ title, value, colorClass }) => (
    <div className={`p-4 rounded-lg text-white ${colorClass}`}>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ albaranes, incidents, packs, salidas, navigateTo }) => {
  const totalPallets = albaranes.reduce((sum, a) => sum + a.pallets.length, 0);
  const totalBottles = albaranes.reduce((sum, a) => sum + a.pallets.reduce((pSum, p) => pSum + p.totalBottles, 0), 0);
  const openIncidents = incidents.filter(i => !i.resolved).length;
  const packsCreated = packs.length;

  const movementData = [
    { name: 'Entradas', Total: albaranes.length },
    { name: 'Salidas', Total: salidas.length },
    { name: 'Incidencias', Total: openIncidents },
  ];
  const movementColors = ['#22c55e', '#ef4444', '#f59e0b'];
  
  const recentEntries = [
    { id: 'ALB-E-20251013', carrier: 'Transportes Rápidos - 2 palets' },
    { id: 'ALB-E-20251014', carrier: 'Logística Segura - 1 palets' },
    { id: 'ALB-E-20251015', carrier: 'Transportes Rápidos - 1 palets' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-1">Dashboard</h1>
      
      <section className="my-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Acceso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickAccessButton icon={<NewEntryIcon/>} text="Nueva Entrada" onClick={() => navigateTo('/entradas/nueva')} />
            <QuickAccessButton icon={<NewPackIcon/>} text="Crear Pack" onClick={() => navigateTo('/packing')} />
            {/* FIX: Corrected typo from QuickAccessAccessButton to QuickAccessButton. */}
            <QuickAccessButton icon={<NewExitIcon/>} text="Nueva Salida" onClick={() => navigateTo('/salidas')} />
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="col-span-2 md:col-span-1 lg:col-span-2"><StatCard title="Stock Total (Palets)" value={totalPallets} colorClass="bg-blue-500" /></div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2"><StatCard title="Stock Total (Botellas)" value={totalBottles.toLocaleString('es-ES')} colorClass="bg-green-500" /></div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2"><StatCard title="Packs Creados" value={packsCreated} colorClass="bg-cyan-500" /></div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2"><StatCard title="Packs en Proceso" value={0} colorClass="bg-orange-500" /></div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2"><StatCard title="Incidencias Pendientes" value={openIncidents} colorClass="bg-yellow-500" /></div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2"><StatCard title="Salidas (Este Mes)" value={salidas.length} colorClass="bg-purple-500" /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Resumen de Movimientos" className="lg:col-span-2">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={movementData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Total" fill="#8884d8">
                    {movementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={movementColors[index % movementColors.length]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        <Card title="Últimas Entradas">
            <div className="flex flex-col space-y-3">
                {recentEntries.map((entry, index) => (
                    <div key={index} className="border-b pb-2 last:border-b-0">
                        <p className="font-semibold text-sm text-gray-700">{entry.id}</p>
                        <p className="text-xs text-gray-500">{entry.carrier}</p>
                    </div>
                ))}
            </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
