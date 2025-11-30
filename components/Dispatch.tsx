
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DispatchNote } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import { toDateTimeLocalInput } from '../utils/helpers';

const Dispatch: React.FC = () => {
    const navigate = useNavigate();
    const { packs, handleDispatch, productionReports, salidas } = useData();

    // New Fields
    const [dispatchNoteId, setDispatchNoteId] = useState('');
    const [dispatchDate, setDispatchDate] = useState(toDateTimeLocalInput());
    const [totalPallets, setTotalPallets] = useState<number | ''>('');
    
    const [customer, setCustomer] = useState('');
    const [destination, setDestination] = useState('');
    const [carrier, setCarrier] = useState('');
    const [truckPlate, setTruckPlate] = useState('');
    const [driver, setDriver] = useState('');
    
    // Detailed selection state: { [packId_expeditionLot]: quantity }
    const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
    
    // 1. Calculate Real-Time Inventory based on Production - Previous Dispatches
    const inventory = useMemo(() => {
        const inv: Record<string, { packId: string, modelName: string, orderId: string, lots: Record<string, { produced: number, dispatched: number }> }> = {};

        // Sum Production
        productionReports.forEach(r => {
            const pack = packs.find(p => p.id === r.packId);
            if (!pack) return;
            
            if (!inv[r.packId]) {
                inv[r.packId] = { packId: r.packId, modelName: pack.modelName, orderId: pack.orderId, lots: {} };
            }
            
            const lot = r.expeditionLot || 'SIN LOTE';
            if (!inv[r.packId].lots[lot]) inv[r.packId].lots[lot] = { produced: 0, dispatched: 0 };
            inv[r.packId].lots[lot].produced += r.producedQuantity;
        });

        // Subtract Dispatches
        salidas.forEach(s => {
            if (s.dispatchDetails) {
                s.dispatchDetails.forEach(d => {
                    if (inv[d.packId] && inv[d.packId].lots[d.expeditionLot]) {
                        inv[d.packId].lots[d.expeditionLot].dispatched += d.quantity;
                    }
                });
            } else if (s.packIds) {
                // Handle legacy dispatches (assume full pack dispatched if no details)
                // This is an approximation since we don't know which lot was sent in legacy mode.
                // For safety, we won't deduct from specific lots, but users should migrate to new system.
            }
        });

        // Flatten for display
        return Object.values(inv).map(item => {
            const availableLots = Object.entries(item.lots).map(([lotName, data]) => ({
                lotName,
                available: data.produced - data.dispatched,
                produced: data.produced
            })).filter(l => l.available > 0);
            
            return { 
                ...item, 
                availableLots, 
                totalAvailable: availableLots.reduce((sum, l) => sum + l.available, 0) 
            };
        }).filter(i => i.totalAvailable > 0);

    }, [packs, productionReports, salidas]);

    const handleQuantityChange = (packId: string, lot: string, qty: number, max: number) => {
        const key = `${packId}::${lot}`;
        if (qty < 0) qty = 0;
        if (qty > max) qty = max;
        
        setSelectedQuantities(prev => {
            const next = { ...prev };
            if (qty === 0) delete next[key];
            else next[key] = qty;
            return next;
        });
    };

    const handleConfirmDispatch = async () => {
        const selectionKeys = Object.keys(selectedQuantities);
        if (!dispatchNoteId || !customer || !destination || !carrier || selectionKeys.length === 0) {
            alert("Por favor, complete el Nº de Albarán, cliente, destino, transportista y seleccione al menos una cantidad a despachar.");
            return;
        }

        // Construct dispatch details
        const dispatchDetails = selectionKeys.map(key => {
            const [packId, expeditionLot] = key.split('::');
            return {
                packId,
                expeditionLot,
                quantity: selectedQuantities[key]
            };
        });

        // Unique pack IDs for legacy support/search
        const uniquePackIds = Array.from(new Set(dispatchDetails.map(d => d.packId)));

        await handleDispatch({
            dispatchNoteId,
            dispatchDate,
            customer,
            destination,
            carrier,
            truckPlate: truckPlate || undefined,
            driver: driver || undefined,
            totalPallets: totalPallets === '' ? undefined : totalPallets,
            packIds: uniquePackIds,
            dispatchDetails // New detailed structure
        });
        
        navigate('/salidas'); // Redirect to list (or dashboard)
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Nueva Nota de Salida</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card title="Inventario Disponible para Despacho">
                        {inventory.length > 0 ? (
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                {inventory.map(item => (
                                    <div key={item.packId} className="border rounded-md p-4 bg-white shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-gray-800">{item.modelName}</h3>
                                                <p className="text-sm text-gray-500">Orden: {item.orderId}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                                                    Total Disp: {item.totalAvailable}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-3 bg-gray-50 p-3 rounded-md">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-500 border-b">
                                                        <th className="pb-2">Lote Expedición</th>
                                                        <th className="pb-2 text-right">Disponible</th>
                                                        <th className="pb-2 text-right w-32">A Despachar</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {item.availableLots.map(lot => {
                                                        const key = `${item.packId}::${lot.lotName}`;
                                                        const currentQty = selectedQuantities[key] || '';
                                                        return (
                                                            <tr key={lot.lotName} className="border-b last:border-0">
                                                                <td className="py-2 font-mono">{lot.lotName}</td>
                                                                <td className="py-2 text-right font-medium">{lot.available}</td>
                                                                <td className="py-2 text-right">
                                                                    <input 
                                                                        type="number" 
                                                                        min="0"
                                                                        max={lot.available}
                                                                        placeholder="0"
                                                                        value={currentQty}
                                                                        onChange={e => handleQuantityChange(item.packId, lot.lotName, parseInt(e.target.value) || 0, lot.available)}
                                                                        className={`w-24 p-1 text-right border rounded focus:ring-blue-500 focus:border-blue-500 ${currentQty ? 'bg-yellow-50 border-yellow-300 font-bold' : 'border-gray-300'}`}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">No hay inventario disponible (producido y no despachado).</p>
                        )}
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card title="Detalles de la Salida">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700">Nº Albarán de Salida*</label>
                                <input type="text" value={dispatchNoteId} onChange={e => setDispatchNoteId(e.target.value)} placeholder="Ej: SDHM912500029" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 bg-yellow-50 font-mono" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium">Fecha y Hora de Salida*</label>
                                <input type="datetime-local" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
                            </div>
                            
                            <div><label className="block text-sm font-medium">Cliente*</label><input type="text" value={customer} onChange={e => setCustomer(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                             <div><label className="block text-sm font-medium">Destino*</label><input type="text" value={destination} onChange={e => setDestination(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                            
                            <div className="pt-4 border-t"><h4 className="font-semibold text-gray-800 mb-2">Datos de Transporte</h4>
                                <div><label className="block text-sm font-medium">Transportista*</label><input type="text" value={carrier} onChange={e => setCarrier(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                                <div>
                                    <label className="block text-sm font-medium mt-2">Nº Palets</label>
                                    <input 
                                        type="number" 
                                        value={totalPallets} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setTotalPallets(val === '' ? '' : Math.max(0, parseInt(val, 10)));
                                        }} 
                                        placeholder="0" 
                                        min="0" 
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" 
                                    />
                                </div>
                                <div><label className="block text-sm font-medium mt-2">Matrícula Camión</label><input type="text" value={truckPlate} onChange={e => setTruckPlate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                                <div><label className="block text-sm font-medium mt-2">Conductor</label><input type="text" value={driver} onChange={e => setDriver(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                            </div>
                            
                            <div className="pt-4 border-t">
                                <h4 className="font-semibold text-gray-800">Resumen</h4>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-sm text-gray-600">Total Unidades:</span>
                                    <span className="font-bold text-xl text-blue-600">{Object.values(selectedQuantities).reduce((a: number, b: number) => a + b, 0)}</span>
                                </div>
                            </div>
                            
                             <div className="pt-4"><Button onClick={handleConfirmDispatch} className="w-full" disabled={Object.keys(selectedQuantities).length === 0}>Confirmar y Despachar Salida</Button></div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dispatch;
