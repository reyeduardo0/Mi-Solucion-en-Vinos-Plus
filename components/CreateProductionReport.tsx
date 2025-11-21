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
            // Cantidad producida por defecto = cantidad de packs (asumiendo 1 pack = 1 unidad de producción en este contexto, 
            // pero si el packCount se guardara en el pack sería mejor. 
            // REVISIÓN: El WinePack tiene 'contents' con cantidades totales.
            // Podemos estimar la cantidad de packs dividiendo el contenido por lo que requiere el modelo, 
            // pero simplificaremos asumiendo que el usuario rellena la "Cantidad Producida" real.
            // Inicializaremos en 0 o 1.
            setProducedQuantity(1); 

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
                    // Intentar buscar el lote usado. En la estructura actual de WinePack, suppliesUsed no guarda lote explícito
                    // a menos que se haya modificado. Asumiremos "SIN LOTE" o lo dejaremos vacío para que el usuario lo confirme si es crítico.
                    // Sin embargo, para facilitar, usaremos SIN LOTE por defecto si no hay info.
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

                {/* CUERPO */}
                {selectedPack && (
                    <>
                        <Card title="Producción Realizada">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Cantidad Producida (Packs)</label>
                                    <input 
                                        type="number" 
                                        value={producedQuantity} 
                                        onChange={e => setProducedQuantity(Number(e.target.value))} 
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm font-bold text-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Fecha Realización</label>
                                    <input 
                                        type="date" 
                                        value={reportDate} 
                                        onChange={e => setReportDate(e.target.value)} 
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card title="Consumos Realizados" className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 border">
                                    <thead className="bg-yellow-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-yellow-200">Artículo</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-yellow-200">Lote</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-yellow-200">Cant. Consumida (Teórica)</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-yellow-200 w-32">Cant. Mermas</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {consumptions.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-3 py-2 border-r">
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
                                                            className="w-full p-1 border rounded text-sm"
                                                         />
                                                    ) : (
                                                        <span className="text-sm text-gray-800">{item.name}</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 border-r">
                                                    <input 
                                                        type="text" 
                                                        value={item.lot} 
                                                        onChange={e => handleConsumptionChange(index, 'lot', e.target.value)}
                                                        className="w-full p-1 border-0 bg-transparent text-sm text-gray-600"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 border-r text-right">
                                                     <input 
                                                        type="number" 
                                                        value={item.quantityConsumed} 
                                                        onChange={e => handleConsumptionChange(index, 'quantityConsumed', Number(e.target.value))}
                                                        className="w-full p-1 border rounded text-sm text-right"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 border-r text-right bg-red-50">
                                                    <input 
                                                        type="number" 
                                                        value={item.quantityWaste} 
                                                        onChange={e => handleConsumptionChange(index, 'quantityWaste', Number(e.target.value))}
                                                        className="w-full p-1 border border-red-200 rounded text-sm text-right focus:ring-red-500 focus:border-red-500"
                                                        min="0"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <button 
                                                        onClick={() => handleRemoveRow(index)}
                                                        className="text-red-500 hover:text-red-700 font-bold px-2"
                                                        title="Eliminar fila"
                                                    >
                                                        &times;
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                        <tr>
                                            <td colSpan={5} className="px-3 py-2">
                                                <button onClick={handleAddRow} className="text-sm text-blue-600 font-semibold hover:underline">
                                                    + Agregar Fila (Extra)
                                                </button>
                                                <datalist id="supply-list">
                                                    {supplies.map(s => <option key={s.id} value={s.name} />)}
                                                </datalist>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                                * La "Cant. Consumida" es lo que se ha usado para la producción buena. 
                                <br/>
                                * Las "Mermas" se descontarán adicionalmente del stock al guardar.
                            </p>
                        </Card>

                        <div className="flex justify-end mt-6">
                            <Button onClick={handleSubmit} className="w-full md:w-auto">Guardar Parte y Descontar Mermas</Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CreateProductionReport;