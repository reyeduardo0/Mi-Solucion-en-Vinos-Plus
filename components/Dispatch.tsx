
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DispatchNote } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';

const Dispatch: React.FC = () => {
    const navigate = useNavigate();
    const { packs, handleDispatch } = useData();

    const [customer, setCustomer] = useState('');
    const [destination, setDestination] = useState('');
    const [carrier, setCarrier] = useState('');
    const [truckPlate, setTruckPlate] = useState('');
    const [driver, setDriver] = useState('');
    const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
    
    const availablePacks = useMemo(() => packs.filter(p => p.status === 'Ensamblado'), [packs]);
    
    const handleTogglePackSelection = (packId: string) => {
        setSelectedPackIds(prev =>
            prev.includes(packId)
                ? prev.filter(id => id !== packId)
                : [...prev, packId]
        );
    };

    const handleConfirmDispatch = async () => {
        if (!customer || !destination || !carrier || selectedPackIds.length === 0) {
            alert("Por favor, complete los datos del cliente, destino, transportista y seleccione al menos un pack.");
            return;
        }
        await handleDispatch({
            dispatchDate: new Date().toISOString(),
            customer,
            destination,
            carrier,
            truckPlate: truckPlate || undefined,
            driver: driver || undefined,
            packIds: selectedPackIds
        });
        navigate('/stock');
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Nueva Nota de Salida</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card title="Packs Disponibles para Despacho">
                        {availablePacks.length > 0 ? (
                            <div className="max-h-[60vh] overflow-y-auto pr-2">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0"><tr><th className="w-12"></th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Pack</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modelo</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden Pedido</th></tr></thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {availablePacks.map(pack => (
                                            <tr key={pack.id} className={`${selectedPackIds.includes(pack.id) ? 'bg-yellow-50' : ''}`}>
                                                <td className="px-4 py-4"><input type="checkbox" checked={selectedPackIds.includes(pack.id)} onChange={() => handleTogglePackSelection(pack.id)} className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"/></td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pack.id}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{pack.modelName}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{pack.orderId}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">No hay packs ensamblados listos para despachar.</p>
                        )}
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card title="Detalles de la Salida">
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium">Cliente</label><input type="text" value={customer} onChange={e => setCustomer(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                             <div><label className="block text-sm font-medium">Destino</label><input type="text" value={destination} onChange={e => setDestination(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                            <div className="pt-4 border-t"><h4 className="font-semibold text-gray-800 mb-2">Datos de Transporte</h4>
                                <div><label className="block text-sm font-medium">Transportista</label><input type="text" value={carrier} onChange={e => setCarrier(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                                <div><label className="block text-sm font-medium mt-2">Matrícula Camión (Opcional)</label><input type="text" value={truckPlate} onChange={e => setTruckPlate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                                <div><label className="block text-sm font-medium mt-2">Conductor (Opcional)</label><input type="text" value={driver} onChange={e => setDriver(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                            </div>
                            <div className="pt-4 border-t"><h4 className="font-semibold text-gray-800">Resumen</h4><p className="text-sm text-gray-600">Packs seleccionados: <span className="font-bold text-lg">{selectedPackIds.length}</span></p></div>
                             <div className="pt-4"><Button onClick={handleConfirmDispatch} className="w-full" disabled={selectedPackIds.length === 0}>Confirmar y Despachar Salida</Button></div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dispatch;
