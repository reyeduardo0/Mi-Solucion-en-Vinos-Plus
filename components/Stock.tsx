import React, { useState, useMemo } from 'react';
import { Supply } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import Modal from './ui/Modal';
import StatusBadge from './ui/StatusBadge';

const AddSupplyModal: React.FC<{ onSave: (supply: Omit<Supply, 'id' | 'created_at' | 'quantity'>) => void; onClose: () => void; }> = ({ onSave, onClose }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'Contable' | 'No Contable'>('Contable');
    const [unit, setUnit] = useState<'unidades' | 'cajas' | 'rollos' | 'metros'>('unidades');
    const [minStock, setMinStock] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, type, unit, minStock: minStock ? parseInt(minStock, 10) : undefined });
        onClose();
    };

    return (
        <Modal title="Añadir Nuevo Consumible" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium">Nombre</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div><label className="block text-sm font-medium">Tipo</label><select value={type} onChange={e => setType(e.target.value as any)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value="Contable">Contable</option><option value="No Contable">No Contable</option></select></div>
                <div><label className="block text-sm font-medium">Unidad</label><select value={unit} onChange={e => setUnit(e.target.value as any)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value="unidades">Unidades</option><option value="cajas">Cajas</option><option value="rollos">Rollos</option><option value="metros">Metros</option></select></div>
                <div><label className="block text-sm font-medium">Stock Mínimo (Opcional)</label><input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div className="flex justify-end space-x-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Guardar</Button></div>
            </form>
        </Modal>
    );
};

const AddSupplyStockModal: React.FC<{ supplies: Supply[]; onSave: (supplyId: string, quantity: number) => void; onClose: () => void; }> = ({ supplies, onSave, onClose }) => {
    const [selectedSupply, setSelectedSupply] = useState('');
    const [quantity, setQuantity] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(selectedSupply, parseInt(quantity, 10));
        onClose();
    };

    return (
        <Modal title="Registrar Entrada de Consumible" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium">Consumible</label><select value={selectedSupply} onChange={e => setSelectedSupply(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value="">Seleccionar...</option>{supplies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium">Cantidad a Añadir</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div className="flex justify-end space-x-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Añadir Stock</Button></div>
            </form>
        </Modal>
    );
};

const Inventory: React.FC = () => {
    const { supplies, addNewSupply, addSupplyStock, inventoryStock } = useData();
    const [showAddSupplyModal, setShowAddSupplyModal] = useState(false);
    const [showSupplyEntryModal, setShowSupplyEntryModal] = useState(false);

    const handleSaveSupplyStock = (supplyId: string, quantity: number) => {
        addSupplyStock(supplyId, quantity).catch((error: any) => {
            console.error("Error adding supply stock:", error);
            alert(`Error al añadir stock: ${error.message}`);
        });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {showAddSupplyModal && <AddSupplyModal onSave={addNewSupply} onClose={() => setShowAddSupplyModal(false)} />}
            {showSupplyEntryModal && <AddSupplyStockModal supplies={supplies} onSave={handleSaveSupplyStock} onClose={() => setShowSupplyEntryModal(false)} />}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Inventario</h1>
                 <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setShowAddSupplyModal(true)}>Añadir Nuevo Consumible</Button>
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
        </div>
    );
};

export default Inventory;