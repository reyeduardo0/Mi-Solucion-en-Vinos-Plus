
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Card from './ui/Card';
import Button from './ui/Button';
import { formatDateSafe, formatDateTimeSafe } from '../utils/helpers';
import { ProductionIcon } from '../constants';
import ConfirmationModal from './ui/ConfirmationModal';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

const ProductionReports: React.FC = () => {
    const navigate = useNavigate();
    const { productionReports, packs, deleteProductionReport } = useData();
    const [reportToDelete, setReportToDelete] = useState<string | null>(null);

    const handleDelete = async () => {
        if(reportToDelete) {
            try {
                await deleteProductionReport(reportToDelete, '');
            } catch(e) {
                console.error(e);
                alert("Error al eliminar el parte.");
            } finally {
                setReportToDelete(null);
            }
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {reportToDelete && <ConfirmationModal title="Eliminar Parte" message="¿Estás seguro? Esto no revertirá las mermas ya descontadas." onConfirm={handleDelete} onCancel={() => setReportToDelete(null)} />}
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Partes de Montaje</h1>
                <Button onClick={() => navigate('/partes-montaje/nuevo')}>
                    <PlusIcon /> <span className="ml-2">Nuevo Parte de Montaje</span>
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {productionReports.length > 0 ? (
                    productionReports.map(report => {
                        const pack = packs.find(p => p.id === report.packId);
                        return (
                            <Card key={report.id} className="hover:shadow-md transition-shadow">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                                    <div>
                                        <div className="flex items-center space-x-2 mb-1">
                                            <ProductionIcon />
                                            <h3 className="text-lg font-bold text-gray-900">{report.id}</h3>
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            Fecha: {formatDateSafe(report.reportDate)} | Pack: {pack ? `${pack.orderId} (${pack.modelName})` : report.packId}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Producido: <strong>{report.producedQuantity}</strong> unidades
                                        </p>
                                    </div>
                                    <div className="mt-4 md:mt-0 flex space-x-2">
                                        {/* Visualizar detalle (pendiente de implementar vista detalle) */}
                                        {/* <Button variant="secondary" className="p-2"><EyeIcon/></Button> */}
                                        <Button variant="danger" className="p-2" onClick={() => setReportToDelete(report.id)}><TrashIcon/></Button>
                                    </div>
                                </div>
                                
                                {/* Resumen rápido de mermas */}
                                {report.consumptions.some(c => c.quantityWaste > 0) && (
                                    <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-2">
                                        <p className="text-xs font-bold text-red-800 uppercase mb-1">Mermas Registradas:</p>
                                        <ul className="list-disc list-inside text-xs text-red-700">
                                            {report.consumptions.filter(c => c.quantityWaste > 0).map((c, idx) => (
                                                <li key={idx}>{c.name} ({c.lot}): {c.quantityWaste}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </Card>
                        );
                    })
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                        <ProductionIcon />
                        <h3 className="text-xl font-semibold text-gray-700 mt-4">No hay partes de montaje</h3>
                        <p className="text-gray-500 mt-2">Crea un nuevo parte para finalizar la producción de un pack y registrar mermas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductionReports;
