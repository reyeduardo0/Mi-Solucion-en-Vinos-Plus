import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from './ui/Card';
import { NewEntryIcon, NewPackIcon, NewExitIcon } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { useData } from '../context/DataContext';

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

const Dashboard: React.FC = () => {
  const navigateTo = useNavigate();
  const { albaranes, incidents, packs, salidas, inventoryStock } = useData();

  const totalPalletsReceived = albaranes.reduce((sum, a) => sum + (a.pallets?.length || 0), 0);
  
  const availableBottles = inventoryStock
    .filter(item => item.type === 'Producto')
    .reduce((sum, item) => sum + item.available, 0);

  const packsCreated = packs.length;
  const packsInProgress = packs.filter(p => p.status === 'Ensamblado').length;
  const openIncidents = incidents.filter(i => !i.resolved).length;
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const dispatchesThisMonth = salidas.filter(s => {
      const dispatchDate = new Date(s.dispatchDate);
      return dispatchDate.getMonth() === currentMonth && dispatchDate.getFullYear() === currentYear;
  }).length;

  const movementData = [
    { name: 'Entradas', Total: albaranes.length },
    { name: 'Salidas', Total: salidas.length },
    { name: 'Incidencias', Total: openIncidents },
  ];
  const movementColors = ['#22c55e', '#ef4444', '#f59e0b'];
  
  const recentEntries = [...albaranes]
    .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
    .slice(0, 3);


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-1">Dashboard</h1>
      
      <section className="my-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Acceso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickAccessButton icon={<NewEntryIcon/>} text="Nueva Entrada" onClick={() => navigateTo('/entradas/nueva')} />
            <QuickAccessButton icon={<NewPackIcon/>} text="Crear Pack" onClick={() => navigateTo('/packing')} />
            <QuickAccessButton icon={<NewExitIcon/>} text="Nueva Salida" onClick={() => navigateTo('/salidas')} />
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="col-span-2 md:col-span-1 lg:col-span-2"><StatCard title="Total Palets Recibidos" value={totalPalletsReceived} colorClass="bg-blue-500" /></div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2"><StatCard title="Botellas Disponibles" value={availableBottles.toLocaleString('es-ES')} colorClass="bg-green-500" /></div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2"><StatCard title="Packs Creados" value={packsCreated} colorClass="bg-cyan-500" /></div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2"><StatCard title="Packs en Proceso" value={packsInProgress} colorClass="bg-orange-500" /></div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2"><StatCard title="Incidencias Pendientes" value={openIncidents} colorClass="bg-yellow-500" /></div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2"><StatCard title="Salidas (Este Mes)" value={dispatchesThisMonth} colorClass="bg-purple-500" /></div>
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
                {recentEntries.length > 0 ? (
                    recentEntries.map((entry) => (
                        <div key={entry.id} className="border-b pb-2 last:border-b-0">
                            <p className="font-semibold text-sm text-gray-700">{entry.id}</p>
                            <p className="text-xs text-gray-500">{`${entry.carrier} - ${entry.pallets?.length || 0} palets`}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No hay entradas recientes.</p>
                )}
            </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;