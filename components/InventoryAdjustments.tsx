
import React, { useState, useMemo } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import ConfirmationModal from './ui/ConfirmationModal';
import { useData } from '../context/DataContext';

const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;

const InventoryAdjustments: React.FC = () => {
    const { supplies, products, updateSupplyDetails, mergeSupplies, updateProductDetails, mergeProducts } = useData();
    const [activeTab, setActiveTab] = useState<'supplies' | 'products'>('supplies');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [edits, setEdits] = useState<Record<string, { name: string; code: string }>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [masterId, setMasterId] = useState('');

    // --- Data Filtering based on Tab ---
    const filteredItems = useMemo(() => {
        if (activeTab === 'supplies') {
            return supplies.filter(s => 
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()))
            ).sort((a, b) => a.name.localeCompare(b.name));
        } else {
            // For products, 'id' is same as 'name' in our current context structure
            // Now filtering by code too
            return products.filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
            ).sort((a, b) => a.name.localeCompare(b.name));
        }
    }, [supplies, products, searchTerm, activeTab]);

    const handleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleEditChange = (id: string, field: 'name' | 'code', value: string) => {
        setEdits(prev => {
            // Base values depending on tab
            let baseName = '';
            let baseCode = '';
            
            if (activeTab === 'supplies') {
                const s = supplies.find(x => x.id === id);
                baseName = s?.name || '';
                baseCode = s?.code || '';
            } else {
                const p = products.find(x => x.id === id); // id is name for products
                baseName = p?.name || '';
                baseCode = p?.code || ''; 
            }

            return {
                ...prev,
                [id]: {
                    ...prev[id],
                    name: prev[id]?.name ?? baseName,
                    code: prev[id]?.code ?? baseCode,
                    [field]: value
                }
            };
        });
    };

    const handleSaveRow = async (id: string) => {
        const edit = edits[id];
        if (!edit) return;
        setIsSaving(true);
        try {
            if (activeTab === 'supplies') {
                const original = supplies.find(s => s.id === id);
                if (original) {
                    await updateSupplyDetails(id, edit.name, edit.code, original.name);
                }
            } else {
                // For products, ID is the original name
                // Now passing code to updateProductDetails
                await updateProductDetails(id, edit.name, edit.code);
            }
            
            setEdits(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
        } catch (error) {
            console.error(error);
            alert("Error al guardar cambios.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleMergeClick = () => {
        if (selectedIds.size < 2) return;
        setMasterId((Array.from(selectedIds) as string[])[0]); 
        setShowMergeModal(true);
    };

    const confirmMerge = async () => {
        const sourceIds = Array.from(selectedIds).filter(id => id !== masterId) as string[];
        setIsSaving(true);
        try {
            if (activeTab === 'supplies') {
                await mergeSupplies(masterId, sourceIds);
            } else {
                // For products, IDs are Names. masterId is the chosen name.
                await mergeProducts(masterId, sourceIds);
            }
            setSelectedIds(new Set());
            setShowMergeModal(false);
        } catch (error) {
            console.error(error);
            alert("Error al fusionar.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {showMergeModal && (
                <ConfirmationModal 
                    title={`Fusionar ${activeTab === 'supplies' ? 'Consumibles' : 'Productos'}`}
                    message={`Selecciona cuál será el ${activeTab === 'supplies' ? 'artículo' : 'producto'} MAESTRO. Los demás se renombrarán y su historial se unificará.`}
                    onConfirm={confirmMerge} 
                    onCancel={() => setShowMergeModal(false)}
                    confirmText="Confirmar Fusión"
                >
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Maestro (Conservará el nombre)</label>
                        <select 
                            value={masterId} 
                            onChange={e => setMasterId(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        >
                            {(Array.from(selectedIds) as string[]).map(id => {
                                let name = '';
                                if (activeTab === 'supplies') {
                                    const s = supplies.find(x => x.id === id);
                                    name = s ? `${s.name} (Stock: ${s.quantity})` : id;
                                } else {
                                    name = id; // Product ID is name
                                }
                                return <option key={id} value={id}>{name}</option>;
                            })}
                        </select>
                    </div>
                </ConfirmationModal>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Ajustes de Inventario</h1>
                    <p className="text-gray-500">Estandariza nombres, añade códigos y fusiona duplicados.</p>
                </div>
                {selectedIds.size > 1 && (
                    <Button onClick={handleMergeClick} className="animate-bounce bg-purple-600 hover:bg-purple-700">
                        Fusionar ({selectedIds.size}) Seleccionados
                    </Button>
                )}
            </div>

            <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => { setActiveTab('supplies'); setSelectedIds(new Set()); setSearchTerm(''); }}
                        className={`${activeTab === 'supplies' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Consumibles
                    </button>
                    <button
                        onClick={() => { setActiveTab('products'); setSelectedIds(new Set()); setSearchTerm(''); }}
                        className={`${activeTab === 'products' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Vinos (Productos)
                    </button>
                </nav>
            </div>

            <Card>
                <div className="mb-4">
                    <input 
                        type="text" 
                        placeholder={`Buscar ${activeTab === 'supplies' ? 'consumible' : 'producto'}...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 w-10"><input type="checkbox" disabled /></th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Código</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre / Descripción</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredItems.map(item => {
                                const id = item.id;
                                const isEditing = !!edits[id];
                                // Safety check for supplies vs products
                                const originalName = item.name;
                                const originalCode = (item as any).code || ''; 
                                
                                const currentName = isEditing ? edits[id].name : originalName;
                                const currentCode = isEditing ? edits[id].code : originalCode;
                                
                                const hasChanges = currentName !== originalName || currentCode !== originalCode;

                                return (
                                    <tr key={id} className={selectedIds.has(id) ? 'bg-purple-50' : ''}>
                                        <td className="px-4 py-4">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.has(id)} 
                                                onChange={() => handleSelect(id)}
                                                className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input 
                                                type="text" 
                                                value={currentCode}
                                                onChange={e => handleEditChange(id, 'code', e.target.value.toUpperCase())}
                                                placeholder={activeTab === 'supplies' ? "Ej: EMB..." : "Ej: PTA..."}
                                                className="w-full p-1 border border-gray-300 rounded text-sm uppercase font-mono"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input 
                                                type="text" 
                                                value={currentName}
                                                onChange={e => handleEditChange(id, 'name', e.target.value.toUpperCase())}
                                                className="w-full p-1 border border-gray-300 rounded text-sm uppercase"
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {hasChanges && (
                                                <Button 
                                                    onClick={() => handleSaveRow(id)} 
                                                    disabled={isSaving}
                                                    className="p-1 text-xs"
                                                    title="Guardar cambios"
                                                >
                                                    <CheckIcon />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default InventoryAdjustments;
