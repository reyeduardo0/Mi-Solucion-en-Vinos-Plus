
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WinePack, PackModel, Merma, Supply, InventoryStockItem } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import { fileToBase64, getErrorMessage } from '../utils/helpers';
import Modal from './ui/Modal';

const OrderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const PackModelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
// FIX: Update AssignLotIcon to accept SVG props to allow passing className.
const AssignLotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;

// --- MODALS ---

interface AssignLotsModalProps {
    productName: string;
    requiredQty: number;
    availableLots: { lot: string; available: number }[];
    onSave: (assignments: { lot: string; qty: number }[]) => void;
    onClose: () => void;
}

const AssignLotsModal: React.FC<AssignLotsModalProps> = ({ productName, requiredQty, availableLots, onSave, onClose }) => {
    const [assignments, setAssignments] = useState<{ lot: string; qty: string }[]>([{ lot: '', qty: '' }]);
    
    // Robust calculation handling strings/numbers
    const totalAssigned = assignments.reduce((sum, a) => sum + (Number(a.qty) || 0), 0);
    const remaining = requiredQty - totalAssigned;
    
    // Validation logic: Total must match exactly AND all rows must have lot and qty > 0
    const canSave = totalAssigned === requiredQty && assignments.every(a => a.lot && (Number(a.qty) > 0));

    const updateAssignment = (index: number, field: 'lot' | 'qty', value: string) => {
        const newAssignments = [...assignments];
        newAssignments[index] = { ...newAssignments[index], [field]: value };
        setAssignments(newAssignments);
    };
    
    const addAssignment = () => setAssignments([...assignments, { lot: '', qty: '' }]);
    const removeAssignment = (index: number) => setAssignments(assignments.filter((_, i) => i !== index));

    // Función inteligente para rellenar cantidad automáticamente
    const handleAutoFill = (index: number) => {
        const currentLotName = assignments[index].lot;
        if (!currentLotName) return;

        const lotData = availableLots.find(l => l.lot === currentLotName);
        if (!lotData) return;

        // Cuánto ya se ha asignado en OTRAS filas
        const assignedElsewhere = assignments.reduce((sum, a, i) => i === index ? sum : sum + (Number(a.qty) || 0), 0);
        
        // Cuánto falta para llegar al objetivo
        const remainingNeed = requiredQty - assignedElsewhere;
        
        // La cantidad a poner es el mínimo entre lo que falta y lo que tiene el lote
        const quantityToSet = Math.max(0, Math.min(remainingNeed, lotData.available));
        
        if (quantityToSet > 0) {
            updateAssignment(index, 'qty', quantityToSet.toString());
        }
    };

    const handleSubmit = () => {
        if (!canSave) return;
        onSave(assignments.map(a => ({ lot: a.lot, qty: Number(a.qty) })));
        onClose();
    };

    let statusColor = 'bg-yellow-100 text-yellow-800 border-yellow-300';
    let statusText = `Faltan: ${remaining}`;
    
    if (totalAssigned === requiredQty) {
        statusColor = 'bg-green-100 text-green-800 border-green-300';
        statusText = 'Correcto: Cantidad exacta asignada.';
    } else if (totalAssigned > requiredQty) {
        statusColor = 'bg-red-100 text-red-800 border-red-300';
        statusText = `Exceso: Sobran ${Math.abs(remaining)}`;
    }

    return (
        <Modal title={`Asignar Lotes para: ${productName}`} onClose={onClose}>
            <div className="mb-4 bg-blue-50 p-4 rounded-md border border-blue-200 shadow-sm">
                <p className="text-sm text-blue-900">
                    Cantidad total requerida para los packs:
                </p>
                <p className="text-3xl font-bold text-blue-700">{requiredQty} <span className="text-base font-normal text-blue-600">botellas</span></p>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 pb-2">
                {assignments.map((a, i) => {
                    const selectedLotData = availableLots.find(l => l.lot === a.lot);
                    return (
                        <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 p-3 bg-gray-50 rounded-md border shadow-sm">
                            <div className="flex-grow w-full sm:w-auto">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Lote de Origen</label>
                                <select value={a.lot} onChange={e => updateAssignment(i, 'lot', e.target.value)} className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500">
                                    <option value="">Seleccionar lote...</option>
                                    {availableLots.map(l => <option key={l.lot} value={l.lot}>{l.lot} (Disp: {l.available})</option>)}
                                </select>
                            </div>
                            <div className="flex items-end space-x-2">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cantidad</label>
                                    <div className="flex shadow-sm rounded-md">
                                        <input 
                                            type="number" 
                                            value={a.qty} 
                                            onChange={e => updateAssignment(i, 'qty', e.target.value)} 
                                            min="1" 
                                            max={selectedLotData?.available} 
                                            placeholder="0" 
                                            className="w-24 p-2 border rounded-l-md text-sm border-r-0 focus:ring-2 focus:ring-blue-500 z-10" 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => handleAutoFill(i)} 
                                            className="bg-blue-600 text-white px-3 py-2 rounded-r-md text-xs font-bold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                                            title="Rellenar con el máximo necesario disponible"
                                        >
                                            MAX
                                        </button>
                                    </div>
                                </div>
                                <button type="button" onClick={() => removeAssignment(i)} className="p-2 text-red-500 hover:bg-red-100 rounded-full mb-0.5 transition-colors" title="Eliminar línea">&times;</button>
                            </div>
                        </div>
                    );
                })}
            </div>
            
             {totalAssigned < requiredQty && (
                <button type="button" onClick={addAssignment} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center">
                    <span className="text-lg mr-1">+</span> Añadir otro lote (dividir cantidad)
                </button>
            )}
            
            <div className={`mt-6 text-sm font-semibold p-4 rounded-md border-2 flex justify-between items-center ${statusColor}`}>
                <span>Total Asignado: {totalAssigned} / {requiredQty}</span>
                <span className="uppercase tracking-wide">{statusText}</span>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 mt-2 border-t">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={!canSave} className={!canSave ? 'opacity-50 cursor-not-allowed' : ''}>Guardar Asignación</Button>
            </div>
        </Modal>
    );
};

const CreatePack: React.FC = () => {
    const navigate = useNavigate();
    const { packModels, inventoryStock, addPack, supplies, addMerma } = useData();

    const [orderId, setOrderId] = useState('');
    const [packCount, setPackCount] = useState<number>(1); // Default to 1 pack
    const [selectedModelId, setSelectedModelId] = useState<string>('');
    // State to hold { productName: string, lot: string, quantity: number }[]
    const [assignedContents, setAssignedContents] = useState<WinePack['contents']>([]);
    
    // State for modal
    const [modalProduct, setModalProduct] = useState<{ name: string; requiredQty: number; } | null>(null);

    const selectedModel = useMemo(() => packModels.find(m => m.id === selectedModelId), [selectedModelId, packModels]);

    const availableProductLots = useMemo(() => {
        if (!modalProduct) return [];
        return inventoryStock
            .filter(item => item.type === 'Producto' && item.name === modalProduct.name && item.available > 0)
            .map(item => ({ lot: item.lot || 'SIN LOTE', available: item.available }));
    }, [inventoryStock, modalProduct]);

    const handleModelChange = (modelId: string) => {
        setSelectedModelId(modelId);
        setAssignedContents([]); // Reset assignments when model changes
    };

    const handleSaveLots = (productName: string, assignments: { lot: string; qty: number }[]) => {
        // Remove old assignments for this product
        const otherAssignments = assignedContents.filter(c => c.productName !== productName);
        const newAssignments = assignments.map(a => ({ productName, lot: a.lot, quantity: a.qty }));
        setAssignedContents([...otherAssignments, ...newAssignments]);
    };

    // Check if the total assigned quantity for a product meets the requirement * packCount
    const isProductFullyAssigned = (productName: string, requiredPerPack: number) => {
        const totalRequired = requiredPerPack * packCount;
        const assignedTotal = assignedContents
            .filter(c => c.productName === productName)
            .reduce((sum, c) => sum + c.quantity, 0);
        return assignedTotal === totalRequired;
    };

    const canCreatePack = useMemo(() => {
        if (!orderId.trim() || !selectedModel || packCount <= 0) return false;
        // Check if all required products have been fully assigned
        return selectedModel.productRequirements.every(req => isProductFullyAssigned(req.productName, req.quantity));
    }, [orderId, selectedModel, assignedContents, packCount]);


    const handleCreatePack = async () => {
        if (!canCreatePack || !selectedModel) return;
        
        const newPack: WinePack = {
            id: `PACK-${Date.now()}`,
            modelId: selectedModel.id,
            modelName: selectedModel.name,
            orderId: orderId.trim(),
            creationDate: new Date().toISOString(),
            contents: assignedContents,
            suppliesUsed: selectedModel.supplyRequirements.map(s => ({
                supplyId: s.supplyId,
                name: s.name,
                quantity: s.quantity * packCount, // Scale supplies too
            })),
            status: 'Ensamblado',
        };

        try {
            await addPack(newPack);
            navigate('/inventario');
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {modalProduct && (
                <AssignLotsModal
                    productName={modalProduct.name}
                    requiredQty={modalProduct.requiredQty}
                    availableLots={availableProductLots}
                    onSave={(assignments) => handleSaveLots(modalProduct.name, assignments)}
                    onClose={() => setModalProduct(null)}
                />
            )}
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Crear Nuevo Pack de Vino</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Paso 1: Información General">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nº Pedido Cliente</label>
                                <input type="text" value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Ej: PO-12345" className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Modelo de Pack</label>
                                <select value={selectedModelId} onChange={e => handleModelChange(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
                                    <option value="">Seleccionar un modelo...</option>
                                    {packModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cantidad de Packs a crear</label>
                                <input 
                                    type="number" 
                                    value={packCount} 
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        setPackCount(val > 0 ? val : 0); // Prevent negative
                                        // Reset assignments if quantity changes to force re-validation to avoid stale "complete" states
                                        setAssignedContents([]);
                                    }} 
                                    min="1" 
                                    className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 font-bold text-lg" 
                                />
                                <p className="text-xs text-gray-500 mt-1">Define cuántas unidades de este modelo vas a producir en este lote.</p>
                            </div>
                        </div>
                    </Card>

                    {selectedModel && (
                        <Card title="Paso 2: Asignar Lotes de Producto">
                            <p className="text-sm text-gray-600 mb-4">Asigna los lotes específicos de producto que se usarán. Se calculan las botellas totales necesarias según la cantidad de packs.</p>
                            <div className="space-y-3">
                                {selectedModel.productRequirements.map(req => {
                                    const totalRequired = req.quantity * packCount;
                                    const isAssigned = isProductFullyAssigned(req.productName, req.quantity);
                                    
                                    return (
                                        <div key={req.productName} className={`flex justify-between items-center p-4 rounded-md border ${isAssigned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                                            <div>
                                                <p className="font-semibold text-gray-800">{req.productName}</p>
                                                <p className="text-sm text-gray-500">
                                                    Requerido: <strong>{totalRequired}</strong> botellas 
                                                    <span className="text-xs ml-1">({req.quantity} x {packCount} packs)</span>
                                                </p>
                                            </div>
                                            <Button 
                                                variant={isAssigned ? "secondary" : "primary"}
                                                onClick={() => setModalProduct({ name: req.productName, requiredQty: totalRequired })}
                                                className={isAssigned ? "text-green-700 bg-green-100 border-green-300 hover:bg-green-200" : ""}
                                            >
                                                {isAssigned ? <CheckCircleIcon className="h-5 w-5 mr-2" /> : <AssignLotIcon className="h-5 w-5 mr-2" />}
                                                {isAssigned ? 'Listo (Editar)' : 'Asignar Lotes'}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                </div>
                <div className="lg:col-span-1">
                    {selectedModel && (
                        <Card title="Resumen de Producción">
                           <div className="space-y-4">
                               <div>
                                   <h4 className="font-semibold text-gray-800">Modelo</h4>
                                   <p className="text-gray-600">{selectedModel.name}</p>
                               </div>
                               <div className="grid grid-cols-2 gap-2">
                                   <div>
                                       <h4 className="font-semibold text-gray-800">Pedido</h4>
                                       <p className="text-gray-600">{orderId || '---'}</p>
                                   </div>
                                   <div>
                                       <h4 className="font-semibold text-gray-800">Cantidad</h4>
                                       <p className="text-blue-600 font-bold text-lg">{packCount}</p>
                                   </div>
                               </div>
                               
                               <div className="pt-3 border-t">
                                   <h4 className="font-semibold text-gray-800 mb-2">Productos Asignados (Botellas)</h4>
                                   {assignedContents.length > 0 ? (
                                       <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                                           {assignedContents.map((c, i) => (
                                               <li key={i}>
                                                   {c.productName} <br/> 
                                                   <span className="ml-4 text-xs bg-gray-100 px-1 rounded">Lote: {c.lot}</span> 
                                                   <span className="font-semibold ml-1">x{c.quantity}</span>
                                               </li>
                                           ))}
                                       </ul>
                                   ) : <p className="text-sm text-gray-500 italic">Pendiente de asignación...</p>}
                               </div>
                               
                               <div className="pt-3 border-t">
                                   <h4 className="font-semibold text-gray-800 mb-2">Consumibles Totales</h4>
                                   <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                                       {selectedModel.supplyRequirements.map(s => (
                                           <li key={s.supplyId}>
                                               {s.name} 
                                               <span className="font-semibold ml-1">x{s.quantity * packCount}</span>
                                           </li>
                                       ))}
                                   </ul>
                               </div>

                               <div className="pt-4">
                                   <Button 
                                        className="w-full" 
                                        onClick={handleCreatePack} 
                                        disabled={!canCreatePack}
                                        title={!canCreatePack ? "Complete todos los campos requeridos y asigne lotes para habilitar." : "Crear producción"}
                                   >
                                       Confirmar y Crear Producción
                                   </Button>
                                   {!canCreatePack && (
                                       <p className="text-xs text-center text-red-500 mt-2">
                                           Complete el Nº de Pedido y asigne todos los lotes correctamente.
                                       </p>
                                   )}
                               </div>
                           </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreatePack;
