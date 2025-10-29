import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Albaran, Pallet, Supply } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { useData } from '../context/DataContext';
import { toDateTimeLocalInput, fileToBase64, capitalizeWords, getErrorMessage } from '../utils/helpers';
import ConfirmationModal from './ui/ConfirmationModal';

interface PalletGroup {
    id: string; // for react key
    type: 'product' | 'consumable';
    // Product fields
    productName: string; 
    productLot: string;
    boxesPerPallet: number;
    bottlesPerBox: number;
    // Consumable fields
    supplyId: string;
    supplyLot: string;
    // Common
    palletCount: number;
    pallets: Partial<Pallet>[];
    isCollapsed: boolean;
}

const generateUniqueId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Moved outside the component to prevent re-definition on every render, fixing the input bug.
const HeaderInput: React.FC<{label:string, id:string, value:string, onChange:(e: React.ChangeEvent<HTMLInputElement>)=>void, required?:boolean, errorField?:string, validationErrors: Record<string, string[]>}> = ({label, id, value, onChange, required, errorField, validationErrors}) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}{required && '*'}</label>
        <input
            type="text"
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            className={`mt-1 block w-full shadow-sm sm:text-sm rounded-md p-2 ${validationErrors.header?.includes(errorField || id) ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus:ring-yellow-500 focus:border-yellow-500'}`}
        />
    </div>
);


const GoodsReceipt: React.FC = () => {
    const { albaranId: albaranIdFromParams } = useParams<{ albaranId: string }>();
    const navigate = useNavigate();
    const { albaranes, supplies, addAlbaran, updateAlbaran, products } = useData();
    
    const [albaranId, setAlbaranId] = useState('');
    const [entryDate, setEntryDate] = useState(toDateTimeLocalInput());
    const [truckPlate, setTruckPlate] = useState('');
    const [carrier, setCarrier] = useState('');
    const [driver, setDriver] = useState('');
    const [origin, setOrigin] = useState('');
    const [totalPallets, setTotalPallets] = useState(0);
    const [palletGroups, setPalletGroups] = useState<PalletGroup[]>([]);
    
    const [status, setStatus] = useState<'pending' | 'verified' | 'incident'>('verified');
    const [incidentDetails, setIncidentDetails] = useState('');
    const [incidentImages, setIncidentImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
    const [showCancelModal, setShowCancelModal] = useState(false);
    
    const isEditing = !!albaranIdFromParams;

    const assignedPalletsCount = useMemo(() => palletGroups.reduce((acc, group) => acc + (group.palletCount || 0), 0), [palletGroups]);
    const isPalletCountMismatch = totalPallets > 0 && totalPallets !== assignedPalletsCount;

    useEffect(() => {
        if (isEditing) {
            const existingAlbaran = albaranes.find(a => a.id === albaranIdFromParams);
            if (existingAlbaran) {
                setAlbaranId(existingAlbaran.id);
                setEntryDate(toDateTimeLocalInput(existingAlbaran.entryDate));
                setTruckPlate(existingAlbaran.truckPlate);
                setCarrier(existingAlbaran.carrier);
                setDriver(existingAlbaran.driver || '');
                setOrigin(existingAlbaran.origin || '');
                setStatus(existingAlbaran.status);
                setIncidentDetails(existingAlbaran.incidentDetails || '');
                setTotalPallets(existingAlbaran.pallets?.length || 0);

                const groups: Record<string, PalletGroup> = {};
                existingAlbaran.pallets?.forEach(p => {
                    let groupKey: string;
                    let supplyForGroup: Supply | undefined;

                    if (p.type === 'product') {
                        groupKey = `prod-${p.product!.name}-${p.product!.lot}`;
                    } else { // Consumable
                        supplyForGroup = supplies.find(s => s.name === p.supplyName);
                        groupKey = `supp-${supplyForGroup ? supplyForGroup.id : p.supplyName!}-${p.supplyLot}`;
                    }
                
                    if (!groups[groupKey]) {
                        groups[groupKey] = {
                            id: generateUniqueId(),
                            type: p.type,
                            productName: p.type === 'product' ? p.product!.name : '',
                            productLot: p.type === 'product' ? p.product!.lot : '',
                            boxesPerPallet: p.type === 'product' ? (p.boxesPerPallet || 0) : 0,
                            bottlesPerBox: p.type === 'product' ? (p.bottlesPerBox || 0) : 0,
                            supplyId: p.type === 'consumable' ? (supplyForGroup?.id || '') : '',
                            supplyLot: p.type === 'consumable' ? (p.supplyLot || '') : '',
                            palletCount: 0,
                            pallets: [],
                            isCollapsed: true,
                        };
                    }
                    groups[groupKey].pallets.push(p);
                    groups[groupKey].palletCount++;
                });
                setPalletGroups(Object.values(groups));
            }
        }
    }, [isEditing, albaranIdFromParams, albaranes, supplies]);
    
    // Auto-generate pallets when groups change
    useEffect(() => {
        setPalletGroups(currentGroups => 
            currentGroups.map(group => {
                const newPallets: Partial<Pallet>[] = Array.from({ length: group.palletCount }, (_, i) => ({
                    id: group.pallets[i]?.id || generateUniqueId(),
                    palletNumber: group.pallets[i]?.palletNumber || '',
                    sscc: group.pallets[i]?.sscc || '',
                    type: group.type,
                    product: group.type === 'product' ? { name: group.productName, lot: group.productLot } : undefined,
                    boxesPerPallet: group.type === 'product' ? group.boxesPerPallet : undefined,
                    bottlesPerBox: group.type === 'product' ? group.bottlesPerBox : undefined,
                    totalBottles: group.type === 'product' ? group.boxesPerPallet * group.bottlesPerBox : undefined,
                    supplyId: group.type === 'consumable' ? group.supplyId : undefined,
                    supplyName: group.type === 'consumable' ? supplies.find(s => s.id === group.supplyId)?.name : undefined,
                    supplyLot: group.type === 'consumable' ? group.supplyLot : undefined,
                    supplyQuantity: group.pallets[i]?.supplyQuantity || undefined,
                }));
                return { ...group, pallets: newPallets };
            })
        );
    }, [palletGroups.map(g => `${g.id}-${g.palletCount}-${g.productName}-${g.productLot}-${g.boxesPerPallet}-${g.bottlesPerBox}-${g.supplyId}-${g.supplyLot}`).join(), supplies]);

    const validate = useCallback(() => {
        const errors: Record<string, string[]> = {};
        let isValid = true;
        
        if (!albaranId.trim() && !isEditing) { errors.header = [...(errors.header || []), 'albaranId']; isValid = false; }
        if (!truckPlate.trim()) { errors.header = [...(errors.header || []), 'truckPlate']; isValid = false; }
        if (!carrier.trim()) { errors.header = [...(errors.header || []), 'carrier']; isValid = false; }
        if (isPalletCountMismatch) { isValid = false; }
        
        const allPallets = palletGroups.flatMap(g => g.pallets);
        const palletNumbers = new Set<string>();

        allPallets.forEach((p, index) => {
            const palletErrors: string[] = [];
            const palletKey = p.id || `pallet-${index}`;

            // FIX: Pallet number is optional. Only validate for duplicates if provided.
            if (p.palletNumber?.trim()) {
                if (palletNumbers.has(p.palletNumber.trim())) {
                    palletErrors.push('duplicatePalletNumber');
                } else {
                    palletNumbers.add(p.palletNumber.trim());
                }
            }

            if (p.type === 'product') {
                if (!p.product?.name?.trim()) palletErrors.push('productName');
                if (!p.product?.lot?.trim()) palletErrors.push('productLot');
            } else if (p.type === 'consumable') {
                if (!p.supplyId) palletErrors.push('supplyId');
                // Quantity validation for consumables is not needed here as it's defined at group level now.
            }

            if (palletErrors.length > 0) {
                errors[palletKey] = palletErrors;
                isValid = false;
            }
        });

        setValidationErrors(errors);
        return isValid;
    }, [albaranId, truckPlate, carrier, palletGroups, isEditing, isPalletCountMismatch]);

    const handleAddGroup = () => {
        setPalletGroups(prev => [...prev, {
            id: generateUniqueId(),
            type: 'product',
            productName: '',
            productLot: '',
            boxesPerPallet: 0,
            bottlesPerBox: 0,
            supplyId: '',
            supplyLot: '',
            palletCount: 1,
            pallets: [],
            isCollapsed: false,
        }]);
    };

    const handleRemoveGroup = (groupId: string) => {
        setPalletGroups(prev => prev.filter(g => g.id !== groupId));
    };

    const updateGroup = (groupId: string, updater: (group: PalletGroup) => PalletGroup) => {
        setPalletGroups(prev => prev.map(g => g.id === groupId ? updater(g) : g));
    };

    const handleGeneralIncidentImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setIncidentImages(files);
            // FIX: Explicitly type 'file' as File to resolve type inference issue.
            const previews = await Promise.all(files.map(async (file: File) => `data:${file.type};base64,${await fileToBase64(file)}`));
            setImagePreviews(previews);
        }
    };
    
    const handleSave = async () => {
        setError(null);
        if (!validate()) {
            setError("Hay errores en el formulario. Por favor, revise los campos marcados en rojo.");
            if(isPalletCountMismatch) setError("La suma de pallets en los grupos no coincide con el número total de pallets del albarán.");
            return;
        }

        setIsLoading(true);

        const allPallets = palletGroups.flatMap((g, groupIndex) => g.pallets.map((p, palletIndex) => {
            const basePallet = { ...p };
            // FIX: Auto-generate a unique pallet number if one wasn't provided manually.
            if (!basePallet.palletNumber?.trim()) {
                basePallet.palletNumber = `${albaranId.trim()}-G${groupIndex + 1}-P${palletIndex + 1}`;
            }
            if (basePallet.type === 'product') {
                basePallet.totalBottles = (p.boxesPerPallet || 0) * (p.bottlesPerBox || 0);
            }
            return basePallet as Pallet;
        }));

        const finalStatus = status === 'incident' || allPallets.some(p => p.incident) ? 'incident' : 'verified';
        
        const incidentImagesBase64 = await Promise.all(incidentImages.map(fileToBase64));
        
        const albaranData: Albaran = {
            id: isEditing ? albaranId : albaranId.trim(),
            entryDate, truckPlate, carrier, driver, origin,
            pallets: allPallets,
            status: finalStatus,
            incidentDetails: status === 'incident' ? incidentDetails : undefined,
            incidentImages: status === 'incident' ? incidentImagesBase64 : undefined,
        };

        try {
            if (isEditing) {
                await updateAlbaran(albaranData);
            } else {
                await addAlbaran(albaranData);
            }
            navigate('/entradas');
        } catch (e: any) {
            setError(getErrorMessage(e));
            setIsLoading(false);
        }
    };
    
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {showCancelModal && <ConfirmationModal title="Descartar Cambios" message="¿Estás seguro de que quieres cancelar? Todos los cambios no guardados se perderán." onConfirm={() => navigate('/entradas')} onCancel={() => setShowCancelModal(false)} confirmText="Sí, descartar" />}
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{isEditing ? 'Editar Entrada' : 'Registrar Nueva Entrada'}</h1>
            
            <Card title="Datos Generales del Albarán" className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {!isEditing && <HeaderInput label="Nº Albarán de Entrada" id="albaranId" value={albaranId} onChange={e => setAlbaranId(e.target.value)} required errorField="albaranId" validationErrors={validationErrors}/>}
                    {isEditing && <div><label className="block text-sm font-medium text-gray-700">Nº Albarán de Entrada</label><p className="mt-1 block w-full sm:text-sm p-2 bg-gray-100 rounded-md">{albaranId}</p></div>}
                    <div>
                        <label htmlFor="entryDate" className="block text-sm font-medium text-gray-700">Fecha y Hora de Entrada*</label>
                        <input type="datetime-local" id="entryDate" value={entryDate} onChange={e => setEntryDate(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                    <HeaderInput label="Matrícula Camión" id="truckPlate" value={truckPlate} onChange={e => setTruckPlate(e.target.value)} required validationErrors={validationErrors} />
                    <HeaderInput label="Transportista" id="carrier" value={carrier} onChange={e => setCarrier(e.target.value)} required validationErrors={validationErrors} />
                    <HeaderInput label="Conductor (Opcional)" id="driver" value={driver} onChange={e => setDriver(e.target.value)} validationErrors={validationErrors} />
                    <HeaderInput label="Origen (Opcional)" id="origin" value={origin} onChange={e => setOrigin(e.target.value)} validationErrors={validationErrors} />
                </div>
            </Card>

            <Card title="Detalles de los Pallets" className="mb-6">
                 <div className="mb-4">
                    <label htmlFor="totalPallets" className="block text-sm font-medium text-gray-700">Número Total de Pallets en el Albarán*</label>
                    <input
                        type="number"
                        id="totalPallets"
                        value={totalPallets || ''}
                        onChange={e => setTotalPallets(parseInt(e.target.value, 10) || 0)}
                        min="0"
                        className="mt-1 block w-40 shadow-sm sm:text-sm rounded-md p-2 border-gray-300"
                    />
                </div>

                <div className="p-4 border-l-4 border-gray-300 bg-gray-50 mb-4">
                    <h3 className="text-md font-semibold text-gray-800 mb-2">Definir Grupos de Pallets</h3>
                    <p className="text-sm text-gray-600 mb-4">Define los diferentes productos o consumibles que vienen en el albarán y cuántos pallets corresponden a cada uno.</p>
                    {palletGroups.map((group) => (
                        <PalletGroupDefinition 
                            key={group.id} 
                            group={group}
                            onUpdate={updater => updateGroup(group.id, updater)}
                            onRemove={() => handleRemoveGroup(group.id)}
                            supplies={supplies}
                            products={products}
                        />
                    ))}
                    <Button type="button" variant="secondary" onClick={handleAddGroup} className="mt-2 text-sm">+ Añadir Grupo</Button>

                    <div className={`mt-4 text-sm font-semibold p-2 rounded-md ${isPalletCountMismatch ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        Total de Pallets Asignados: {assignedPalletsCount} / {totalPallets}
                        {isPalletCountMismatch && " (¡No coinciden!)"}
                    </div>
                </div>
            </Card>
            

             <Card title="Incidencia General (Opcional)" className="mt-6">
                <div className="flex items-center"><input type="checkbox" id="general-incident-check" checked={status === 'incident'} onChange={(e) => setStatus(e.target.checked ? 'incident' : 'verified')} className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500" /><label htmlFor="general-incident-check" className="ml-2 block text-sm text-gray-900">Reportar una incidencia general para toda la entrada</label></div>
                {status === 'incident' && (<div className="mt-4 p-4 border-l-4 border-red-400 bg-red-50"><textarea placeholder="Describe la incidencia general de la entrada..." value={incidentDetails} onChange={(e) => setIncidentDetails(e.target.value)} className="w-full border-gray-300 rounded-md p-2 mb-2" /><input type="file" multiple onChange={handleGeneralIncidentImagesChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-100 file:text-red-700 hover:file:bg-red-200" /><div className="flex flex-wrap gap-2 mt-2">{imagePreviews.map((src, i) => <img key={i} src={src} alt={`preview ${i}`} className="h-20 w-20 object-cover rounded" />)}</div></div>)}
             </Card>

             <div className="mt-8 flex justify-end space-x-4">
                {error && <p className="text-red-600 self-center">{error}</p>}
                <Button variant="secondary" onClick={() => setShowCancelModal(true)} disabled={isLoading}>Cancelar</Button>
                <Button onClick={handleSave} disabled={isLoading}>{isLoading ? <Spinner /> : (isEditing ? 'Guardar Cambios' : 'Registrar Entrada')}</Button>
             </div>
        </div>
    );
};

interface PalletGroupDefinitionProps {
    group: PalletGroup;
    onUpdate: (updater: (group: PalletGroup) => PalletGroup) => void;
    onRemove: () => void;
    supplies: Supply[];
    products: { name: string }[];
}

const PalletGroupDefinition: React.FC<PalletGroupDefinitionProps> = ({ group, onUpdate, onRemove, supplies, products }) => {
    
    const handleFieldChange = (field: keyof PalletGroup, value: any) => {
        onUpdate(g => ({ ...g, [field]: value }));
    };

    const handleTypeChange = (newType: 'product' | 'consumable') => {
        onUpdate(g => ({
            ...g,
            type: newType,
            productName: '', productLot: '', boxesPerPallet: 0, bottlesPerBox: 0,
            supplyId: '', supplyLot: ''
        }));
    };

    const handlePalletFieldChange = (palletIndex: number, field: 'palletNumber' | 'sscc', value: string) => {
        onUpdate(g => {
            const newPallets = [...g.pallets];
            if (newPallets[palletIndex]) {
                newPallets[palletIndex] = { ...newPallets[palletIndex], [field]: value };
            }
            return { ...g, pallets: newPallets };
        });
    };
    
    const totalUnits = group.palletCount * group.boxesPerPallet * group.bottlesPerBox;
    const toggleCollapse = () => onUpdate(g => ({ ...g, isCollapsed: !g.isCollapsed }));

    return (
        <div className="border border-gray-300 rounded-lg p-3 mb-3 bg-white relative">
            <button type="button" onClick={onRemove} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 rounded-full text-xl">&times;</button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 items-end">
                <div>
                    <label className="text-xs font-medium text-gray-600">Tipo</label>
                    <select value={group.type} onChange={e => handleTypeChange(e.target.value as any)} className="w-full p-2 border rounded-md text-sm">
                        <option value="product">Producto</option>
                        <option value="consumable">Consumible</option>
                    </select>
                </div>
                 <div>
                    <label className="text-xs font-medium text-gray-600"># Pallets</label>
                    <input type="number" value={group.palletCount} onChange={e => handleFieldChange('palletCount', parseInt(e.target.value, 10) || 0)} min="1" className="w-full p-2 border rounded-md text-sm"/>
                </div>
                {group.type === 'product' ? (
                    <>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Nombre Producto</label>
                             <input 
                                type="text" 
                                placeholder="Escribe para buscar..."
                                list="product-list"
                                value={group.productName} 
                                onChange={e => handleFieldChange('productName', capitalizeWords(e.target.value))} 
                                className="w-full p-2 border rounded-md text-sm"
                            />
                            <datalist id="product-list">
                                {products.map(p => <option key={p.name} value={p.name} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Lote</label>
                            <input type="text" value={group.productLot} onChange={e => handleFieldChange('productLot', e.target.value.toUpperCase())} className="w-full p-2 border rounded-md text-sm"/>
                        </div>
                         <div>
                            <label className="text-xs font-medium text-gray-600">Cajas/Pallet</label>
                            <input type="number" value={group.boxesPerPallet} onChange={e => handleFieldChange('boxesPerPallet', parseInt(e.target.value, 10) || 0)} min="0" className="w-full p-2 border rounded-md text-sm"/>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Botellas/Caja</label>
                            <input type="number" value={group.bottlesPerBox} onChange={e => handleFieldChange('bottlesPerBox', parseInt(e.target.value, 10) || 0)} min="0" className="w-full p-2 border rounded-md text-sm"/>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-2 flex items-end">
                            <p className="text-sm font-semibold text-gray-700 w-full text-right pr-2">Total Unidades para este Grupo: <span className="text-lg text-blue-600">{totalUnits.toLocaleString('es-ES')}</span></p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-gray-600">Consumible</label>
                            <input
                                type="text"
                                list="supply-list"
                                placeholder="Escriba o seleccione un consumible"
                                onBlur={(e) => {
                                    const selectedSupply = supplies.find(s => s.name === e.target.value);
                                    if (selectedSupply) {
                                        handleFieldChange('supplyId', selectedSupply.id);
                                    } else {
                                        e.target.value = '';
                                        handleFieldChange('supplyId', '');
                                    }
                                }}
                                defaultValue={supplies.find(s => s.id === group.supplyId)?.name || ''}
                                className="w-full p-2 border rounded-md text-sm"
                            />
                            <datalist id="supply-list">
                                {supplies.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </datalist>
                        </div>
                         <div className="sm:col-span-1">
                            <label className="text-xs font-medium text-gray-600">Lote (Opcional)</label>
                            <input type="text" value={group.supplyLot || ''} onChange={e => handleFieldChange('supplyLot', e.target.value.toUpperCase())} className="w-full p-2 border rounded-md text-sm"/>
                        </div>
                    </>
                )}
            </div>
             <div className="mt-3 text-center">
                <button type="button" onClick={toggleCollapse} className="text-sm text-blue-600 hover:underline">
                    {group.isCollapsed ? 'Mostrar detalles de pallets' : 'Ocultar detalles de pallets'}
                </button>
            </div>
             {!group.isCollapsed && (
                <div className="mt-3 pt-3 border-t space-y-2">
                    <h5 className="text-sm font-semibold text-gray-700">Identificadores de Pallets Individuales</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {group.pallets.map((p, idx) => (
                             <div key={p.id} className="bg-gray-50 p-2 rounded-md">
                                <label className="text-xs font-medium text-gray-500 block mb-1">Pallet {idx + 1}</label>
                                <input
                                    type="text"
                                    placeholder={`Nº Pallet`}
                                    value={p.palletNumber || ''}
                                    onChange={e => handlePalletFieldChange(idx, 'palletNumber', e.target.value)}
                                    className="w-full p-1.5 border rounded-md text-xs mb-1"
                                />
                                <input
                                    type="text"
                                    placeholder={`SSCC (Opcional)`}
                                    value={p.sscc || ''}
                                    onChange={e => handlePalletFieldChange(idx, 'sscc', e.target.value)}
                                    className="w-full p-1.5 border rounded-md text-xs"
                                />
                             </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default GoodsReceipt;