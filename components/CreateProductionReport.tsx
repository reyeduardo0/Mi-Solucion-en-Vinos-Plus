
/* Force Git Sync: v1.6.2 - Ensure supply name update logic is deployed */
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Card from './ui/Card';
import Button from './ui/Button';
import { ProductionConsumption, WinePack, ProductionReport } from '../types';
import { generateUUID, formatDateSafe } from '../utils/helpers';

const CreateProductionReport: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>(); // Get ID if in edit mode
    const { packs, supplies, addProductionReport, updateProductionReport, productionReports, products, packModels } = useData();
    
    const isEditing = !!id;

    const [selectedPackId, setSelectedPackId] = useState('');
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [producedQuantity, setProducedQuantity] = useState<number>(0);
    const [expeditionLot, setExpeditionLot] = useState('');
    const [consumptions, setConsumptions] = useState<ProductionConsumption[]>([]);
    
    // New Fields for Billing
    const [isHoliday, setIsHoliday] = useState(false);
    const [isNightShift, setIsNightShift] = useState(false);
    const [overtimeHours, setOvertimeHours] = useState<number>(0);

    // If editing, we load the existing report data
    useEffect(() => {
        if (isEditing && id) {
            const existingReport = productionReports.find(r => r.id === id);
            if (existingReport) {
                setSelectedPackId(existingReport.packId);
                setReportDate(existingReport.reportDate.split('T')[0]);
                setProducedQuantity(existingReport.producedQuantity);
                setExpeditionLot(existingReport.expeditionLot || '');
                setIsHoliday(existingReport.isHoliday || false);
                setIsNightShift(existingReport.isNightShift || false);
                setOvertimeHours(existingReport.overtimeHours || 0);
                
                // REFRESH LOGIC: Ensure consumption names match current inventory names
                const refreshedConsumptions = existingReport.consumptions.map(c => {
                    if (c.type === 'supply') {
                        const freshSupply = supplies.find(s => s.id === c.itemId) || 
                                          supplies.find(s => s.name.trim().toLowerCase() === c.name.trim().toLowerCase());
                        
                        if (freshSupply) {
                            let displayName = freshSupply.name;
                            if (freshSupply.code) displayName = `[${freshSupply.code}] ${displayName}`;
                            return { ...c, name: displayName, itemId: freshSupply.id };
                        }
                    }
                    return c;
                });
                setConsumptions(refreshedConsumptions);
            }
        }
    }, [isEditing, id, productionReports, supplies]);

    // Filtrar packs disponibles
    const availablePacks = useMemo(() => {
        // Allow selection if editing or if it's a new report (partial production allows multiple reports per pack)
        // Ideally we filter completed packs, but "completed" is subjective if partials are allowed.
        // For now, list all 'Ensamblado' packs.
        return packs.filter(p => p.status === 'Ensamblado');
    }, [packs]);

    const selectedPack = useMemo(() => packs.find(p => p.id === selectedPackId), [selectedPackId, packs]);

    // Calculate previous production for partial tracking
    const productionStats = useMemo(() => {
        if (!selectedPack) return { totalPlanned: 0, producedBefore: 0, remaining: 0 };
        
        const previousReports = productionReports.filter(r => r.packId === selectedPack.id && r.id !== id);
        const producedBefore = previousReports.reduce((sum, r) => sum + r.producedQuantity, 0);
        const totalPlanned = selectedPack.quantity || 0;
        
        return {
            totalPlanned,
            producedBefore,
            remaining: Math.max(0, totalPlanned - producedBefore)
        };
    }, [selectedPack, productionReports, id]);

    // Auto-rellenar datos al seleccionar pack
    useEffect(() => {
        if (!isEditing && selectedPack) {
            // Default to remaining quantity
            const initialQty = productionStats.remaining > 0 ? productionStats.remaining : 1;
            setProducedQuantity(initialQty); 

            const newConsumptions: ProductionConsumption[] = [];

            // 1. Vinos
            if (selectedPack.contents) {
                selectedPack.contents.forEach(c => {
                    newConsumptions.push({
                        itemId: c.productName,
                        name: c.productName,
                        type: 'product',
                        lot: c.lot,
                        quantityConsumed: c.quantity, // This logic might need adjustment for partials: total_needed / total_packs * current_packs
                        quantityWaste: 0
                    });
                });
            }

            // 2. Consumibles
            const relatedModel = packModels.find(m => m.id === selectedPack.modelId);

            if (relatedModel && relatedModel.supplyRequirements) {
                 relatedModel.supplyRequirements.forEach(req => {
                    const freshSupply = supplies.find(s => s.id === req.supplyId) || 
                                      supplies.find(s => s.name.trim().toLowerCase() === req.name.trim().toLowerCase());
                    
                    let displayName = req.name;
                    let displayId = req.supplyId;

                    if (freshSupply) {
                        displayId = freshSupply.id;
                        displayName = freshSupply.name;
                        if (freshSupply.code) displayName = `[${freshSupply.code}] ${freshSupply.name}`;
                    }

                    newConsumptions.push({
                        itemId: displayId,
                        name: displayName,
                        type: 'supply',
                        lot: 'SIN LOTE',
                        quantityConsumed: req.quantity * initialQty,
                        quantityWaste: 0
                    });
                 });
            }
            setConsumptions(newConsumptions);
        } 
    }, [selectedPack, isEditing, supplies, packModels, productionStats.remaining]); 

    // Recalculate theoretical consumption when produced quantity changes
    useEffect(() => {
        if (selectedPack && producedQuantity > 0) {
             const relatedModel = packModels.find(m => m.id === selectedPack.modelId);
             
             setConsumptions(prev => prev.map(c => {
                 // For supplies, recalculate based on model requirement
                 if (c.type === 'supply' && relatedModel) {
                     const req = relatedModel.supplyRequirements.find(r => r.supplyId === c.itemId || r.name === c.name);
                     if (req) {
                         return { ...c, quantityConsumed: req.quantity * producedQuantity };
                     }
                 }
                 // For products (wines), recalculate based on pack definition (assumes uniform distribution)
                 if (c.type === 'product' && selectedPack.contents) {
                     // Find original requirement per pack. 
                     // Pack contents stores TOTAL for the ORDER. We need per-pack unit.
                     // Unit per pack = content.quantity / pack.quantity
                     const content = selectedPack.contents.find(k => k.productName === c.name && k.lot === c.lot);
                     if (content && selectedPack.quantity) {
                         const unitPerPack = content.quantity / selectedPack.quantity;
                         return { ...c, quantityConsumed: Math.ceil(unitPerPack * producedQuantity) };
                     }
                 }
                 return c;
             }));
        }
    }, [producedQuantity, selectedPack, packModels]);


    const handleConsumptionChange = (index: number, field: keyof ProductionConsumption, value: any) => {
        const updated = [...consumptions];
        updated[index] = { ...updated[index], [field]: value };
        setConsumptions(updated);
    };

    const handleAddRow = () => {
        setConsumptions([...consumptions, { itemId: '', name: '', type: 'supply', lot: '', quantityConsumed: 0, quantityWaste: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        setConsumptions(consumptions.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!selectedPackId || producedQuantity <= 0) {
            alert("Seleccione un pack y especifique la cantidad producida.");
            return;
        }

        const reportData = {
            packId: selectedPackId,
            reportDate,
            expeditionLot, // New Field
            producedQuantity,
            consumptions,
            isHoliday,
            isNightShift,
            overtimeHours
        };

        try {
            if (isEditing && id) {
                await updateProductionReport({ id, ...reportData });
            } else {
                await addProductionReport({ id: `REP-${Date.now()}`, ...reportData });
            }
            navigate('/partes-montaje');
        } catch (error) {
            console.error(error);
            alert("Error al guardar el parte.");
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">
                    {isEditing ? 'Editar Parte de Montaje' : 'Nuevo Parte de Montaje'}
                </h1>
                <Button variant="secondary" onClick={() => navigate('/partes-montaje')}>Cancelar</Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* CABECERA */}
                <Card title="Datos del Lanzamiento">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Seleccionar Pack (Lanzamiento)</label>
                            <select 
                                value={selectedPackId} 
                                onChange={e => setSelectedPackId(e.target.value)} 
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
                                disabled={isEditing}
                            >
                                <option value="">-- Seleccionar Pack --</option>
                                {availablePacks.map(p => (
                                    <option key={p.id} value={p.id}>{p.orderId} - {p.modelName} ({formatDateSafe(p.creationDate)})</option>
                                ))}
                            </select>
                        </div>
                        {selectedPack && (
                            <>
                                <div><label className="block text-sm font-medium text-gray-500">Nº Artículo / Modelo</label><p className="mt-1 font-semibold">{selectedPack.modelName}</p></div>
                                <div><label className="block text-sm font-medium text-gray-500">Nº Lanzamiento / Pedido</label><p className="mt-1 font-semibold">{selectedPack.orderId}</p></div>
                                <div><label className="block text-sm font-medium text-gray-500">Lotes Principales</label><p className="mt-1 text-sm">{selectedPack.contents.map(c => `${c.lot}`).join(', ')}</p></div>
                            </>
                        )}
                    </div>
                    {/* Visual Progress Bar for Partial Production */}
                    {selectedPack && (
                        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-100">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-semibold text-blue-800">Progreso de Producción</span>
                                <span className="text-blue-600">{productionStats.producedBefore} fabricados de {productionStats.totalPlanned} planificados</span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min(100, (productionStats.producedBefore / productionStats.totalPlanned) * 100)}%` }}></div>
                            </div>
                            <p className="text-xs text-blue-500 mt-1">Este parte añadirá <strong>{producedQuantity}</strong> unidades más.</p>
                        </div>
                    )}
                </Card>

                {/* CUERPO ESTILO EXCEL */}
                {selectedPack && (
                    <>
                        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 border-b border-gray-300">
                                <div className="p-4 border-r border-gray-300">
                                    <label className="block text-sm font-bold text-gray-700 uppercase">Cantidad Producida (Este Parte):</label>
                                    <input 
                                        type="number" 
                                        value={producedQuantity} 
                                        onChange={e => setProducedQuantity(Number(e.target.value))} 
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded bg-yellow-50 font-bold text-lg text-center"
                                    />
                                </div>
                                <div className="p-4 border-r border-gray-300">
                                    <label className="block text-sm font-bold text-gray-700 uppercase">Lote de Expedición:</label>
                                    <input 
                                        type="text" 
                                        value={expeditionLot} 
                                        onChange={e => setExpeditionLot(e.target.value.toUpperCase())} 
                                        placeholder="Ej: PTAM9125..."
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded bg-white text-center font-mono"
                                    />
                                    <p className="text-xs text-gray-500 mt-1 text-center">Referencia para salida</p>
                                </div>
                                <div className="p-4">
                                    <label className="block text-sm font-bold text-gray-700 uppercase">Fecha Realización:</label>
                                    <input 
                                        type="date" 
                                        value={reportDate} 
                                        onChange={e => setReportDate(e.target.value)} 
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded bg-yellow-50 text-center"
                                    />
                                </div>
                            </div>

                            {/* BILLING CONDITIONS */}
                            <div className="p-4 border-b border-gray-300 bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <label className="flex items-center space-x-2 border p-2 rounded bg-white cursor-pointer">
                                    <input type="checkbox" checked={isHoliday} onChange={e => setIsHoliday(e.target.checked)} className="h-5 w-5 text-green-600 rounded"/>
                                    <span className="font-semibold text-sm">¿Trabajado en Festivo?</span>
                                </label>
                                <label className="flex items-center space-x-2 border p-2 rounded bg-white cursor-pointer">
                                    <input type="checkbox" checked={isNightShift} onChange={e => setIsNightShift(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                                    <span className="font-semibold text-sm">¿Turno Nocturno?</span>
                                </label>
                                <div className="flex items-center space-x-2 border p-2 rounded bg-white">
                                    <span className="font-semibold text-sm">Horas Extras:</span>
                                    <input type="number" step="0.5" min="0" value={overtimeHours} onChange={e => setOvertimeHours(Number(e.target.value))} className="w-20 p-1 border rounded text-right"/>
                                </div>
                            </div>

                            <div className="p-2 bg-gray-100 border-b border-gray-300 font-bold text-gray-700 uppercase">
                                Consumos Realizados:
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-green-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase border-r border-green-200">Nº Artículo / Descripción</th>
                                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase border-r border-green-200 w-32">Lote</th>
                                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-800 uppercase border-r border-green-200 w-32">Cant. Consumidas</th>
                                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-800 uppercase border-r border-green-200 w-32 bg-yellow-200">Cant. Mermas</th>
                                            <th className="px-3 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {consumptions.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 border-r border-gray-200">
                                                    {item.type === 'supply' && !item.itemId ? (
                                                         <input 
                                                            type="text" 
                                                            placeholder="Buscar consumible..." 
                                                            list="supply-list"
                                                            value={item.name} 
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                const found = supplies.find(s => s.name === val);
                                                                handleConsumptionChange(index, 'name', val);
                                                                if(found) {
                                                                    handleConsumptionChange(index, 'itemId', found.id);
                                                                    handleConsumptionChange(index, 'type', 'supply');
                                                                }
                                                            }}
                                                            className="w-full p-1 border border-gray-300 rounded text-sm"
                                                         />
                                                    ) : (
                                                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 border-r border-gray-200">
                                                    <input 
                                                        type="text" 
                                                        value={item.lot} 
                                                        onChange={e => handleConsumptionChange(index, 'lot', e.target.value)}
                                                        className="w-full p-1 border border-gray-300 rounded text-sm"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 border-r border-gray-200 text-right">
                                                     <input 
                                                        type="number" 
                                                        value={item.quantityConsumed} 
                                                        onChange={e => handleConsumptionChange(index, 'quantityConsumed', Number(e.target.value))}
                                                        className="w-full p-1 border border-gray-300 rounded text-sm text-right bg-gray-50"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 border-r border-gray-200 text-right bg-yellow-50">
                                                    <input 
                                                        type="number" 
                                                        value={item.quantityWaste} 
                                                        onChange={e => handleConsumptionChange(index, 'quantityWaste', Number(e.target.value))}
                                                        className="w-full p-1 border border-yellow-300 rounded text-sm text-right focus:ring-yellow-500 font-bold"
                                                        min="0"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button 
                                                        onClick={() => handleRemoveRow(index)}
                                                        className="text-red-500 hover:text-red-700 font-bold"
                                                        title="Eliminar fila"
                                                    >
                                                        &times;
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td colSpan={5} className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                                                <button onClick={handleAddRow} className="text-sm text-blue-600 font-bold hover:underline">
                                                    + Añadir Fila Manualmente
                                                </button>
                                                <datalist id="supply-list">
                                                    {supplies.map(s => <option key={s.id} value={s.name} />)}
                                                </datalist>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <Button onClick={handleSubmit} className="w-full md:w-auto text-lg px-8">
                                {isEditing ? 'Actualizar Parte de Montaje' : 'Guardar Parte y Descontar Mermas'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CreateProductionReport;