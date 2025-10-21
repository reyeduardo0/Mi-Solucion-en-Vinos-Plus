
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WinePack, PackModel } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import { fileToBase64 } from '../utils/helpers';

const OrderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const PackModelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const AssignLotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" /></svg>;
const EvidenceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

interface AssignedContent {
    productName: string;
    lot: string;
    quantity: number;
}

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
    <div className="flex items-center mb-4">
        {icon}
        <h3 className="text-lg font-semibold text-gray-800 ml-3">{title}</h3>
    </div>
);

const CreatePack: React.FC = () => {
  const navigate = useNavigate();
  const { albaranes, packModels, addPack } = useData();
  
  const [orderId, setOrderId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [assignedContents, setAssignedContents] = useState<AssignedContent[]>([]);
  const [additionalComponents, setAdditionalComponents] = useState('');
  const [packImageFile, setPackImageFile] = useState<File | null>(null);

  const selectedModel = useMemo(() => packModels.find(m => m.id === selectedModelId), [selectedModelId, packModels]);
  
  const availableLotsByProduct = useMemo(() => {
    const lotMap = new Map<string, Set<string>>();
    albaranes.forEach(albaran => {
      albaran.pallets.forEach(pallet => {
        if (!lotMap.has(pallet.product.name)) {
          lotMap.set(pallet.product.name, new Set());
        }
        lotMap.get(pallet.product.name)!.add(pallet.product.lot);
      });
    });
    return lotMap;
  }, [albaranes]);

  useEffect(() => {
    if (selectedModel) {
      setAssignedContents(selectedModel.productRequirements.map(req => ({
        productName: req.productName,
        quantity: req.quantity,
        lot: '', // User needs to select a lot
      })));
    } else {
      setAssignedContents([]);
    }
  }, [selectedModel]);
  
  const handleLotAssignment = (productName: string, lot: string) => {
    setAssignedContents(current => current.map(c => c.productName === productName ? { ...c, lot } : c));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPackImageFile(e.target.files[0]);
    }
  };

  const handleCreatePack = async () => {
    const isLotAssignmentComplete = assignedContents.every(c => c.lot);
    if (!orderId || !selectedModel || !isLotAssignmentComplete) {
        alert("Por favor, introduzca una orden de pedido, seleccione un modelo y asigne un lote a cada producto.");
        return;
    }

    let imageBase64: string | undefined = undefined;
    if (packImageFile) {
        const base64String = await fileToBase64(packImageFile);
        imageBase64 = base64String.split(',')[1] || base64String;
    }
    
    const newPack: WinePack = {
      id: `pack-${Date.now()}`,
      orderId,
      modelId: selectedModel.id,
      modelName: selectedModel.name,
      creationDate: new Date().toISOString(),
      contents: assignedContents,
      suppliesUsed: selectedModel.supplyRequirements,
      additionalComponents: additionalComponents || undefined,
      packImage: imageBase64,
      status: 'Ensamblado',
    };

    await addPack(newPack);
    navigate('/stock');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Ensamblar Nuevo Pack</h1>
        <div className="space-y-8">
            <Card><SectionHeader icon={<OrderIcon />} title="Orden de Pedido del Cliente" /><input type="text" placeholder="Ej: PED-C-123" value={orderId} onChange={e => setOrderId(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-yellow-500 focus:border-yellow-500"/></Card>
            <Card><SectionHeader icon={<PackModelIcon />} title="Seleccionar Modelo de Pack" /><select value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-yellow-500 focus:border-yellow-500"><option value="">Seleccionar un modelo...</option>{packModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Card>
            {selectedModel && (
                <>
                <Card>
                    <SectionHeader icon={<AssignLotIcon />} title="Asignar Lotes a Productos" />
                    <div className="space-y-4">
                        {assignedContents.map((content, index) => {
                            const availableLots = Array.from(availableLotsByProduct.get(content.productName) || []);
                            return (
                                <div key={index} className="grid grid-cols-3 gap-4 items-center p-3 bg-gray-50 rounded-md">
                                    <div className="font-semibold">{content.productName}</div>
                                    <div>{content.quantity} unidades</div>
                                    <div>
                                        <select value={content.lot} onChange={(e) => handleLotAssignment(content.productName, e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm p-2">
                                            <option value="">Seleccionar lote...</option>
                                            {availableLots.map(lot => <option key={lot} value={lot}>{lot}</option>)}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
                <Card>
                    <SectionHeader icon={<EvidenceIcon />} title="Componentes y Evidencias" />
                     <div className="mb-4">
                        <h4 className="font-semibold text-gray-700 mb-2">Insumos Requeridos (del modelo)</h4>
                        <ul className="list-disc list-inside text-gray-600 bg-gray-50 p-4 rounded-md">
                            {selectedModel.supplyRequirements.map(s => <li key={s.supplyId}>{s.name}: {s.quantity} unidad(es)</li>)}
                        </ul>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="block text-sm font-medium text-gray-700">Notas (Insumos no contables)</label><input type="text" placeholder="Ej: Doble capa de film, cinta especial..." value={additionalComponents} onChange={e => setAdditionalComponents(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
                        <div><label className="block text-sm font-medium text-gray-700">Cargar Imagen del Pack (Opcional)</label><input type="file" accept="image/*" onChange={handleImageChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"/></div>
                    </div>
                </Card>
                <div className="flex justify-end space-x-4 pt-6 mt-4 border-t">
                    <Button variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
                    <Button onClick={handleCreatePack}>Crear Pack Ensamblado</Button>
                </div>
                </>
            )}
        </div>
    </div>
  );
};

export default CreatePack;
