
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Card from './ui/Card';
import Button from './ui/Button';
import { ProductionConsumption, WinePack, ProductionReport } from '../types';
import { generateUUID, formatDateSafe } from '../utils/helpers';

const CreateProductionReport: React.FC = () => {
    const navigate = useNavigate();
    const { packs, supplies, addProductionReport, productionReports, products } = useData();
    
    const [selectedPackId, setSelectedPackId] = useState('');
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [producedQuantity, setProducedQuantity] = useState<number>(0);
    const [consumptions, setConsumptions] = useState<ProductionConsumption[]>([]);
    
    // Filtrar packs que YA están completados (Ensamblados) pero NO tienen reporte aún
    const availablePacks = useMemo(() => {
        const reportedPackIds = new Set(productionReports.map(r => r.packId));
        return packs.filter(p => p.status === 'Ensamblado' && !reportedPackIds.has(p.id));
    }, [packs, productionReports]);

    const selectedPack = useMemo(() => packs.find(p => p.id === selectedPackId), [selectedPackId, packs]);

    // Auto-rellenar datos al seleccionar pack
    useEffect(() => {
        if (selectedPack) {
            // Si el pack tiene cantidad guardada, usarla. Si no, 1.
            setProducedQuantity(selectedPack.quantity || 1); 

            const newConsumptions: ProductionConsumption[] = [];

            // 1. Vinos (Products)
            if (selectedPack.contents) {
                selectedPack.contents.forEach(c => {
                    newConsumptions.push({
                        itemId: c.productName, // Usamos nombre como ID para productos vinos
                        name: c.productName,
                        type: 'product',
                        lot: c.lot,
                        quantityConsumed: c.quantity,
                        quantityWaste: 0
                    });
                });
            }

            // 2. Consumibles (Supplies)
            if (selectedPack.suppliesUsed) {
                selectedPack.suppliesUsed.forEach(s => {
                    newConsumptions.push({
                        itemId: s.supplyId,
                        name: s.name,
                        type: 'supply',
                        lot: 'SIN LOTE', // Default
                        quantityConsumed: s.quantity,
                        quantityWaste: 0
                    });
                });
            }

            setConsumptions(newConsumptions);
        } else {
            setConsumptions([]);
            setProducedQuantity(0);
        }
    }, [selectedPack]);

    const handleConsumptionChange = (index: number, field: keyof ProductionConsumption, value: any) => {
        const updated = [...consumptions];
        updated[index] = { ...updated[index], [field]: value };
        setConsumptions(updated);
    };

    const handleAddRow = () => {
        setConsumptions([...consumptions, {
            itemId: '',
            name: '',
            type: 'supply',
            lot: '',
            quantityConsumed: 0,
            quantityWaste: 0
        }]);
    };

    const handleRemoveRow = (index: number) => {
        setConsumptions(consumptions.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!selectedPackId || producedQuantity <= 0) {
            alert("Seleccione un pack y especifique la cantidad producida.");
            return;
        }

        const reportId = `REP-${Date.now()}`;
        const report: Omit<ProductionReport, 'created_at'> = {
            id: reportId,
            packId: selectedPackId,
            reportDate,
            producedQuantity,
            consumptions
        };

        try {
            await addProductionReport(report);
            navigate('/partes-montaje');
        } catch (error) {
            console.error(error);
            alert("Error al guardar el parte.");
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Nuevo Parte de Montaje</h1>
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
                            >
                                <option value="">-- Seleccionar Pack Pendiente --</option>
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
                </Card>

                {/* CUERPO ESTILO EXCEL */}
                {selectedPack && (
                    <>
                        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-300">
                            <div className="grid grid-cols-2 border-b border-gray-300">
                                <div className="p-4 border-r border-gray-300">
                                    <label className="block text-sm font-bold text-gray-700 uppercase">Cantidad Producida:</label>
                                    <input 
                                        type="number" 
                                        value={producedQuantity} 
                                        onChange={e => setProducedQuantity(Number(e.target.value))} 
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded bg-yellow-50 font-bold text-lg text-center"
                                    />
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
                                Guardar Parte y Descontar Mermas
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CreateProductionReport;
