
import React, { useState } from 'react';
import { PackModel, Supply, Permission } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { PackModelIcon } from '../constants';
import { useData } from '../context/DataContext';
import Modal from './ui/Modal';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const BoxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m0 0v10l8 4m0-14L4 7" /></svg>;
const SupplyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const AddPackModelModal: React.FC<{ supplies: Supply[]; onSave: (model: Omit<PackModel, 'id' | 'created_at'>) => void; onClose: () => void; }> = ({ supplies, onSave, onClose }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [productReqs, setProductReqs] = useState<{productName: string, quantity: number}[]>([]);
    const [supplyReqs, setSupplyReqs] = useState<{supplyId: string, name: string, quantity: number}[]>([]);

    const handleAddProductReq = () => setProductReqs([...productReqs, { productName: '', quantity: 1 }]);
    const handleUpdateProductReq = (index: number, field: 'productName' | 'quantity', value: string | number) => {
        const updated = [...productReqs];
        updated[index] = { ...updated[index], [field]: value };
        setProductReqs(updated);
    };
    const handleRemoveProductReq = (index: number) => setProductReqs(productReqs.filter((_, i) => i !== index));

    const handleAddSupplyReq = () => setSupplyReqs([...supplyReqs, { supplyId: '', name: '', quantity: 1 }]);
    const handleUpdateSupplyReq = (index: number, field: 'supplyId' | 'quantity', value: string | number) => {
        const updated = [...supplyReqs];
        if (field === 'quantity') {
            updated[index].quantity = Number(value) || 1;
        } else {
            const supply = supplies.find(s => s.id === value);
            updated[index].supplyId = supply?.id || '';
            updated[index].name = supply?.name || '';
        }
        setSupplyReqs(updated);
    };
    const handleRemoveSupplyReq = (index: number) => setSupplyReqs(supplyReqs.filter((_, i) => i !== index));
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, description, productRequirements: productReqs, supplyRequirements: supplyReqs });
        onClose();
    };

    return (
        <Modal title="Crear Nuevo Modelo de Pack" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-8">
                <fieldset className="space-y-4"><legend className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Datos Generales</legend><div><label className="block text-sm font-medium">Nombre del Modelo</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div><div><label className="block text-sm font-medium">Descripción</label><textarea value={description} onChange={e => setDescription(e.target.value)} required rows={2} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div></fieldset>
                <fieldset><legend className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Requisitos de Productos</legend><div className="space-y-3">{productReqs.map((p, i) => (<div key={i} className="grid grid-cols-12 gap-2 items-center"><div className="col-span-8"><input type="text" placeholder="Nombre del producto" value={p.productName} onChange={e => handleUpdateProductReq(i, 'productName', e.target.value)} className="w-full p-2 border rounded-md" /></div><div className="col-span-3"><input type="number" value={p.quantity} onChange={e => handleUpdateProductReq(i, 'quantity', Number(e.target.value))} min="1" className="w-full p-2 border rounded-md" /></div><div className="col-span-1"><button type="button" onClick={() => handleRemoveProductReq(i)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon /></button></div></div>))}<Button type="button" variant="secondary" onClick={handleAddProductReq} className="mt-3 text-sm py-1.5">Añadir Producto</Button></div></fieldset>
                <fieldset><legend className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Requisitos de Insumos</legend><div className="space-y-3">{supplyReqs.map((s, i) => (<div key={i} className="grid grid-cols-12 gap-2 items-center"><div className="col-span-8"><select value={s.supplyId} onChange={e => handleUpdateSupplyReq(i, 'supplyId', e.target.value)} className="w-full p-2 border rounded-md"><option value="">Seleccionar Insumo...</option>{supplies.filter(sup => sup.type === 'Contable').map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}</select></div><div className="col-span-3"><input type="number" value={s.quantity} onChange={e => handleUpdateSupplyReq(i, 'quantity', Number(e.target.value))} min="1" className="w-full p-2 border rounded-md" /></div><div className="col-span-1"><button type="button" onClick={() => handleRemoveSupplyReq(i)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon /></button></div></div>))}<Button type="button" variant="secondary" onClick={handleAddSupplyReq} className="mt-3 text-sm py-1.5">Añadir Insumo</Button></div></fieldset>
                <div className="flex justify-end space-x-3 pt-4 border-t"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Guardar Modelo</Button></div>
            </form>
        </Modal>
    );
};

const PackModels: React.FC = () => {
    const { packModels, supplies, addPackModel } = useData();
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {showModal && <AddPackModelModal supplies={supplies} onSave={addPackModel} onClose={() => setShowModal(false)} />}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Modelos de Pack</h1>
                <Button onClick={() => setShowModal(true)}>
                    <PlusIcon /> <span className="ml-2">Crear Nuevo Modelo</span>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packModels.length > 0 ? packModels.map(model => (
                    <Card key={model.id} className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
                        <div className="flex justify-between items-start mb-1"><h3 className="text-lg font-bold text-gray-900 pr-4">{model.name}</h3><div className="flex space-x-1 flex-shrink-0"><button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"><PencilIcon /></button><button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"><TrashIcon /></button></div></div>
                        <p className="text-sm text-gray-500 mb-4 flex-grow">{model.description}</p>
                        <div className="space-y-3 text-sm bg-gray-50 p-3 rounded-md border">
                            <div><h4 className="flex items-center text-sm font-semibold text-gray-700 mb-1"><BoxIcon/> Productos Requeridos</h4><ul className="list-disc list-inside pl-4 text-gray-600">{model.productRequirements.map((p, i) => <li key={i}>{p.productName} (x{p.quantity})</li>)}</ul></div>
                             <div className="pt-2 border-t"><h4 className="flex items-center text-sm font-semibold text-gray-700 mb-1"><SupplyIcon/> Insumos Requeridos</h4><ul className="list-disc list-inside pl-4 text-gray-600">{model.supplyRequirements.map((s, i) => <li key={i}>{s.name} (x{s.quantity})</li>)}</ul></div>
                        </div>
                    </Card>
                )) : (
                    <div className="md:col-span-2 lg:col-span-3"><Card className="text-center py-12 flex flex-col items-center border-2 border-dashed"><div className="bg-gray-100 rounded-full p-4"><PackModelIcon /></div><h3 className="text-xl font-semibold text-gray-700 mt-4">No hay modelos de pack definidos</h3><p className="text-gray-500 mt-2">Crea tu primer modelo para empezar a estandarizar tus packs.</p><Button onClick={() => setShowModal(true)} className="mt-6">Crear mi primer modelo</Button></Card></div>
                )}
            </div>
        </div>
    )
};

export default PackModels;
