import React, { useState, useMemo } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import ConfirmationModal from './ui/ConfirmationModal';
import { useData } from '../context/DataContext';

const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;

const InventoryAdjustments: React.FC = () => {
    const { supplies, updateSupplyDetails, mergeSupplies } = useData();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [edits, setEdits] = useState<Record<string, { name: string; code: string }>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [masterId, setMasterId] = useState('');

    const filteredSupplies = useMemo(() => {
        return supplies.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [supplies, searchTerm]);

    const handleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleEditChange = (id: string, field: 'name' | 'code', value: string) => {
        setEdits(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                name: prev[id]?.name ?? supplies.find(s => s.id === id)?.name ?? '',
                code: prev[id]?.code ?? supplies.find(s => s.id === id)?.code ?? '',
                [field]: value
            }
        }));
    };

    const handleSaveRow = async (id: string) => {
        const edit = edits[id];
        if (!edit) return;
        const original = supplies.find(s => s.id === id);
        if (!original) return;

        setIsSaving(true);
        try {
            await updateSupplyDetails(id, edit.name, edit.code, original.name);
            // Clear edit state for this row on success
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
        setMasterId(Array.from(selectedIds)[0]); // Default first as master
        setShowMergeModal(true);
    };

    const confirmMerge = async () => {
        // Fix: Explicitly cast to string[] to resolve TS error 'unknown[] is not assignable to string[]'
        const sourceIds = Array.from(selectedIds).filter(id => id !== masterId) as string[];
        setIsSaving(true);
        try {
            await mergeSupplies(masterId, sourceIds);
            setSelectedIds(new Set());
            setShowMergeModal(false);
        } catch (error) {
            console.error(error);
            alert("Error al fusionar consumibles.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {showMergeModal && (
                <ConfirmationModal 
                    title="Fusionar Consumibles" 
                    message="Selecciona cuál será el artículo MAESTRO. Los demás se eliminarán y su stock e historial se moverán al maestro."
                    onConfirm={confirmMerge} 
                    onCancel={() => setShowMergeModal(false)}
                    confirmText="Confirmar Fusión"
                >
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Artículo Maestro (Conservará el nombre y código)</label>
                        <select 
                            value={masterId} 
                            onChange={e => setMasterId(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        >
                            {Array.from(selectedIds).map(id => {
                                const s = supplies.find(supply => supply.id === id);
                                return <option key={id} value={id}>{s?.name} (Stock: {s?.quantity})</option>;
                            })}
                        </select>
                    </div>
                </ConfirmationModal>
            )}

            <div className="flex justify-between items-center mb-6">
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

            <Card>
                <div className="mb-4">
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o código..." 
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
                            {filteredSupplies.map(supply => {
                                const isEditing = !!edits[supply.id];
                                const currentName = isEditing ? edits[supply.id].name : supply.name;
                                const currentCode = isEditing ? edits[supply.id].code : (supply.code || '');
                                const hasChanges = currentName !== supply.name || currentCode !== (supply.code || '');

                                return (
                                    <tr key={supply.id} className={selectedIds.has(supply.id) ? 'bg-purple-50' : ''}>
                                        <td className="px-4 py-4">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.has(supply.id)} 
                                                onChange={() => handleSelect(supply.id)}
                                                className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input 
                                                type="text" 
                                                value={currentCode}
                                                onChange={e => handleEditChange(supply.id, 'code', e.target.value.toUpperCase())}
                                                placeholder="Ej: EMB001"
                                                className="w-full p-1 border border-gray-300 rounded text-sm uppercase font-mono"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input 
                                                type="text" 
                                                value={currentName}
                                                onChange={e => handleEditChange(supply.id, 'name', e.target.value.toUpperCase())}
                                                className="w-full p-1 border border-gray-300 rounded text-sm uppercase"
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {hasChanges && (
                                                <Button 
                                                    onClick={() => handleSaveRow(supply.id)} 
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