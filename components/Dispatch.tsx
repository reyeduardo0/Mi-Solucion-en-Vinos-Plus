
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DispatchNote } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import ConfirmationModal from './ui/ConfirmationModal';
import { useData } from '../context/DataContext';
import { toDateTimeLocalInput, getErrorMessage, formatDateTimeSafe } from '../utils/helpers';

const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;

const Dispatch: React.FC = () => {
    const navigate = useNavigate();
    const { packs, handleDispatch, updateDispatch, deleteDispatch, productionReports, salidas, inventoryStock, supplies } = useData();

    // View Control
    const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
    const [viewMode, setViewMode] = useState<'create' | 'edit' | 'view'>('create');
    const [editId, setEditId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<DispatchNote | null>(null);
    
    // Inventory Selection Tab
    const [inventoryTab, setInventoryTab] = useState<'packs' | 'supplies'>('packs');

    // Form Fields
    const [dispatchNoteId, setDispatchNoteId] = useState('');
    const [dispatchDate, setDispatchDate] = useState(toDateTimeLocalInput());
    const [totalPallets, setTotalPallets] = useState<number | ''>('');
    const [customer, setCustomer] = useState('');
    const [destination, setDestination] = useState('');
    const [carrier, setCarrier] = useState('');
    const [truckPlate, setTruckPlate] = useState('');
    const [driver, setDriver] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [listSearchTerm, setListSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Confirmed selections: Key format needs to differentiate types
    // Key format: "type::id::lot"
    // e.g. "pack::PACK-123::LOT-ABC" or "supply::SUPPLY-ID::LOT-XYZ"
    const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
    // Temporary inputs
    const [tempQuantities, setTempQuantities] = useState<Record<string, string>>({});

    // Reset form when switching to create mode
    const resetForm = () => {
        setDispatchNoteId('');
        setDispatchDate(toDateTimeLocalInput());
        setTotalPallets('');
        setCustomer('');
        setDestination('');
        setCarrier('');
        setTruckPlate('');
        setDriver('');
        setSelectedQuantities({});
        setTempQuantities({});
        setEditId(null);
        setViewMode('create');
        setInventoryTab('packs');
    };

    // Load data for edit/view
    const loadDispatchData = (dispatch: DispatchNote, mode: 'edit' | 'view') => {
        setEditId(dispatch.id);
        setViewMode(mode);
        setDispatchNoteId(dispatch.dispatchNoteId || '');
        setDispatchDate(toDateTimeLocalInput(dispatch.dispatchDate));
        setTotalPallets(dispatch.totalPallets || '');
        setCustomer(dispatch.customer);
        setDestination(dispatch.destination);
        setCarrier(dispatch.carrier);
        setTruckPlate(dispatch.truckPlate || '');
        setDriver(dispatch.driver || '');
        
        // Reconstruct selected quantities
        const loadedQuantities: Record<string, number> = {};
        if (dispatch.dispatchDetails) {
            dispatch.dispatchDetails.forEach(d => {
                const type = d.type || 'pack'; // Default for legacy data
                const key = `${type}::${d.id}::${d.lot}`;
                loadedQuantities[key] = d.quantity;
            });
        }
        setSelectedQuantities(loadedQuantities);
        setActiveTab('form');
    };
    
    // 1. Calculate Real-Time PACK Inventory based on Production - Previous Dispatches
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
                    if (d.type === 'pack' || !d.type) { // Only count packs here
                        if (inv[d.id] && inv[d.id].lots[d.lot]) {
                            inv[d.id].lots[d.lot].dispatched += d.quantity;
                        }
                    }
                });
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

    // 2. Calculate Real-Time SUPPLIES Inventory (already done in Context, just need to format)
    const suppliesInventory = useMemo(() => {
        return inventoryStock
            .filter(item => item.type === 'Consumible' && item.available > 0)
            .map(item => {
                // Find original supply ID
                const sup = supplies.find(s => s.name === item.name);
                return {
                    id: sup ? sup.id : item.name, // Fallback to name if ID not found
                    name: item.name,
                    code: item.code,
                    lot: item.lot || 'SIN LOTE',
                    available: item.available
                };
            });
    }, [inventoryStock, supplies]);

    const filteredInventory = useMemo(() => {
        if (!searchTerm) return inventory;
        const lowerSearch = searchTerm.toLowerCase();
        return inventory.filter(item => 
            item.modelName.toLowerCase().includes(lowerSearch) || 
            item.orderId.toLowerCase().includes(lowerSearch) ||
            item.availableLots.some(l => l.lotName.toLowerCase().includes(lowerSearch))
        );
    }, [inventory, searchTerm]);

    const filteredSupplies = useMemo(() => {
        if (!searchTerm) return suppliesInventory;
        const lower = searchTerm.toLowerCase();
        return suppliesInventory.filter(s => 
            s.name.toLowerCase().includes(lower) || 
            (s.code && s.code.toLowerCase().includes(lower)) ||
            s.lot.toLowerCase().includes(lower)
        );
    }, [suppliesInventory, searchTerm]);

    const handleTempQuantityChange = (key: string, value: string, max: number) => {
        if (value === '') {
            setTempQuantities(prev => ({ ...prev, [key]: '' }));
            return;
        }
        const numVal = parseInt(value);
        if (isNaN(numVal) || numVal < 0) return;
        if (numVal > max) {
             setTempQuantities(prev => ({ ...prev, [key]: max.toString() }));
             return;
        }
        setTempQuantities(prev => ({ ...prev, [key]: value }));
    };

    const handleAddLine = (type: 'pack' | 'supply', id: string, lot: string, max: number) => {
        const key = `${type}::${id}::${lot}`;
        const rawQty = tempQuantities[key];
        const qty = parseInt(rawQty || '0');

        if (!rawQty || qty <= 0) {
            alert("Por favor, introduzca una cantidad válida mayor a 0 para añadir la línea.");
            return;
        }
        if (qty > max) {
            alert(`No puedes despachar más de lo disponible (${max})`);
            return;
        }

        setSelectedQuantities(prev => ({ ...prev, [key]: qty }));
        const newTemps = { ...tempQuantities };
        delete newTemps[key];
        setTempQuantities(newTemps);
    };

    const handleRemoveLine = (key: string) => {
        const newSelected = { ...selectedQuantities };
        delete newSelected[key];
        setSelectedQuantities(newSelected);
    };

    const handleConfirmDispatch = async () => {
        const selectionKeys = Object.keys(selectedQuantities);
        
        // VALIDATION
        const missingFields: string[] = [];
        if (!dispatchNoteId) missingFields.push("Nº Albarán de Salida");
        if (!customer) missingFields.push("Cliente");
        if (!destination) missingFields.push("Destino");
        if (!carrier) missingFields.push("Transportista");

        if (missingFields.length > 0) {
            alert(`Faltan campos obligatorios:\n- ${missingFields.join('\n- ')}`);
            return;
        }

        if (selectionKeys.length === 0) {
            alert("No has añadido ningún producto o palet a la salida.");
            return;
        }

        setIsSubmitting(true);

        try {
            const dispatchDetails = selectionKeys.map(key => {
                const parts = key.split('::');
                // Handle legacy keys which were just "id::lot" (2 parts) -> assume type=pack
                let type: 'pack' | 'supply' = 'pack';
                let id = parts[0];
                let lot = parts[1];

                if (parts.length === 3) {
                    type = parts[0] as 'pack' | 'supply';
                    id = parts[1];
                    lot = parts[2];
                }

                // Need to find name for persistence
                let name = '';
                if (type === 'pack') {
                    const p = packs.find(pkg => pkg.id === id);
                    name = p ? p.modelName : id;
                } else {
                    const s = supplies.find(sup => sup.id === id);
                    name = s ? s.name : id;
                }

                return {
                    type,
                    id,
                    name,
                    lot,
                    quantity: selectedQuantities[key]
                };
            });

            // Extract packIds for legacy compatibility
            const uniquePackIds = Array.from(new Set(dispatchDetails.filter(d => d.type === 'pack').map(d => d.id)));

            const commonData = {
                dispatchNoteId, 
                dispatchDate,
                customer,
                destination,
                carrier,
                truckPlate: truckPlate || undefined,
                driver: driver || undefined,
                totalPallets: totalPallets === '' ? undefined : (typeof totalPallets === 'string' ? parseInt(totalPallets) : totalPallets),
            };

            if (viewMode === 'edit' && editId) {
                // UPDATE
                await updateDispatch({
                    id: editId,
                    ...commonData,
                    status: 'Despachado', 
                    packIds: uniquePackIds,
                    dispatchDetails
                });
            } else {
                // CREATE
                await handleDispatch({
                    ...commonData,
                    packIds: uniquePackIds,
                    dispatchDetails
                });
            }
            
            resetForm();
            setActiveTab('list');
        } catch (e: any) {
            console.error(e);
            alert(`Error al guardar la salida: ${getErrorMessage(e)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteDispatch(itemToDelete.id);
            setItemToDelete(null);
        } catch (e: any) {
            alert(`Error al eliminar: ${getErrorMessage(e)}`);
        }
    };

    const selectedKeys = Object.keys(selectedQuantities);
    const totalUnitsSelected = (Object.values(selectedQuantities) as number[]).reduce((a, b) => a + b, 0);

    const filteredSalidas = useMemo(() => {
        if (!listSearchTerm) return salidas;
        const lower = listSearchTerm.toLowerCase();
        return salidas.filter(s => 
            s.dispatchNoteId?.toLowerCase().includes(lower) || 
            s.customer.toLowerCase().includes(lower) || 
            s.destination.toLowerCase().includes(lower)
        );
    }, [salidas, listSearchTerm]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {itemToDelete && (
                <ConfirmationModal 
                    title="Eliminar Salida" 
                    message={`¿Estás seguro de que deseas eliminar la salida "${itemToDelete.dispatchNoteId}"? Esto restaurará el inventario asociado.`} 
                    onConfirm={handleDelete} 
                    onCancel={() => setItemToDelete(null)} 
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Salidas</h1>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => { setActiveTab('list'); resetForm(); }} 
                        className={`px-4 py-2 rounded-md font-medium ${activeTab === 'list' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                    >
                        Listado de Salidas
                    </button>
                    <button 
                        onClick={() => { setActiveTab('form'); resetForm(); }} 
                        className={`px-4 py-2 rounded-md font-medium ${activeTab === 'form' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                    >
                        <span className="flex items-center"><PlusIcon /> <span className="ml-2">Nueva Salida</span></span>
                    </button>
                </div>
            </div>

            {activeTab === 'list' ? (
                <Card>
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Buscar por Nº Albarán, Cliente o Destino..."
                            value={listSearchTerm}
                            onChange={(e) => setListSearchTerm(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Albarán</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destino</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Items</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredSalidas.length > 0 ? filteredSalidas.map(salida => (
                                    <tr key={salida.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{salida.dispatchNoteId || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTimeSafe(salida.dispatchDate)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{salida.customer}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{salida.destination}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                            {salida.dispatchDetails ? salida.dispatchDetails.reduce((a, b) => a + b.quantity, 0) : 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <Button variant="secondary" className="p-1.5" onClick={() => loadDispatchData(salida, 'view')} title="Ver Detalle"><EyeIcon /></Button>
                                            <Button variant="secondary" className="p-1.5" onClick={() => loadDispatchData(salida, 'edit')} title="Editar Cabecera"><PencilIcon /></Button>
                                            <Button variant="danger" className="p-1.5" onClick={() => setItemToDelete(salida)} title="Eliminar"><TrashIcon /></Button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">No se encontraron salidas.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* INVENTORY COLUMN */}
                    {viewMode === 'create' && (
                        <div className="lg:col-span-2">
                            <Card title="Inventario Disponible">
                                <div className="mb-4">
                                    <div className="flex border-b border-gray-200 mb-4">
                                        <button 
                                            className={`py-2 px-4 font-medium text-sm ${inventoryTab === 'packs' ? 'border-b-2 border-yellow-500 text-yellow-600' : 'text-gray-500 hover:text-gray-700'}`}
                                            onClick={() => { setInventoryTab('packs'); setSearchTerm(''); }}
                                        >
                                            Packs (Producto Terminado)
                                        </button>
                                        <button 
                                            className={`py-2 px-4 font-medium text-sm ${inventoryTab === 'supplies' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                            onClick={() => { setInventoryTab('supplies'); setSearchTerm(''); }}
                                        >
                                            Palets y Auxiliares
                                        </button>
                                    </div>

                                    {/* Search Bar */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <SearchIcon />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={inventoryTab === 'packs' ? "Buscar por Modelo, Pedido o Lote..." : "Buscar por Nombre o Código..."}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
                                        />
                                    </div>
                                </div>

                                {inventoryTab === 'packs' ? (
                                    // PACKS LIST
                                    filteredInventory.length > 0 ? (
                                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
                                                                    const key = `pack::${item.packId}::${lot.lotName}`;
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
                                                                                        <Button variant="danger" className="p-1 h-8 w-8 flex items-center justify-center" onClick={() => handleRemoveLine(key)} title="Eliminar línea">
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
                                                                                                if (e.key === 'Enter') handleAddLine('pack', item.packId, lot.lotName, lot.available);
                                                                                            }}
                                                                                            className="w-20 p-1 text-right border rounded focus:ring-yellow-500 focus:border-yellow-500 border-gray-300"
                                                                                        />
                                                                                        <Button className="p-1 h-8 w-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700" onClick={() => handleAddLine('pack', item.packId, lot.lotName, lot.available)} title="Confirmar y añadir">
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
                                        <p className="text-center text-gray-500 py-8">No hay packs disponibles.</p>
                                    )
                                ) : (
                                    // SUPPLIES LIST
                                    filteredSupplies.length > 0 ? (
                                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                            {filteredSupplies.map(item => {
                                                const key = `supply::${item.id}::${item.lot}`;
                                                const isAdded = selectedQuantities[key] !== undefined;
                                                const currentTemp = tempQuantities[key] || '';

                                                return (
                                                    <div key={key} className={`border rounded-md p-4 bg-white shadow-sm flex justify-between items-center ${isAdded ? 'bg-green-50 border-green-200' : ''}`}>
                                                        <div>
                                                            <h3 className="font-bold text-gray-800">{item.name}</h3>
                                                            <div className="text-sm text-gray-500">
                                                                {item.code && <span className="font-mono mr-2">[{item.code}]</span>}
                                                                Lote: <span className="font-mono">{item.lot}</span>
                                                            </div>
                                                            <div className="text-xs text-gray-400 mt-1">Disp: {item.available}</div>
                                                        </div>
                                                        <div className="ml-4">
                                                            {isAdded ? (
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="font-bold text-gray-800 text-lg">{selectedQuantities[key]}</span>
                                                                    <Button variant="danger" className="p-1 h-8 w-8 flex items-center justify-center" onClick={() => handleRemoveLine(key)} title="Eliminar línea">
                                                                        <TrashIcon />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center space-x-2">
                                                                    <input 
                                                                        type="number" 
                                                                        min="0"
                                                                        max={item.available}
                                                                        placeholder="Cant."
                                                                        value={currentTemp}
                                                                        onChange={e => handleTempQuantityChange(key, e.target.value, item.available)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleAddLine('supply', item.id, item.lot, item.available);
                                                                        }}
                                                                        className="w-20 p-2 text-right border rounded focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                                                                    />
                                                                    <Button className="p-2 h-10 w-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700" onClick={() => handleAddLine('supply', item.id, item.lot, item.available)} title="Añadir">
                                                                        <PlusIcon />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-center text-gray-500 py-8">No hay consumibles/palets disponibles.</p>
                                    )
                                )}
                            </Card>
                        </div>
                    )}

                    {/* FORM COLUMN */}
                    <div className={viewMode === 'create' ? "lg:col-span-1" : "lg:col-span-3"}>
                        <Card title={viewMode === 'create' ? "Detalles de la Salida" : (viewMode === 'edit' ? "Editar Salida" : "Visualizar Salida")}>
                            <div className="space-y-4">
                                {viewMode !== 'create' && (
                                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                                        <p className="text-sm text-blue-700">
                                            {viewMode === 'edit' 
                                                ? "Estás editando los datos de cabecera. Para modificar las líneas de productos, elimina esta salida y créala de nuevo." 
                                                : "Modo de visualización. No se pueden realizar cambios."}
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Nº Albarán de Salida*</label>
                                        <input 
                                            type="text" 
                                            value={dispatchNoteId} 
                                            onChange={e => setDispatchNoteId(e.target.value.toUpperCase())} 
                                            placeholder="Ej: SDHM912500029" 
                                            required 
                                            disabled={viewMode === 'view'}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 bg-yellow-50 font-mono uppercase disabled:bg-gray-100" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Fecha y Hora de Salida*</label>
                                        <input 
                                            type="datetime-local" 
                                            value={dispatchDate} 
                                            onChange={e => setDispatchDate(e.target.value)} 
                                            required 
                                            disabled={viewMode === 'view'}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100" 
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium">Cliente*</label><input type="text" value={customer} onChange={e => setCustomer(e.target.value)} required disabled={viewMode === 'view'} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100" /></div>
                                    <div><label className="block text-sm font-medium">Destino*</label><input type="text" value={destination} onChange={e => setDestination(e.target.value)} required disabled={viewMode === 'view'} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100" /></div>
                                </div>
                                
                                <div className="pt-4 border-t"><h4 className="font-semibold text-gray-800 mb-2">Datos de Transporte</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium">Transportista*</label><input type="text" value={carrier} onChange={e => setCarrier(e.target.value)} required disabled={viewMode === 'view'} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100" /></div>
                                        <div>
                                            <label className="block text-sm font-medium">Nº Palets (Bultos)</label>
                                            <input 
                                                type="number" 
                                                value={totalPallets} 
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setTotalPallets(val === '' ? '' : Math.max(0, parseInt(val, 10)));
                                                }} 
                                                placeholder="0" 
                                                min="0" 
                                                disabled={viewMode === 'view'}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100" 
                                            />
                                        </div>
                                        <div><label className="block text-sm font-medium">Matrícula Camión</label><input type="text" value={truckPlate} onChange={e => setTruckPlate(e.target.value)} disabled={viewMode === 'view'} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100" /></div>
                                        <div><label className="block text-sm font-medium">Conductor</label><input type="text" value={driver} onChange={e => setDriver(e.target.value)} disabled={viewMode === 'view'} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100" /></div>
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t">
                                    <h4 className="font-semibold text-gray-800 mb-2">Resumen de Líneas</h4>
                                    {selectedKeys.length > 0 ? (
                                        <div className="bg-gray-50 rounded p-2 text-xs space-y-1 max-h-60 overflow-y-auto">
                                            {selectedKeys.map(key => {
                                                const parts = key.split('::');
                                                // Handle legacy: assume pack if 2 parts
                                                const type = parts.length === 3 ? parts[0] : 'pack';
                                                const id = parts.length === 3 ? parts[1] : parts[0];
                                                const lot = parts.length === 3 ? parts[2] : parts[1];
                                                
                                                let displayName = id;
                                                if (type === 'pack') {
                                                    const pack = packs.find(p => p.id === id);
                                                    displayName = pack ? pack.modelName : id;
                                                } else {
                                                    const supply = supplies.find(s => s.id === id);
                                                    displayName = supply ? supply.name : id;
                                                }

                                                return (
                                                    <div key={key} className="flex justify-between border-b border-gray-200 pb-1 last:border-0 items-center">
                                                        <div className="flex items-center truncate pr-2">
                                                            {type === 'supply' && <span className="bg-blue-100 text-blue-800 text-[10px] px-1 rounded mr-2">SUP</span>}
                                                            <span title={`${displayName} - ${lot}`}>{lot} ({displayName})</span>
                                                        </div>
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
                                
                                {viewMode !== 'view' && (
                                    <div className="pt-4 flex justify-between space-x-4">
                                        {viewMode === 'edit' && <Button variant="secondary" onClick={() => setActiveTab('list')}>Cancelar</Button>}
                                        <Button onClick={handleConfirmDispatch} className="w-full" disabled={isSubmitting}>
                                            {isSubmitting ? <Spinner /> : (viewMode === 'edit' ? 'Guardar Cambios' : 'Confirmar y Despachar Salida')}
                                        </Button>
                                    </div>
                                )}
                                {viewMode === 'view' && (
                                    <div className="pt-4">
                                        <Button onClick={() => setActiveTab('list')} className="w-full">Volver al Listado</Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dispatch;
