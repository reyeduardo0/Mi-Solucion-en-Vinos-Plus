
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DispatchNote } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import { toDateTimeLocalInput } from '../utils/helpers';

const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

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

    const [searchTerm, setSearchTerm] = useState('');
    
    // Confirmed selections: { [packId::expeditionLot]: quantity }
    const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
    // Temporary inputs before adding: { [packId::expeditionLot]: string_number }
    const [tempQuantities, setTempQuantities] = useState<Record<string, string>>({});
    
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
                // Legacy support ignored for strict accounting in this view
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

    const filteredInventory = useMemo(() => {
        if (!searchTerm) return inventory;
        const lowerSearch = searchTerm.toLowerCase();
        return inventory.filter(item => 
            item.modelName.toLowerCase().includes(lowerSearch) || 
            item.orderId.toLowerCase().includes(lowerSearch) ||
            item.availableLots.some(l => l.lotName.toLowerCase().includes(lowerSearch))
        );
    }, [inventory, searchTerm]);

    const handleTempQuantityChange = (key: string, value: string, max: number) => {
        const numVal = parseInt(value);
        if (value !== '' && (isNaN(numVal) || numVal < 0)) return;
        if (numVal > max) return; // Prevent typing more than available
        
        setTempQuantities(prev => ({ ...prev, [key]: value }));
    };

    const handleAddLine = (packId: string, lotName: string, max: number, modelName: string) => {
        const key = `${packId}::${lotName}`;
        const qty = parseInt(tempQuantities[key] || '0');

        if (qty <= 0) {
            alert("La cantidad debe ser mayor a 0");
            return;
        }
        if (qty > max) {
            alert(`No puedes despachar más de lo disponible (${max})`);
            return;
        }

        setSelectedQuantities(prev => ({ ...prev, [key]: qty }));
        // Clear temp
        const newTemps = { ...tempQuantities };
        delete newTemps[key];
        setTempQuantities(newTemps);
    };

    const handleRemoveLine = (packId: string, lotName: string) => {
        const key = `${packId}::${lotName}`;
        const newSelected = { ...selectedQuantities };
        delete newSelected[key];
        setSelectedQuantities(newSelected);
    };

    const handleConfirmDispatch = async () => {
        const selectionKeys = Object.keys(selectedQuantities);
        if (!dispatchNoteId || !customer || !destination || !carrier || selectionKeys.length === 0) {
            alert("Por favor, complete el Nº de Albarán, cliente, destino, transportista y añada al menos una línea.");
            return;
        }

        const dispatchDetails = selectionKeys.map(key => {
            const [packId, expeditionLot] = key.split('::');
            return {
                packId,
                expeditionLot,
                quantity: selectedQuantities[key]
            };
        });

        const uniquePackIds = Array.from(new Set(dispatchDetails.map(d => d.packId)));

        await handleDispatch({
            dispatchNoteId, // Already uppercased by onChange
            dispatchDate,
            customer,
            destination,
            carrier,
            truckPlate: truckPlate || undefined,
            driver: driver || undefined,
            totalPallets: totalPallets === '' ? undefined : totalPallets,
            packIds: uniquePackIds,
            dispatchDetails
        });
        
        navigate('/salidas');
    };

    const selectedKeys = Object.keys(selectedQuantities);
    // Fix: Explicitly cast Object.values to number[] to avoid 'unknown' type error in strict mode
    const totalUnitsSelected = (Object.values(selectedQuantities) as number[]).reduce((a, b) => a + b, 0);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Nueva Nota de Salida</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* INVENTORY COLUMN */}
                <div className="lg:col-span-2">
                    <Card title="Inventario Disponible para Despacho">
                        {/* Search Bar */}
                        <div className="mb-4 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por Modelo, Pedido o Lote de Expedición..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
                            />
                        </div>

                        {filteredInventory.length > 0 ? (
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                {filteredInventory.map(item => (
                                    <div key={item.packId} className="border rounded-md p-4 bg-white shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-gray-800">{item.modelName}</h3>
                                                <p className="text-sm text-gray-500">Orden: {item.orderId}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                                                    Disp. Total: {item.totalAvailable}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-3 bg-gray-50 p-3 rounded-md">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-500 border-b">
                                                        <th className="pb-2">Lote Expedición</th>
                                                        <th className="pb-2 text-right">Disponible</th>
                                                        <th className="pb-2 text-right w-48">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {item.availableLots.map(lot => {
                                                        const key = `${item.packId}::${lot.lotName}`;
                                                        const isAdded = selectedQuantities[key] !== undefined;
                                                        const currentTemp = tempQuantities[key] || '';

                                                        return (
                                                            <tr key={lot.lotName} className={`border-b last:border-0 ${isAdded ? 'bg-green-50' : ''}`}>
                                                                <td className="py-2 font-mono">
                                                                    {lot.lotName}
                                                                    {isAdded && <span className="ml-2 text-xs font-bold text-green-600">(Añadido)</span>}
                                                                </td>
                                                                <td className="py-2 text-right font-medium">{lot.available}</td>
                                                                <td className="py-2 text-right">
                                                                    {isAdded ? (
                                                                        <div className="flex justify-end items-center space-x-2">
                                                                             <span className="font-bold text-gray-800">{selectedQuantities[key]} un.</span>
                                                                             <Button variant="danger" className="p-1 h-8 w-8 flex items-center justify-center" onClick={() => handleRemoveLine(item.packId, lot.lotName)} title="Eliminar línea">
                                                                                <TrashIcon />
                                                                             </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex justify-end items-center space-x-2">
                                                                            <input 
                                                                                type="number" 
                                                                                min="0"
                                                                                max={lot.available}
                                                                                placeholder="Cant."
                                                                                value={currentTemp}
                                                                                onChange={e => handleTempQuantityChange(key, e.target.value, lot.available)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') handleAddLine(item.packId, lot.lotName, lot.available, item.modelName);
                                                                                }}
                                                                                className="w-20 p-1 text-right border rounded focus:ring-yellow-500 focus:border-yellow-500 border-gray-300"
                                                                            />
                                                                            <Button className="p-1 h-8 w-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700" onClick={() => handleAddLine(item.packId, lot.lotName, lot.available, item.modelName)} title="Confirmar y añadir">
                                                                                <PlusIcon />
                                                                            </Button>
                                                                        </div>
                                                                    )}
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
                            <p className="text-center text-gray-500 py-8">
                                {searchTerm ? 'No se encontraron resultados para la búsqueda.' : 'No hay inventario disponible.'}
                            </p>
                        )}
                    </Card>
                </div>

                {/* FORM COLUMN */}
                <div className="lg:col-span-1">
                    <Card title="Detalles de la Salida">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700">Nº Albarán de Salida*</label>
                                <input 
                                    type="text" 
                                    value={dispatchNoteId} 
                                    onChange={e => setDispatchNoteId(e.target.value.toUpperCase())} 
                                    placeholder="Ej: SDHM912500029" 
                                    required 
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 bg-yellow-50 font-mono uppercase" 
                                />
                                <p className="text-xs text-gray-500 mt-1">Se convertirá automáticamente a mayúsculas.</p>
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
                                <h4 className="font-semibold text-gray-800 mb-2">Resumen de Líneas</h4>
                                {selectedKeys.length > 0 ? (
                                    <div className="bg-gray-50 rounded p-2 text-xs space-y-1 max-h-40 overflow-y-auto">
                                        {selectedKeys.map(key => {
                                            const [packId, lot] = key.split('::');
                                            // Find pack for name lookup
                                            const packName = packs.find(p => p.id === packId)?.modelName || packId;
                                            return (
                                                <div key={key} className="flex justify-between border-b border-gray-200 pb-1 last:border-0">
                                                    <span className="truncate pr-2" title={`${packName} - ${lot}`}>{lot} ({packName})</span>
                                                    <span className="font-bold">{selectedQuantities[key]}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No hay líneas añadidas.</p>
                                )}

                                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-300">
                                    <span className="text-sm font-bold text-gray-700">Total Unidades:</span>
                                    <span className="font-bold text-xl text-blue-600">{totalUnitsSelected}</span>
                                </div>
                            </div>
                            
                             <div className="pt-4"><Button onClick={handleConfirmDispatch} className="w-full" disabled={selectedKeys.length === 0}>Confirmar y Despachar Salida</Button></div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dispatch;
