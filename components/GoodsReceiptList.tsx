

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Albaran } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { usePermissions } from '../hooks/usePermissions';
import { useData } from '../context/DataContext';
import { formatDateTimeSafe } from '../utils/helpers';
import ConfirmationModal from './ui/ConfirmationModal';
import StatusBadge from './ui/StatusBadge';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;

const GoodsReceiptList: React.FC = () => {
    const navigate = useNavigate();
    const { albaranes, deleteAlbaran } = useData();
    const { can } = usePermissions();

    const [searchTerm, setSearchTerm] = useState('');
    const [albaranToDelete, setAlbaranToDelete] = useState<Albaran | null>(null);

    const filteredAlbaranes = useMemo(() => {
        return [...albaranes].filter(albaran => 
            albaran.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            albaran.truckPlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
            albaran.carrier.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => {
            const dateA = new Date(a.entryDate);
            const dateB = new Date(b.entryDate);
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;
            return dateB.getTime() - dateA.getTime();
        });
    }, [albaranes, searchTerm]);
    
    const handleConfirmDelete = async () => {
        if (albaranToDelete) {
            try {
                await deleteAlbaran(albaranToDelete);
            } catch (error: any) {
                alert(`No se pudo eliminar la entrada:\n${error.message}`);
            } finally {
                setAlbaranToDelete(null);
            }
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
             {albaranToDelete && (
              <ConfirmationModal
                title="Confirmar Eliminación"
                message={`¿Estás seguro de que quieres eliminar la entrada "${albaranToDelete.id}"? Esta acción eliminará todos sus pallets asociados y no se puede deshacer.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setAlbaranToDelete(null)}
              />
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Historial de Entradas</h1>
                {can('entries:create') && (
                    <Button onClick={() => navigate('/entradas/nueva')}>
                        <PlusIcon /> <span className="ml-2 hidden sm:inline">Nueva Entrada</span>
                    </Button>
                )}
            </div>
            
            <Card>
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Buscar por Nº Albarán, Matrícula o Transportista..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº Albarán</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Entrada</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matrícula</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transportista</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pallets</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAlbaranes.length > 0 ? (
                                filteredAlbaranes.map((albaran) => (
                                    <tr key={albaran.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{albaran.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTimeSafe(albaran.entryDate)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{albaran.truckPlate}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{albaran.carrier}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{albaran.pallets.length}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><StatusBadge status={albaran.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-4">
                                                {can('entries:view') && (
                                                    <button onClick={() => navigate(`/entradas/${albaran.id}`)} className="text-yellow-600 hover:text-yellow-900">Ver</button>
                                                )}
                                                {can('entries:edit') && (
                                                    <button onClick={() => navigate(`/entradas/editar/${albaran.id}`)} className="text-blue-600 hover:text-blue-900">Editar</button>
                                                )}
                                                {can('entries:delete') && (
                                                    <button onClick={() => setAlbaranToDelete(albaran)} className="text-red-600 hover:text-red-900">Eliminar</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                                        No se encontraron entradas que coincidan con la búsqueda.
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