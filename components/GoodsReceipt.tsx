
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Albaran, Pallet, Supply } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { useData } from '../context/DataContext';
import { toDateTimeLocalInput, fileToBase64, capitalizeWords, getErrorMessage, generateUUID } from '../utils/helpers';
import ConfirmationModal from './ui/ConfirmationModal';
import { extractDataFromImage } from '../services/geminiService';
import PalletInput from './goods-receipt/PalletInput';

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
    supplyName: string; // Added explicit field for free text
    supplyLot: string;
    supplyQuantity: number; // Added field for inventory control
    supplyUnit?: 'unidades' | 'cajas' | 'rollos' | 'metros'; // For new items
    supplyType?: 'Contable' | 'No Contable'; // For new items
    ean: string;
    // Common
    palletCount: number;
    pallets: Partial<Pallet>[];
    isCollapsed: boolean;
}

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
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { albaranes, supplies, addAlbaran, updateAlbaran, products, addNewSupply } = useData();
    
    const [albaranId, setAlbaranId] = useState('');
    const [orderId, setOrderId] = useState(''); // Added Order ID
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

    // AI Analysis State for Header
    const [albaranImageFile, setAlbaranImageFile] = useState<File | null>(null);
    const [albaranImagePreview, setAlbaranImagePreview] = useState<string | null>(null);
    const [isAnalyzingAlbaran, setIsAnalyzingAlbaran] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
    const [showCancelModal, setShowCancelModal] = useState(false);
    
    const isEditing = !!albaranIdFromParams;
    const initialType = searchParams.get('type') === 'consumable' ? 'consumable' : 'product';
    const isAIAvailable = useMemo(() => !!(window as any).process?.env?.API_KEY, []);

    const assignedPalletsCount = useMemo(() => palletGroups.reduce((acc, group) => acc + (group.palletCount || 0), 0), [palletGroups]);
    const isPalletCountMismatch = totalPallets > 0 && totalPallets !== assignedPalletsCount;

    // Initialize with a group if new entry
    useEffect(() => {
        if (!isEditing && palletGroups.length === 0) {
             setPalletGroups([{
                id: generateUUID(),
                type: initialType,
                productName: '',
                productLot: '',
                boxesPerPallet: 0,
                bottlesPerBox: 0,
                supplyId: '',
                supplyName: '',
                supplyLot: '',
                supplyQuantity: 0,
                ean: '',
                palletCount: 1,
                pallets: [],
                isCollapsed: false,
            }]);
        }
    }, [isEditing, initialType]);

    useEffect(() => {
        if (isEditing) {
            const existingAlbaran = albaranes.find(a => a.id === albaranIdFromParams);
            if (existingAlbaran) {
                setAlbaranId(existingAlbaran.id);
                setOrderId(existingAlbaran.orderId || '');
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
                    let supplyNameStr = '';

                    if (p.type === 'product') {
                        groupKey = `prod-${p.product!.name}-${p.product!.lot}`;
                    } else { // Consumable
                        supplyNameStr = p.supplyName || '';
                        supplyForGroup = supplies.find(s => s.name === supplyNameStr);
                        groupKey = `supp-${supplyForGroup ? supplyForGroup.id : supplyNameStr}-${p.supplyLot}`;
                    }
                
                    if (!groups[groupKey]) {
                        groups[groupKey] = {
                            id: generateUUID(),
                            type: p.type,
                            productName: p.type === 'product' ? p.product!.name : '',
                            productLot: p.type === 'product' ? p.product!.lot : '',
                            boxesPerPallet: p.type === 'product' ? (p.boxesPerPallet || 0) : 0,
                            bottlesPerBox: p.type === 'product' ? (p.bottlesPerBox || 0) : 0,
                            supplyId: p.type === 'consumable' ? (supplyForGroup?.id || '') : '',
                            supplyName: p.type === 'consumable' ? supplyNameStr : '',
                            supplyLot: p.type === 'consumable' ? (p.supplyLot || '') : '',
                            supplyQuantity: p.type === 'consumable' ? (p.supplyQuantity || 0) : 0,
                            ean: p.eanBox || '', // Capture EAN from pallet
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
                    id: group.pallets[i]?.id || generateUUID(),
                    palletNumber: group.pallets[i]?.palletNumber || '',
                    sscc: group.pallets[i]?.sscc || '',
                    type: group.type,
                    product: group.type === 'product' ? { name: group.productName, lot: group.productLot } : undefined,
                    boxesPerPallet: group.type === 'product' ? group.boxesPerPallet : undefined,
                    bottlesPerBox: group.type === 'product' ? group.bottlesPerBox : undefined,
                    totalBottles: group.type === 'product' ? group.boxesPerPallet * group.bottlesPerBox : undefined,
                    supplyId: group.type === 'consumable' ? group.supplyId : undefined,
                    supplyName: group.type === 'consumable' ? group.supplyName : undefined,
                    supplyLot: group.type === 'consumable' ? group.supplyLot : undefined,
                    supplyQuantity: group.type === 'consumable' ? group.supplyQuantity : undefined,
                    eanBox: group.ean || undefined, // Propagate EAN to pallets
                }));
                return { ...group, pallets: newPallets };
            })
        );
    }, [palletGroups.map(g => `${g.id}-${g.palletCount}-${g.productName}-${g.productLot}-${g.boxesPerPallet}-${g.bottlesPerBox}-${g.supplyId}-${g.supplyName}-${g.supplyLot}-${g.supplyQuantity}-${g.ean}`).join(), supplies]);

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
                // If creating a new supply, supplyId might be empty initially but supplyName must be present
                if (!p.supplyName) palletErrors.push('supplyId'); 
                if (!p.supplyQuantity || p.supplyQuantity <= 0) palletErrors.push('supplyQuantity');
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
            id: generateUUID(),
            type: 'consumable', // Default to consumable for current workflow ease
            productName: '',
            productLot: '',
            boxesPerPallet: 0,
            bottlesPerBox: 0,
            supplyId: '',
            supplyName: '',
            supplyLot: '',
            supplyQuantity: 0,
            ean: '',
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

    // --- AI Header Extraction Logic ---
    const handleAlbaranImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAlbaranImageFile(file);
            setAlbaranImagePreview(URL.createObjectURL(file));
        }
    };

    const removeAlbaranImage = () => {
        setAlbaranImageFile(null);
        if (albaranImagePreview) URL.revokeObjectURL(albaranImagePreview);
        setAlbaranImagePreview(null);
        const input = document.getElementById('albaran-image-input') as HTMLInputElement;
        if(input) input.value = '';
    };

    const handleAnalyzeAlbaran = async () => {
        if (!albaranImageFile) return;
        setIsAnalyzingAlbaran(true);
        setError(null);

        try {
            // Updated Prompt to include Line Items extraction
            const prompt = `
                Analiza esta imagen de un albarán de entrega. Extrae los datos en formato JSON con la siguiente estructura:
                {
                    "header": {
                        "albaranId": "Número de albarán",
                        "orderId": "Número de pedido/PO",
                        "entryDate": "Fecha en formato ISO",
                        "truckPlate": "Matrícula",
                        "carrier": "Transportista",
                        "driver": "Conductor",
                        "origin": "Origen",
                        "totalPalletsHeader": "Total de bultos/palets indicado en cabecera (número)"
                    },
                    "items": [
                        {
                            "description": "Nombre del producto o artículo",
                            "lot": "Lote",
                            "quantity": "Cantidad numérica total",
                            "unit": "Unidad (cajas, botellas, unidades)",
                            "pallets": "Número de palets para esta línea (si no se especifica, asume 1)",
                            "type": "Clasifica como 'product' (si es VINO/BEBIDA) o 'consumable' (si es material seco, cajas vacías, etiquetas, corchos, etc)"
                        }
                    ]
                }
                Devuelve solo el JSON limpio.
            `;
            
            const result = await extractDataFromImage(albaranImageFile, prompt);
            
            if (result) {
                // 1. Fill Header Data
                const h = result.header || result; // Fallback if header key is missing but fields are at root
                if (h.albaranId) setAlbaranId(String(h.albaranId));
                if (h.orderId) setOrderId(String(h.orderId));
                if (h.entryDate) setEntryDate(toDateTimeLocalInput(h.entryDate));
                if (h.truckPlate) setTruckPlate(String(h.truckPlate));
                if (h.carrier) setCarrier(String(h.carrier));
                if (h.driver) setDriver(String(h.driver));
                if (h.origin) setOrigin(String(h.origin));
                
                // 2. Fill Line Items (Pallet Groups)
                if (result.items && Array.isArray(result.items) && result.items.length > 0) {
                    const newGroups: PalletGroup[] = result.items.map((item: any) => {
                        const isProduct = item.type === 'product' || (item.description && item.description.toLowerCase().includes('vino'));
                        const qty = Number(item.quantity) || 0;
                        const pallets = Number(item.pallets) || 1;

                        // Simple estimation for products if boxes/bottles unknown: 
                        // If isProduct, we leave boxes/bottles as 0 for user to check, but we fill the lot/name.
                        
                        return {
                            id: generateUUID(),
                            type: isProduct ? 'product' : 'consumable',
                            
                            // Product Fields
                            productName: isProduct ? capitalizeWords(item.description) : '',
                            productLot: isProduct ? String(item.lot || '').toUpperCase() : '',
                            boxesPerPallet: 0, // User must verify/calculate
                            bottlesPerBox: 0, // User must verify/calculate
                            
                            // Consumable Fields
                            supplyId: '', // Will be matched by name or created as new
                            supplyName: !isProduct ? capitalizeWords(item.description) : '',
                            supplyLot: !isProduct ? String(item.lot || '').toUpperCase() : '',
                            supplyQuantity: !isProduct ? qty : 0,
                            supplyUnit: 'unidades',
                            supplyType: 'Contable',
                            
                            ean: '',
                            palletCount: pallets,
                            pallets: [], // Will be auto-generated by effect
                            isCollapsed: false
                        };
                    });
                    setPalletGroups(newGroups);

                    // Update total pallets count
                    const calculatedTotalPallets = newGroups.reduce((acc, g) => acc + g.palletCount, 0);
                    // Use header total if provided and larger (safe bet), otherwise calculated
                    setTotalPallets(Math.max(Number(h.totalPalletsHeader) || 0, calculatedTotalPallets));
                } else {
                    // If only header was found, just update the total pallets from header
                    if (h.totalPallets || h.totalPalletsHeader) setTotalPallets(Number(h.totalPallets || h.totalPalletsHeader) || 0);
                }
            }
        } catch (e: any) {
            setError(e.message || "Error al analizar la imagen del albarán.");
        } finally {
            setIsAnalyzingAlbaran(false);
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

        try {
            // 1. Identify and Create New Supplies if necessary
            const processedGroups = [...palletGroups];
            const createdSupplyMap = new Map<string, string>(); // Name -> ID

            for (let i = 0; i < processedGroups.length; i++) {
                const group = processedGroups[i];
                if (group.type === 'consumable' && group.supplyName && !group.supplyId) {
                    // Check if we already created this supply in this very session loop (e.g. 2 groups for same new item)
                    let newId = createdSupplyMap.get(group.supplyName);

                    if (!newId) {
                        // Check if it exists in existing supplies (fuzzy match case insensitive)
                        const existingSupply = supplies.find(s => s.name.toLowerCase() === group.supplyName.toLowerCase());
                        
                        if (existingSupply) {
                            newId = existingSupply.id;
                        } else {
                            // It's a truly new supply, create it
                            newId = await addNewSupply({
                                name: group.supplyName,
                                type: group.supplyType || 'Contable',
                                unit: group.supplyUnit || 'unidades',
                            });
                        }
                        createdSupplyMap.set(group.supplyName, newId);
                    }
                    
                    // Update the group with the new ID
                    processedGroups[i] = { ...group, supplyId: newId };
                }
            }

            // 2. Generate Pallets with correct IDs
            const allPallets = processedGroups.flatMap((g, groupIndex) => {
                 // Generate updated pallets for the group with the potential new ID
                 const palletsWithIds = Array.from({ length: g.palletCount }, (_, i) => {
                    const existingPallet = g.pallets[i] || {};
                    return {
                        ...existingPallet,
                        id: existingPallet.id || generateUUID(),
                        type: g.type,
                        product: g.type === 'product' ? { name: g.productName, lot: g.productLot } : undefined,
                        boxesPerPallet: g.type === 'product' ? g.boxesPerPallet : undefined,
                        bottlesPerBox: g.type === 'product' ? g.bottlesPerBox : undefined,
                        totalBottles: g.type === 'product' ? (g.boxesPerPallet * g.bottlesPerBox) : undefined,
                        supplyId: g.type === 'consumable' ? g.supplyId : undefined,
                        supplyName: g.type === 'consumable' ? g.supplyName : undefined,
                        supplyLot: g.type === 'consumable' ? g.supplyLot : undefined,
                        supplyQuantity: g.type === 'consumable' ? g.supplyQuantity : undefined,
                        eanBox: g.ean || undefined,
                        // Generate number if missing
                        palletNumber: existingPallet.palletNumber?.trim() 
                            ? existingPallet.palletNumber 
                            : `${albaranId.trim()}-G${groupIndex + 1}-P${i + 1}`
                    } as Pallet;
                 });
                 return palletsWithIds;
            });

            const finalStatus = status === 'incident' || allPallets.some(p => p.incident) ? 'incident' : 'verified';
            const incidentImagesBase64 = await Promise.all(incidentImages.map(fileToBase64));
            
            const albaranData: Albaran = {
                id: isEditing ? albaranId : albaranId.trim(),
                orderId: orderId.trim(), // Include Order ID
                entryDate, truckPlate, carrier, driver, origin,
                pallets: allPallets,
                status: finalStatus,
                incidentDetails: status === 'incident' ? incidentDetails : undefined,
                incidentImages: status === 'incident' ? incidentImagesBase64 : undefined,
            };

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
                {/* AI Extraction Section */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="flex-grow">
                            <h4 className="text-sm font-bold text-blue-800 mb-1">Autocompletar con IA</h4>
                            <p className="text-xs text-blue-600 mb-2">Sube una foto del albarán para rellenar cabecera y líneas automáticamente.</p>
                            {!isAIAvailable && <p className="text-xs text-red-600 font-bold">API KEY no configurada. La IA no funcionará.</p>}
                            <div className="flex items-center gap-2">
                                <input 
                                    type="file" 
                                    id="albaran-image-input" 
                                    accept="image/*" 
                                    onChange={handleAlbaranImageChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 disabled:opacity-50"
                                    disabled={!isAIAvailable || isAnalyzingAlbaran}
                                />
                                {albaranImageFile && (
                                    <Button 
                                        onClick={handleAnalyzeAlbaran} 
                                        disabled={isAnalyzingAlbaran || !isAIAvailable}
                                        className="whitespace-nowrap"
                                    >
                                        {isAnalyzingAlbaran ? <Spinner /> : 'Analizar Albarán Completo'}
                                    </Button>
                                )}
                            </div>
                        </div>
                        {albaranImagePreview && (
                            <div className="relative w-24 h-24 flex-shrink-0">
                                <img src={albaranImagePreview} alt="Albarán Preview" className="w-full h-full object-cover rounded border" />
                                <button onClick={removeAlbaranImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {!isEditing && <HeaderInput label="Nº Albarán de Entrada" id="albaranId" value={albaranId} onChange={e => setAlbaranId(e.target.value)} required errorField="albaranId" validationErrors={validationErrors}/>}
                    {isEditing && <div><label className="block text-sm font-medium text-gray-700">Nº Albarán de Entrada</label><p className="mt-1 block w-full sm:text-sm p-2 bg-gray-100 rounded-md">{albaranId}</p></div>}
                    <HeaderInput label="Nº Pedido" id="orderId" value={orderId} onChange={e => setOrderId(e.target.value)} validationErrors={validationErrors} />
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
                    <p className="text-sm text-gray-600 mb-4">
                        Define los productos o consumibles. Para un mismo artículo con lotes diferentes, añade un grupo para cada lote.
                    </p>
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
                <div className="flex items-center"><input type="checkbox" id="general-incident-check" checked={status === 'incident'} onChange={(e) => setStatus(e.target.checked ? 'incident' : 'verified')} className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500" /><label htmlFor="general-incident-check" className="ml-2 block text-sm text-gray-900">Reportar incidencia general para toda la entrada</label></div>
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
            supplyId: '', supplyName: '', supplyLot: '', supplyQuantity: 0, ean: ''
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
    
    // Logic for handling free-text supply input and creating new ones
    const handleSupplyNameChange = (name: string) => {
        const existing = supplies.find(s => s.name.toLowerCase() === name.toLowerCase());
        onUpdate(g => ({
            ...g,
            supplyName: name,
            supplyId: existing ? existing.id : '', // Clear ID if name is new
            supplyUnit: existing ? existing.unit : (g.supplyUnit || 'unidades'), // keep existing if set, else default
        }));
    };

    const totalUnits = group.type === 'product' 
        ? group.palletCount * group.boxesPerPallet * group.bottlesPerBox
        : group.palletCount * group.supplyQuantity;

    const toggleCollapse = () => onUpdate(g => ({ ...g, isCollapsed: !g.isCollapsed }));

    const isNewSupply = group.type === 'consumable' && group.supplyName && !group.supplyId;

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
                    </>
                ) : (
                    <>
                        <div className="sm:col-span-1">
                            <label className="text-xs font-medium text-gray-600">Artículo (Consumible)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    list="supply-list"
                                    placeholder="Buscar o Crear Nuevo"
                                    value={group.supplyName || ''}
                                    onChange={(e) => handleSupplyNameChange(e.target.value)}
                                    className={`w-full p-2 border rounded-md text-sm ${isNewSupply ? 'border-blue-400 ring-1 ring-blue-200' : ''}`}
                                />
                                <datalist id="supply-list">
                                    {supplies.map(s => <option key={s.id} value={s.name} />)}
                                </datalist>
                                {isNewSupply && <span className="absolute right-2 top-2 text-xs text-blue-600 font-bold">NUEVO</span>}
                            </div>
                        </div>
                        {isNewSupply && (
                            <>
                                <div className="sm:col-span-1">
                                    <label className="text-xs font-medium text-gray-600">Unidad (Nuevo)</label>
                                    <select value={group.supplyUnit || 'unidades'} onChange={e => handleFieldChange('supplyUnit', e.target.value)} className="w-full p-2 border rounded-md text-sm bg-blue-50">
                                        <option value="unidades">Unidades</option>
                                        <option value="cajas">Cajas</option>
                                        <option value="rollos">Rollos</option>
                                        <option value="metros">Metros</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="text-xs font-medium text-gray-600">Tipo (Nuevo)</label>
                                    <select value={group.supplyType || 'Contable'} onChange={e => handleFieldChange('supplyType', e.target.value)} className="w-full p-2 border rounded-md text-sm bg-blue-50">
                                        <option value="Contable">Contable</option>
                                        <option value="No Contable">No Contable</option>
                                    </select>
                                </div>
                            </>
                        )}

                         <div className="sm:col-span-1">
                             <label className="text-xs font-medium text-gray-600">Código EAN</label>
                             <input type="text" value={group.ean || ''} onChange={e => handleFieldChange('ean', e.target.value)} className="w-full p-2 border rounded-md text-sm" placeholder="Opcional"/>
                        </div>
                         <div className="sm:col-span-1">
                            <label className="text-xs font-medium text-gray-600">Lote</label>
                            <input type="text" value={group.supplyLot || ''} onChange={e => handleFieldChange('supplyLot', e.target.value.toUpperCase())} className="w-full p-2 border rounded-md text-sm"/>
                        </div>
                         <div className="sm:col-span-1">
                            <label className="text-xs font-medium text-gray-600">Cant. / Pallet</label>
                            <input 
                                type="number" 
                                value={group.supplyQuantity || ''} 
                                onChange={e => handleFieldChange('supplyQuantity', parseInt(e.target.value, 10) || 0)} 
                                min="0" 
                                className="w-full p-2 border rounded-md text-sm"
                                placeholder="Cant."
                            />
                        </div>
                    </>
                )}
                 <div className="sm:col-span-2 lg:col-span-2 flex items-end">
                    <p className="text-sm font-semibold text-gray-700 w-full text-right pr-2">Total Unidades para este Grupo: <span className="text-lg text-blue-600">{totalUnits.toLocaleString('es-ES')}</span></p>
                </div>
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
                                <PalletInput 
                                    pallet={p} 
                                    index={idx} 
                                    totalPallets={group.palletCount} 
                                    isCollapsed={false} 
                                    supplies={supplies} 
                                    updatePallet={(i, u) => {
                                        const newPallets = [...group.pallets];
                                        newPallets[i] = u(newPallets[i]);
                                        handleFieldChange('pallets', newPallets);
                                    }}
                                    onToggleCollapse={() => {}}
                                    onCopyToGroup={() => {
                                        // Simple copy to group logic for critical fields
                                        const source = p;
                                        const updatedPallets = group.pallets.map(target => ({
                                            ...target,
                                            boxesPerPallet: source.boxesPerPallet,
                                            bottlesPerBox: source.bottlesPerBox,
                                            totalBottles: (source.boxesPerPallet || 0) * (source.bottlesPerBox || 0),
                                            product: { ...target.product, lot: source.product?.lot || '' }
                                        }));
                                        handleFieldChange('pallets', updatedPallets);
                                        // Update group level defaults too
                                        handleFieldChange('boxesPerPallet', source.boxesPerPallet);
                                        handleFieldChange('bottlesPerBox', source.bottlesPerBox);
                                        handleFieldChange('productLot', source.product?.lot);
                                    }}
                                    validationErrors={[]} 
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
