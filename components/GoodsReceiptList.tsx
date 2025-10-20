import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Albaran } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { usePermissions } from '../hooks/usePermissions';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;

const StatusBadge: React.FC<{ status: 'pending' | 'verified' | 'incident' }> = ({ status }) => {
    const statusMap = {
        pending: { text: 'Pendiente', color: 'bg-gray-100 text-gray-800' },
        verified: { text: 'Verificado', color: 'bg-green-100 text-green-800' },
        incident: { text: 'Incidencia', color: 'bg-yellow-100 text-yellow-800' },
    };
    const { text, color } = statusMap[status];

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
            {text}
        </span>
    );
};

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; maxWidth?: string }> = ({ children, title, onClose, maxWidth = 'max-w-md' }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" onClick={onClose}>
        <div className={`bg-white rounded-lg shadow-xl w-full ${maxWidth}`} onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-xl font-bold">{title}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
            </div>
            <div className="p-6">{children}</div>
        </div>
    </div>
);

const ConfirmationModal: React.FC<{ title: string, message: string; onConfirm: () => void; onCancel: () => void; }> = ({ title, message, onConfirm, onCancel }) => (
    <Modal title={title} onClose={onCancel}>
        <p className="text-gray-600">{message}</p>
        <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
            <Button variant="danger" onClick={onConfirm}>Sí, eliminar</Button>
        </div>
    </Modal>
);

interface GoodsReceiptListProps {
  albaranes: Albaran[];
  onDeleteAlbaran: (albaranId: string) => Promise<void>;
}

const formatDateTimeSafe = (dateString?: string): string => {
    if (!dateString) return 'Fecha inválida';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};

const GoodsReceiptList: React.FC<GoodsReceiptListProps> = ({ albaranes, onDeleteAlbaran }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const { can } = usePermissions();
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
                await onDeleteAlbaran(albaranToDelete.id);
            } catch (error) {
                console.error("Error deleting albaran:", error);
                const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
                alert(`No se pudo eliminar la entrada:\n${errorMessage}`);
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