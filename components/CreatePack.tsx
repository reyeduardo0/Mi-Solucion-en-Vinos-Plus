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
    const totalAssigned = assignments.reduce((sum, a) => sum + (parseInt(a.qty, 10) || 0), 0);
    const canSave = totalAssigned === requiredQty && assignments.every(a => a.lot && (parseInt(a.qty, 10) > 0));

    const updateAssignment = (index: number, field: 'lot' | 'qty', value: string) => {
        const newAssignments = [...assignments];
        newAssignments[index] = { ...newAssignments[index], [field]: value };
        setAssignments(newAssignments);
    };
    const addAssignment = () => setAssignments([...assignments, { lot: '', qty: '' }]);
    const removeAssignment = (index: number) => setAssignments(assignments.filter((_, i) => i !== index));

    const handleSubmit = () => {
        if (!canSave) return;
        onSave(assignments.map(a => ({ lot: a.lot, qty: parseInt(a.qty, 10) })));
        onClose();
    };

    return (
        <Modal title={`Asignar Lotes para: ${productName}`} onClose={onClose}>
            <p className="mb-4 text-gray-700">Cantidad total requerida: <strong className="text-lg">{requiredQty}</strong> botellas.</p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {assignments.map((a, i) => (
                    <div key={i} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                        <select value={a.lot} onChange={e => updateAssignment(i, 'lot', e.target.value)} className="w-full p-2 border rounded-md">
                            <option value="">Seleccionar lote...</option>
                            {availableLots.map(l => <option key={l.lot} value={l.lot}>{l.lot} (Disp: {l.available})</option>)}
                        </select>
                        <input type="number" value={a.qty} onChange={e => updateAssignment(i, 'qty', e.target.value)} min="1" max={availableLots.find(l => l.lot === a.lot)?.available} placeholder="Cant." className="w-24 p-2 border rounded-md" />
                        <button type="button" onClick={() => removeAssignment(i)} className="p-2 text-red-500 hover:bg-red-100 rounded-full">&times;</button>
                    </div>
                ))}
            </div>
             {totalAssigned < requiredQty && (
                <button type="button" onClick={addAssignment} className="mt-2 text-sm text-blue-600 hover:underline">+ Añadir otro lote</button>
            )}
            <div className={`mt-4 text-sm font-semibold p-2 rounded-md ${totalAssigned === requiredQty ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                Total Asignado: {totalAssigned} / {requiredQty}
            </div>
            <div className="flex justify-end space-x-2 pt-4 mt-4 border-t">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={!canSave}>Guardar Asignación</Button>
            </div>
        </Modal>
    );
};

const CreatePack: React.FC = () => {
    const navigate = useNavigate();
    const { packModels, inventoryStock, addPack, supplies, addMerma } = useData();

    const [orderId, setOrderId] = useState('');
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

    const isProductAssigned = (productName: string) => {
        return assignedContents.some(c => c.productName === productName);
    };

    const canCreatePack = useMemo(() => {
        if (!orderId.trim() || !selectedModel) return false;
        // Check if all required products have been assigned lots
        return selectedModel.productRequirements.every(req => isProductAssigned(req.productName));
    }, [orderId, selectedModel, assignedContents]);


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
                quantity: s.quantity,
            })),
            status: 'Ensamblado',
        };

        try {
            await addPack(newPack);
            // Optionally navigate away after creation
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
                        </div>
                    </Card>

                    {selectedModel && (
                        <Card title="Paso 2: Asignar Lotes de Producto">
                            <p className="text-sm text-gray-600 mb-4">Asigna los lotes específicos de producto que se usarán para este pack.</p>
                            <div className="space-y-3">
                                {selectedModel.productRequirements.map(req => (
                                    <div key={req.productName} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border">
                                        <div>
                                            <p className="font-semibold text-gray-800">{req.productName}</p>
                                            <p className="text-sm text-gray-500">Cantidad requerida: {req.quantity} botellas</p>
                                        </div>
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => setModalProduct({ name: req.productName, requiredQty: req.quantity })}
                                        >
                                            {/* FIX: Add text-gray-500 to preserve original icon color */}
                                            {isProductAssigned(req.productName) ? <CheckCircleIcon /> : <AssignLotIcon className="h-5 w-5 mr-2 text-gray-500" />}
                                            {isProductAssigned(req.productName) ? 'Lotes Asignados' : 'Asignar Lotes'}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
                <div className="lg:col-span-1">
                    {selectedModel && (
                        <Card title="Resumen del Pack">
                           <div className="space-y-4">
                               <div>
                                   <h4 className="font-semibold text-gray-800">Modelo</h4>
                                   <p className="text-gray-600">{selectedModel.name}</p>
                               </div>
                               <div>
                                   <h4 className="font-semibold text-gray-800">Nº Pedido</h4>
                                   <p className="text-gray-600">{orderId || 'Sin definir'}</p>
                               </div>
                               <div className="pt-3 border-t">
                                   <h4 className="font-semibold text-gray-800 mb-2">Productos Asignados</h4>
                                   {assignedContents.length > 0 ? (
                                       <ul className="list-disc list-inside text-sm space-y-1">
                                           {assignedContents.map(c => <li key={`${c.productName}-${c.lot}`}><strong>{c.productName}</strong> - Lote: {c.lot} (x{c.quantity})</li>)}
                                       </ul>
                                   ) : <p className="text-sm text-gray-500">Aún no se han asignado lotes.</p>}
                               </div>
                               <div className="pt-3 border-t">
                                   <h4 className="font-semibold text-gray-800 mb-2">Consumibles Requeridos</h4>
                                   <ul className="list-disc list-inside text-sm space-y-1">
                                       {selectedModel.supplyRequirements.map(s => <li key={s.supplyId}>{s.name} (x{s.quantity})</li>)}
                                   </ul>
                               </div>

                               <div className="pt-4">
                                   <Button className="w-full" onClick={handleCreatePack} disabled={!canCreatePack}>
                                       Finalizar y Crear Pack
                                   </Button>
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