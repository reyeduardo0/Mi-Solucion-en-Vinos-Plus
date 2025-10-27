import React, { useState, useMemo, useEffect } from 'react';
import { Supply, InventoryStockItem } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import Modal from './ui/Modal';
import StatusBadge from './ui/StatusBadge';
import ConfirmationModal from './ui/ConfirmationModal';

const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

interface AddSupplyModalProps {
    supply?: Supply | null;
    onSave: (
        supplyData: Omit<Supply, 'id' | 'created_at' | 'quantity'> | Supply,
        options?: {
            initialData?: { quantity: number; lot: string };
            lotUpdates?: { originalName: string; newName: string }[];
        }
    ) => void;
    onClose: () => void;
    inventoryStock: InventoryStockItem[];
}

const AddSupplyModal: React.FC<AddSupplyModalProps> = ({ supply, onSave, onClose, inventoryStock }) => {
    const [name, setName] = useState(supply?.name || '');
    const [type, setType] = useState<'Contable' | 'No Contable'>(supply?.type || 'Contable');
    const [unit, setUnit] = useState<'unidades' | 'cajas' | 'rollos' | 'metros'>(supply?.unit || 'unidades');
    const [minStock, setMinStock] = useState(supply?.minStock?.toString() || '');
    const [ean, setEan] = useState(supply?.ean || '');
    const [initialQuantity, setInitialQuantity] = useState('');
    const [initialLot, setInitialLot] = useState('');
    const [lotUpdates, setLotUpdates] = useState<Record<string, { originalName: string, newName: string }>>({});

    const supplyLots = useMemo(() => {
        if (!supply) return [];
        // CHANGE: Include items without a specific lot, which are grouped under "SIN LOTE".
        return inventoryStock.filter(item => item.type === 'Consumible' && item.name === supply.name && item.lot);
    }, [supply, inventoryStock]);

    useEffect(() => {
        if (supply && supplyLots.length > 0) {
            const initialLots = supplyLots.reduce((acc, lotItem) => {
                if (lotItem.lot) {
                    acc[lotItem.lot] = { originalName: lotItem.lot, newName: lotItem.lot };
                }
                return acc;
            }, {} as Record<string, { originalName: string, newName: string }>);
            setLotUpdates(initialLots);
        } else {
            setLotUpdates({});
        }
    }, [supply, supplyLots]);
    
    const handleLotNameChange = (originalName: string, newName: string) => {
        setLotUpdates(prev => ({
            ...prev,
            [originalName]: { ...prev[originalName], newName }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const supplyData = { 
            name, 
            type, 
            unit, 
            minStock: minStock ? parseInt(minStock, 10) : undefined,
            ean: ean || undefined
        };
        
        const initialQtyNum = initialQuantity ? parseInt(initialQuantity, 10) : 0;
        const initialData = !supply && initialQtyNum > 0 ? { quantity: initialQtyNum, lot: initialLot } : undefined;

        if (supply) {
            onSave({ ...supply, ...supplyData }, { lotUpdates: Object.values(lotUpdates) });
        } else {
            onSave(supplyData, { initialData });
        }
    };

    return (
        <Modal title={supply ? "Editar Consumible" : "Añadir Nuevo Consumible"} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium">Nombre</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div><label className="block text-sm font-medium">Código EAN (Opcional)</label><input type="text" value={ean} onChange={e => setEan(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div><label className="block text-sm font-medium">Tipo</label><select value={type} onChange={e => setType(e.target.value as any)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value="Contable">Contable</option><option value="No Contable">No Contable</option></select></div>
                <div><label className="block text-sm font-medium">Unidad</label><select value={unit} onChange={e => setUnit(e.target.value as any)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value="unidades">Unidades</option><option value="cajas">Cajas</option><option value="rollos">Rollos</option><option value="metros">Metros</option></select></div>
                <div><label className="block text-sm font-medium">Stock Mínimo (Opcional)</label><input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} min="0" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                
                 {supply && type === 'Contable' && (
                     <div className="pt-4 mt-4 border-t">
                        <h4 className="text-md font-semibold text-gray-800">Lotes en Stock</h4>
                         {supplyLots.length > 0 ? (
                            <>
                                <p className="text-xs text-gray-500 mb-3">Puedes asignar o corregir los nombres de los lotes existentes para este consumible.</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {supplyLots.map(lotItem => {
                                        const isSinLote = lotItem.lot === 'SIN LOTE';
                                        return (
                                        lotItem.lot && (
                                            <div key={lotItem.lot} className="grid grid-cols-2 gap-4 items-center p-2 rounded-md bg-gray-50 border">
                                                <div>
                                                    <label className="block text-sm font-medium">Lote</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder={isSinLote ? "Asignar un lote..." : ""}
                                                        value={isSinLote ? (lotUpdates[lotItem.lot]?.newName === 'SIN LOTE' ? '' : lotUpdates[lotItem.lot]?.newName || '') : (lotUpdates[lotItem.lot]?.newName || '')} 
                                                        onChange={e => handleLotNameChange(lotItem.lot!, e.target.value.toUpperCase())}
                                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium">Cantidad Disponible</label>
                                                    <p className="mt-1 block w-full p-2 bg-gray-100 rounded-md">{lotItem.available.toLocaleString('es-ES')}</p>
                                                </div>
                                            </div>
                                        )
                                    )})}
                                </div>
                            </>
                        ) : (
                             <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-md">
                                No hay stock registrado para este consumible.
                            </p>
                        )}
                    </div>
                )}

                {!supply && (
                    <>
                        <div className="pt-4 mt-4 border-t">
                            <h4 className="text-md font-semibold text-gray-800">Registrar Stock Inicial (Opcional)</h4>
                            <p className="text-xs text-gray-500 mb-3">Si ya tienes stock de este nuevo consumible, puedes registrar la primera entrada aquí.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Cantidad Inicial</label>
                                    <input type="number" value={initialQuantity} onChange={e => setInitialQuantity(e.target.value)} min="0" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Lote de Cant. Inicial</label>
                                    <input 
                                        type="text" 
                                        value={initialLot} 
                                        onChange={e => setInitialLot(e.target.value.toUpperCase())} 
                                        placeholder="Ej: LT-2024-XYZ"
                                        disabled={!initialQuantity || parseInt(initialQuantity, 10) <= 0}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100" 
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div className="flex justify-end space-x-2 pt-4"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Guardar</Button></div>
            </form>
        </Modal>
    );
};

const AddSupplyStockModal: React.FC<{ supplies: Supply[]; onSave: (supplyId: string, quantity: number, lot: string) => void; onClose: () => void; }> = ({ supplies, onSave, onClose }) => {
    const [selectedSupply, setSelectedSupply] = useState('');
    const [quantity, setQuantity] = useState('');
    const [lot, setLot] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(selectedSupply, parseInt(quantity, 10), lot);
        onClose();
    };

    return (
        <Modal title="Registrar Entrada de Consumible" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium">Consumible</label><select value={selectedSupply} onChange={e => setSelectedSupply(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value="">Seleccionar...</option>{supplies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium">Cantidad a Añadir</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div><label className="block text-sm font-medium">Lote (Opcional)</label><input type="text" value={lot} onChange={e => setLot(e.target.value.toUpperCase())} placeholder="Ej: LT-2024-ABC" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div className="flex justify-end space-x-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Añadir Stock</Button></div>
            </form>
        </Modal>
    );
};

const Inventory: React.FC = () => {
    const { supplies, addNewSupply, addSupplyStock, inventoryStock, updateSupply, deleteSupply, updateSupplyLot } = useData();
    const [showAddSupplyModal, setShowAddSupplyModal] = useState(false);
    const [showSupplyEntryModal, setShowSupplyEntryModal] = useState(false);
    const [supplyToEdit, setSupplyToEdit] = useState<Supply | null>(null);
    const [supplyToDelete, setSupplyToDelete] = useState<Supply | null>(null);

    const handleSaveSupplyStock = (supplyId: string, quantity: number, lot: string) => {
        addSupplyStock(supplyId, quantity, lot).catch((error: any) => {
            console.error("Error adding supply stock:", error);
            alert(`Error al añadir stock: ${error.message}`);
        });
    };
    
    const handleSaveSupply = async (
        data: Omit<Supply, 'id' | 'created_at' | 'quantity'> | Supply,
        options: {
            initialData?: { quantity: number; lot: string };
            lotUpdates?: { originalName: string; newName: string }[];
        } = {}
    ) => {
        const { initialData, lotUpdates } = options;
        try {
            if ('id' in data) { // This is an update
                await updateSupply(data);
                if (lotUpdates) {
                    await Promise.all(
                        lotUpdates
                            .filter(update => update.originalName !== update.newName)
                            .map(update => updateSupplyLot(data.name, update.originalName, update.newName))
                    );
                }
            } else { // This is a new supply
                await addNewSupply(data, initialData);
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSupplyToEdit(null);
            setShowAddSupplyModal(false);
        }
    };

    const handleEdit = (supply: Supply) => {
        setSupplyToEdit(supply);
        setShowAddSupplyModal(true);
    };

    const handleConfirmDelete = () => {
        if (supplyToDelete) {
            deleteSupply(supplyToDelete.id, supplyToDelete.name)
                .catch(err => alert(err.message))
                .finally(() => setSupplyToDelete(null));
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {(showAddSupplyModal || supplyToEdit) && <AddSupplyModal supply={supplyToEdit} onSave={handleSaveSupply} onClose={() => { setShowAddSupplyModal(false); setSupplyToEdit(null); }} inventoryStock={inventoryStock} />}
            {showSupplyEntryModal && <AddSupplyStockModal supplies={supplies} onSave={handleSaveSupplyStock} onClose={() => setShowSupplyEntryModal(false)} />}
            {supplyToDelete && <ConfirmationModal title="Confirmar Eliminación" message={`¿Estás seguro de que quieres eliminar el consumible "${supplyToDelete.name}"? Esta acción no se puede deshacer.`} onConfirm={handleConfirmDelete} onCancel={() => setSupplyToDelete(null)} />}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Inventario</h1>
                 <div className="flex justify-end space-x-2">
                    <Button onClick={() => setShowSupplyEntryModal(true)}>Registrar Entrada de Consumible</Button>
                </div>
            </div>

            <Card>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artículo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Total</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Disponible</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">En Packs</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">En Merma</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {inventoryStock.length > 0 ? (
                                inventoryStock.map((item, index) => (
                                    <tr key={`${item.name}-${item.lot}-${index}`}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.type}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{item.lot || 'N/A'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.total.toLocaleString('es-ES')}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-green-700 text-right">{item.available.toLocaleString('es-ES')}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-700 text-right">{item.inPacks.toLocaleString('es-ES')}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-red-700 text-right">{item.inMerma.toLocaleString('es-ES')}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.type === 'Consumible' && <StatusBadge status={item.minStock != null && item.available < item.minStock ? 'Bajo Stock' : 'Correcto'} />}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                                        No hay artículos en el inventario. Comienza registrando una nueva entrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="Maestro de Consumibles" className="mt-6">
                 <div className="flex justify-between items-center mb-4">
                     <p className="text-sm text-gray-600">Define todos los tipos de consumibles que utilizas en tu operativa.</p>
                     <Button variant="secondary" onClick={() => { setSupplyToEdit(null); setShowAddSupplyModal(true); }}>Añadir Nuevo Consumible</Button>
                </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">EAN</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lotes en Stock</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Mínimo</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                            {supplies.length > 0 ? supplies.map(s => {
                                const lotsForSupply = inventoryStock.filter(
                                    item => item.type === 'Consumible' && item.name === s.name && item.lot && item.lot !== 'SIN LOTE'
                                );

                                return (
                                <tr key={s.id}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.name}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-center">{s.ean || 'N/A'}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{s.type}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{s.unit}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {lotsForSupply.length > 0 ? (
                                            <ul className="space-y-1">
                                                {lotsForSupply.map(lotItem => (
                                                    <li key={lotItem.lot}>
                                                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{lotItem.lot}</span>
                                                        <span className="ml-2 text-gray-800 font-medium">{lotItem.available.toLocaleString('es-ES')}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{s.minStock != null ? s.minStock : 'N/A'}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm space-x-2">
                                        <Button variant="secondary" className="p-1.5" onClick={() => handleEdit(s)}><PencilIcon /></Button>
                                        <Button variant="danger" className="p-1.5" onClick={() => setSupplyToDelete(s)}><TrashIcon /></Button>
                                    </td>
                                </tr>
                                )
                            }) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                                        No hay consumibles definidos. Haz clic en "Añadir Nuevo Consumible" para empezar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Inventory;