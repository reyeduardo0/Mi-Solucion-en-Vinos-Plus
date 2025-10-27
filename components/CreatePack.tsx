



import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WinePack, PackModel, Merma, Supply, InventoryStockItem } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import { fileToBase64 } from '../utils/helpers';
import Modal from './ui/Modal';

const OrderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const PackModelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const AssignLotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" /></svg>;
const EvidenceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const WasteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

interface LotAssignment {
  lot: string;
  quantity: number;
}
interface ProductAssignment {
  productName: string;
  requiredQuantity: number;
  assignments: LotAssignment[];
}
type MermaEntry = Omit<Merma, 'id' | 'created_at'>;

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
    <div className="flex items-center mb-4">
        {icon}
        <h3 className="text-lg font-semibold text-gray-800 ml-3">{title}</h3>
    </div>
);

interface AssignLotsModalProps {
    productAssignment: ProductAssignment;
    availableLots: InventoryStockItem[];
    onSave: (productName: string, assignments: LotAssignment[]) => void;
    onClose: () => void;
}

const AssignLotsModal: React.FC<AssignLotsModalProps> = ({ productAssignment, availableLots, onSave, onClose }) => {
    const { productName, requiredQuantity, assignments: existingAssignments } = productAssignment;
    const [assignments, setAssignments] = useState<Record<string, number>>(() => 
        existingAssignments.reduce((acc, curr) => ({ ...acc, [curr.lot]: curr.quantity }), {})
    );

    // FIX: Operator '+' cannot be applied to types 'unknown' and 'number'.
    // Explicitly cast qty to a number as Object.values can be inferred as returning 'unknown'.
    const totalAssigned = useMemo(() => Object.values(assignments).reduce((sum, qty) => sum + (Number(qty) || 0), 0), [assignments]);
    const isComplete = totalAssigned === requiredQuantity;
    const remaining = requiredQuantity - totalAssigned;

    const handleQuantityChange = (lot: string, quantityStr: string, available: number) => {
        const quantity = parseInt(quantityStr, 10) || 0;
        const cappedQuantity = Math.max(0, Math.min(quantity, available));
        setAssignments(prev => ({ ...prev, [lot]: cappedQuantity }));
    };

    const handleSave = () => {
        const finalAssignments = Object.entries(assignments)
            // FIX: Explicitly cast qty to number to prevent type errors with comparison and object creation.
            .filter(([, qty]) => Number(qty) > 0)
            .map(([lot, quantity]) => ({ lot, quantity: Number(quantity) }));
        onSave(productName, finalAssignments);
        onClose();
    };

    return (
        <Modal title={`Asignar Lotes para: ${productName}`} onClose={onClose}>
            <div className="space-y-4">
                <div className="p-4 bg-gray-100 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Cantidad Requerida</p>
                    <p className="text-3xl font-bold text-gray-800">{requiredQuantity}</p>
                    <div className={`mt-2 font-semibold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {remaining > 0 ? `${remaining} por asignar` : '¡Asignación completa!'}
                    </div>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                    {availableLots.map(lotItem => (
                        <div key={lotItem.lot} className="grid grid-cols-3 gap-4 items-center">
                            <div>
                                <p className="font-semibold">{lotItem.lot}</p>
                                <p className="text-xs text-gray-500">Disp: {lotItem.available}</p>
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="number"
                                    value={assignments[lotItem.lot!] || ''}
                                    onChange={e => handleQuantityChange(lotItem.lot!, e.target.value, lotItem.available)}
                                    placeholder="0"
                                    max={lotItem.available}
                                    min="0"
                                    className="w-full p-2 border rounded-md text-right"
                                />
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="button" onClick={handleSave} disabled={!isComplete}>Confirmar Asignación</Button>
                </div>
            </div>
        </Modal>
    );
};


const CreatePack: React.FC = () => {
  const navigate = useNavigate();
  const { packModels, supplies, addPack, addMerma, inventoryStock } = useData();
  
  const [orderId, setOrderId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [assignedContents, setAssignedContents] = useState<ProductAssignment[]>([]);
  const [additionalComponents, setAdditionalComponents] = useState('');
  const [packImageFile, setPackImageFile] = useState<File | null>(null);
  const [mermasToRegister, setMermasToRegister] = useState<MermaEntry[]>([]);
  const [lotModalState, setLotModalState] = useState<{ isOpen: boolean; assignment: ProductAssignment | null }>({ isOpen: false, assignment: null });
  
  const selectedModel = useMemo(() => packModels.find(m => m.id === selectedModelId), [selectedModelId, packModels]);
  
  const availableLotsByProduct = useMemo(() => {
    const lotMap = new Map<string, InventoryStockItem[]>();
    inventoryStock.filter(item => item.type === 'Producto' && item.available > 0).forEach(item => {
        if (!lotMap.has(item.name)) lotMap.set(item.name, []);
        lotMap.get(item.name)!.push(item);
    });
    return lotMap;
  }, [inventoryStock]);

  const allInventoryItems = useMemo(() => {
    const items: { id: string; name: string; type: 'product' | 'supply'; lot?: string }[] = [];
    inventoryStock.filter(i => i.type === 'Producto').forEach(item => items.push({ id: `product-${item.name}-${item.lot}`, name: item.name, type: 'product', lot: item.lot }));
    supplies.forEach(supply => items.push({ id: supply.id, name: supply.name, type: 'supply' }));
    return items;
  }, [inventoryStock, supplies]);

  useEffect(() => {
    if (selectedModel) {
      setAssignedContents(selectedModel.productRequirements.map(req => ({
        productName: req.productName,
        requiredQuantity: req.quantity,
        assignments: [],
      })));
    } else {
      setAssignedContents([]);
    }
  }, [selectedModel]);
  
  const handleUpdateAssignments = (productName: string, newAssignments: LotAssignment[]) => {
    setAssignedContents(current => current.map(c => c.productName === productName ? { ...c, assignments: newAssignments } : c));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setPackImageFile(e.target.files[0]);
  };

  const handleAddMerma = () => setMermasToRegister(prev => [...prev, { itemId: '', itemName: '', itemType: 'product', quantity: 1, lot: '' }]);
  const handleUpdateMerma = (index: number, field: keyof MermaEntry, value: any) => {
    setMermasToRegister(prev => prev.map((merma, i) => {
        if (i !== index) return merma;
        if (field === 'itemId') {
            const selectedItem = allInventoryItems.find(item => item.id === value);
            return { ...merma, itemId: selectedItem?.id || '', itemName: selectedItem?.name || '', itemType: selectedItem?.type || 'product', lot: selectedItem?.lot, };
        }
        return { ...merma, [field]: value };
    }));
  };
  const handleRemoveMerma = (index: number) => setMermasToRegister(prev => prev.filter((_, i) => i !== index));

  const handleCreatePack = async () => {
    const isLotAssignmentComplete = assignedContents.every(c => c.assignments.reduce((sum, a) => sum + a.quantity, 0) === c.requiredQuantity);
    if (!orderId || !selectedModel || !isLotAssignmentComplete) {
        alert("Por favor, introduzca una orden de pedido, seleccione un modelo y asigne completamente los lotes a cada producto.");
        return;
    }

    try {
        for (const merma of mermasToRegister) {
            if (merma.itemName && merma.quantity > 0) {
                await addMerma(merma);
            }
        }
    
        let imageBase64: string | undefined = undefined;
        if (packImageFile) {
            imageBase64 = await fileToBase64(packImageFile);
        }

        const finalContents = assignedContents.flatMap(pa => pa.assignments.map(la => ({ productName: pa.productName, lot: la.lot, quantity: la.quantity })));
        
        const newPack: WinePack = {
          id: `pack-${Date.now()}`, orderId, modelId: selectedModel.id, modelName: selectedModel.name,
          creationDate: new Date().toISOString(), contents: finalContents,
          suppliesUsed: selectedModel.supplyRequirements, additionalComponents: additionalComponents || undefined,
          packImage: imageBase64, status: 'Ensamblado',
        };
    
        await addPack(newPack);
        navigate('/stock');
    } catch (error: any) {
        alert(`Error al crear el pack: ${error.message}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        {lotModalState.isOpen && lotModalState.assignment && (
            <AssignLotsModal
                productAssignment={lotModalState.assignment}
                availableLots={availableLotsByProduct.get(lotModalState.assignment.productName) || []}
                onSave={handleUpdateAssignments}
                onClose={() => setLotModalState({ isOpen: false, assignment: null })}
            />
        )}
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Ensamblar Nuevo Pack</h1>
        <div className="space-y-8">
            <Card><SectionHeader icon={<OrderIcon />} title="Orden de Pedido del Cliente" /><input type="text" placeholder="Ej: PED-C-123" value={orderId} onChange={e => setOrderId(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-yellow-500 focus:border-yellow-500"/></Card>
            <Card><SectionHeader icon={<PackModelIcon />} title="Seleccionar Modelo de Pack" /><select value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-yellow-500 focus:border-yellow-500"><option value="">Seleccionar un modelo...</option>{packModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Card>
            {selectedModel && (
                <>
                <Card>
                    <SectionHeader icon={<AssignLotIcon />} title="Asignar Lotes a Productos" />
                    <div className="space-y-4">{assignedContents.map((content) => {
                        const totalAssigned = content.assignments.reduce((sum, a) => sum + a.quantity, 0);
                        const isAssignmentComplete = totalAssigned === content.requiredQuantity;
                        return (
                          <div key={content.productName} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 bg-gray-50 rounded-md">
                            <div className="font-semibold">{content.productName}</div>
                            <div>Req: <span className="font-bold">{content.requiredQuantity}</span> uds</div>
                            <div className={`text-sm ${isAssignmentComplete ? 'text-green-600' : 'text-red-600'}`}>
                                Asignado: <span className="font-bold">{totalAssigned}</span> uds
                                <ul className="text-xs text-gray-500 list-disc list-inside pl-2">
                                  {content.assignments.map(a => <li key={a.lot}>{a.quantity} de {a.lot}</li>)}
                                </ul>
                            </div>
                            <Button variant="secondary" onClick={() => setLotModalState({ isOpen: true, assignment: content })}>Asignar Lotes</Button>
                          </div>
                        );
                    })}</div>
                </Card>
                <Card>
                    <SectionHeader icon={<WasteIcon />} title="Registrar Mermas (Opcional)" />
                    <p className="text-sm text-gray-600 mb-4">Si algún producto o consumible se dañó durante el ensamblaje, regístralo aquí para descontarlo del stock.</p>
                    <div className="space-y-3">{mermasToRegister.map((merma, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md">
                            <div className="col-span-6"><label className="text-xs text-gray-500">Artículo</label>
                                <select value={merma.itemId || ''} onChange={e => handleUpdateMerma(index, 'itemId', e.target.value)} className="w-full p-2 border rounded-md text-sm">
                                    <option value="">Seleccionar...</option>
                                    {allInventoryItems.map(item => <option key={item.id} value={item.id}>{item.name} {item.lot ? `(Lote: ${item.lot})` : ''}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2"><label className="text-xs text-gray-500">Cantidad</label><input type="number" value={merma.quantity} onChange={e => handleUpdateMerma(index, 'quantity', Number(e.target.value))} min="1" className="w-full p-2 border rounded-md text-sm"/></div>
                            <div className="col-span-3"><label className="text-xs text-gray-500">Razón</label><input type="text" placeholder="Opcional" value={merma.reason || ''} onChange={e => handleUpdateMerma(index, 'reason', e.target.value)} className="w-full p-2 border rounded-md text-sm"/></div>
                            <div className="col-span-1 self-end"><button type="button" onClick={() => handleRemoveMerma(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full">&times;</button></div>
                        </div>
                    ))}<Button type="button" variant="secondary" onClick={handleAddMerma} className="mt-3 text-sm py-1.5">+ Añadir Fila de Merma</Button>
                </Card>
                <Card>
                    <SectionHeader icon={<EvidenceIcon />} title="Componentes y Evidencias" />
                     <div className="mb-4"><h4 className="font-semibold text-gray-700 mb-2">Consumibles Requeridos (del modelo)</h4><ul className="list-disc list-inside text-gray-600 bg-gray-50 p-4 rounded-md">{selectedModel.supplyRequirements.map(s => <li key={s.supplyId}>{s.name}: {s.quantity} unidad(es)</li>)}</ul></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="block text-sm font-medium text-gray-700">Notas (Consumibles no contables)</label><input type="text" placeholder="Ej: Doble capa de film, cinta especial..." value={additionalComponents} onChange={e => setAdditionalComponents(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
                        <div><label className="block text-sm font-medium text-gray-700">Cargar Imagen del Pack (Opcional)</label><input type="file" accept="image/*" onChange={handleImageChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"/></div>
                    </div>
                </Card>
                <div className="flex justify-end space-x-4 pt-6 mt-4 border-t"><Button variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button><Button onClick={handleCreatePack}>Crear Pack Ensamblado</Button></div>
                </>
            )}
        </div>
    </div>
  );
};

export default CreatePack;