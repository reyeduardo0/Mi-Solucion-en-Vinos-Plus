import React, { useState, useMemo } from 'react';
import { Albaran, User } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';

interface GoodsReceiptListProps {
  albaranes: Albaran[];
  navigateTo: (path: string) => void;
  currentUser: User;
}

const getDisplayStatus = (albaran: Albaran): 'Correcto' | 'Incidencia' => {
  if (albaran.status === 'incident') {
      return 'Incidencia';
  }
  const hasPalletIncident = albaran.pallets.some(p => p.incident);
  if (hasPalletIncident) {
      return 'Incidencia';
  }
  return 'Correcto';
};

const StatusBadge: React.FC<{ status: 'Correcto' | 'Incidencia' }> = ({ status }) => {
  const isIncident = status === 'Incidencia';
  const bgColor = isIncident ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
  const dotColor = isIncident ? 'bg-yellow-500' : 'bg-green-500';
  
  return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
          <svg className={`-ml-0.5 mr-1.5 h-2 w-2 ${dotColor}`} fill="currentColor" viewBox="0 0 8 8">
              <circle cx={4} cy={4} r={3} />
          </svg>
          {status}
      </span>
  );
};


const GoodsReceiptList: React.FC<GoodsReceiptListProps> = ({ albaranes, navigateTo, currentUser }) => {
  const [filters, setFilters] = useState({
    albaranId: '',
    status: 'Todos',
    startDate: '',
    endDate: '',
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const clearDateFilters = () => {
    setFilters(prev => ({ ...prev, startDate: '', endDate: ''}));
  }

  const filteredAlbaranes = useMemo(() => {
    return albaranes.filter(albaran => {
      const albaranDate = new Date(albaran.entryDate);
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;
      
      if (startDate) startDate.setHours(0, 0, 0, 0);
      if (endDate) endDate.setHours(23, 59, 59, 999);

      const idMatch = albaran.id.toLowerCase().includes(filters.albaranId.toLowerCase());
      const displayStatus = getDisplayStatus(albaran);
      const statusMatch = filters.status === 'Todos' || displayStatus === filters.status;
      const startDateMatch = !startDate || albaranDate >= startDate;
      const endDateMatch = !endDate || albaranDate <= endDate;

      return idMatch && statusMatch && startDateMatch && endDateMatch;
    });
  }, [albaranes, filters]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Historial de Entradas</h1>
        <Button onClick={() => navigateTo('/entradas/nueva')}>
          Nueva Entrada
        </Button>
      </div>

      <Card title="Filtros de Búsqueda" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-1 xl:col-span-1">
            <label htmlFor="albaranId" className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Albarán</label>
            <input type="text" name="albaranId" id="albaranId" placeholder="Ej: ALB-E-2025..." value={filters.albaranId} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"/>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Estado</label>
            <select name="status" id="status" value={filters.status} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm">
              <option>Todos</option>
              <option value="Correcto">Correcto</option>
              <option value="Incidencia">Incidencia</option>
            </select>
          </div>
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
            <input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"/>
          </div>
          <div className="flex items-end space-x-2">
            <div className="flex-grow">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
              <input type="date" name="endDate" id="endDate" value={filters.endDate} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"/>
            </div>
            <button onClick={clearDateFilters} className="h-10 w-10 flex-shrink-0 bg-gray-700 text-white rounded-md flex items-center justify-center hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
               <span className="sr-only">Clear date</span>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Albarán</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transportista</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conductor</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"># Palets</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAlbaranes.length > 0 ? (
                filteredAlbaranes.map(albaran => {
                  const displayStatus = getDisplayStatus(albaran);
                  return (
                    <tr key={albaran.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{albaran.id.toUpperCase()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(albaran.entryDate).toLocaleDateString('es-ES')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{albaran.carrier}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{albaran.driver || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{albaran.pallets.length}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <StatusBadge status={displayStatus} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                        <a href="#" className="text-gray-600 hover:text-gray-900">Ver</a>
                        {currentUser.roleId === 'role-admin' && (
                          <>
                            <a href="#" className="text-yellow-600 hover:text-yellow-900">Editar</a>
                            <a href="#" className="text-red-600 hover:text-red-900">Eliminar</a>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No se encontraron entradas que coincidan con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default GoodsReceiptList;