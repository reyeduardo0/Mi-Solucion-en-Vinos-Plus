import React, { useState, useMemo } from 'react';
import { Albaran, Pallet, Supply, WinePack } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';

// Define a type for the flattened pallet structure
interface FlattenedPallet extends Pallet {
  entryDate: string;
  albaranId: string;
}

const formatDateSafe = (dateString?: string): string => {
    if (!dateString) return 'Fecha inválida';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }
    return date.toLocaleDateString('es-ES');
};

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{title}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            </div>
            {children}
        </div>
    </div>
);

const AddSupplyModal: React.FC<{ onSave: (supply: Omit<Supply, 'id' | 'quantity'>) => void; onClose: () => void; }> = ({ onSave, onClose }) => {
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
        <Modal title="Añadir Nuevo Insumo" onClose={onClose}>
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
        <Modal title="Registrar Entrada de Insumo" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium">Insumo</label><select value={selectedSupply} onChange={e => setSelectedSupply(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value="">Seleccionar...</option>{supplies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium">Cantidad a Añadir</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div className="flex justify-end space-x-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Añadir Stock</Button></div>
            </form>
        </Modal>
    );
};


const StatusBadge: React.FC<{ status: 'Correcto' | 'Incidencia' | 'Bajo Stock' | 'Ensamblado' | 'Despachado' }> = ({ status }) => {
    const colors = {
        'Correcto': 'bg-green-100 text-green-800',
        'Incidencia': 'bg-yellow-100 text-yellow-800',
        'Bajo Stock': 'bg-yellow-100 text-yellow-800',
        'Ensamblado': 'bg-blue-100 text-blue-800',
        'Despachado': 'bg-gray-100 text-gray-800',
    };
    const dotColors = {
        'Correcto': 'bg-green-500',
        'Incidencia': 'bg-yellow-500',
        'Bajo Stock': 'bg-yellow-500',
        'Ensamblado': 'bg-blue-500',
        'Despachado': 'bg-gray-500',
    };
    
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
            <svg className={`-ml-0.5 mr-1.5 h-2 w-2 ${dotColors[status]}`} fill="currentColor" viewBox="0 0 8 8">
                <circle cx={4} cy={4} r={3} />
            </svg>
            {status}
        </span>
    );
};


interface StockProps {
  albaranes: Albaran[];
  supplies: Supply[];
  packs: WinePack[];
  onAddNewSupply: (supplyData: Omit<Supply, 'id' | 'quantity'>) => void;
  onAddSupplyStock: (supplyId: string, quantity: number) => void;
}

const Stock: React.FC<StockProps> = ({ albaranes, supplies, packs, onAddNewSupply, onAddSupplyStock }) => {
  const [activeTab, setActiveTab] = useState<'pallets' | 'packs' | 'supplies'>('pallets');
  const [showAddSupplyModal, setShowAddSupplyModal] = useState(false);
  const [showSupplyEntryModal, setShowSupplyEntryModal] = useState(false);

  const palletInventory = useMemo((): FlattenedPallet[] => {
    return albaranes.flatMap(albaran => 
      albaran.pallets.map(pallet => ({
        ...pallet,
        entryDate: albaran.entryDate,
        albaranId: albaran.id,
      }))
    );
  }, [albaranes]);

  const TabButton: React.FC<{
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
  }> = ({ label, count, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
        isActive
          ? 'border-brand-yellow text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {label} ({count})
    </button>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        {showAddSupplyModal && <AddSupplyModal onSave={onAddNewSupply} onClose={() => setShowAddSupplyModal(false)} />}
        {showSupplyEntryModal && <AddSupplyStockModal supplies={supplies} onSave={onAddSupplyStock} onClose={() => setShowSupplyEntryModal(false)} />}

        <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestión de Stock</h1>

        <div className="mb-4 border-b border-gray-200">
            <TabButton label="Inventario de Pallets" count={palletInventory.length} isActive={activeTab === 'pallets'} onClick={() => setActiveTab('pallets')} />
            <TabButton label="Inventario de Packs" count={packs.length} isActive={activeTab === 'packs'} onClick={() => setActiveTab('packs')} />
            <TabButton label="Inventario de Insumos" count={supplies.length} isActive={activeTab === 'supplies'} onClick={() => setActiveTab('supplies')} />
        </div>

        <Card>
            {activeTab === 'pallets' && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº Palet</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Albarán Origen</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Entrada</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Botellas</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th></tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">{palletInventory.length > 0 ? (palletInventory.map(pallet => (<tr key={pallet.id}><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pallet.palletNumber}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pallet.product.name}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pallet.product.lot}</td><td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{pallet.albaranId}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateSafe(pallet.entryDate)}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{pallet.totalBottles}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><StatusBadge status={pallet.incident ? 'Incidencia' : 'Correcto'} /></td></tr>))) : (<tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">No hay pallets en el inventario.</td></tr>)}</tbody>
                    </table>
                </div>
            )}
            {activeTab === 'packs' && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Pack</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modelo</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden Pedido</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Creación</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th></tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">{packs.map(pack => (<tr key={pack.id}><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pack.id}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pack.modelName}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pack.orderId}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateSafe(pack.creationDate)}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><StatusBadge status={pack.status} /></td></tr>))}</tbody>
                    </table>
                </div>
            )}
            {activeTab === 'supplies' && (
                <div>
                    <div className="flex justify-end space-x-2 mb-4">
                        <Button variant="secondary" onClick={() => setShowAddSupplyModal(true)}>Añadir Nuevo Insumo</Button>
                        <Button onClick={() => setShowSupplyEntryModal(true)}>Registrar Entrada</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Actual</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">{supplies.map(supply => (<tr key={supply.id}><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supply.name}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supply.type}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supply.quantity}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supply.unit}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><StatusBadge status={supply.minStock !== undefined && supply.quantity < supply.minStock ? 'Bajo Stock' : 'Correcto'} /></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            )}
      </Card>
    </div>
  );
};

export default Stock;
