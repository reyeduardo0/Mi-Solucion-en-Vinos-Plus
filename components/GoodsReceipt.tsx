import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Albaran, Pallet } from '../types';
import { extractDataFromImage } from '../services/geminiService';
import Spinner from './ui/Spinner';
import Button from './ui/Button';
import Card from './ui/Card';

interface GoodsReceiptProps {
  onAddAlbaran: (albaran: Albaran) => Promise<void>;
  onUpdateAlbaran?: (albaran: Albaran) => Promise<void>;
  albaranes?: Albaran[];
}

const toDateTimeLocalInput = (dateString?: string | null): string => {
    const date = dateString ? new Date(dateString) : new Date();
    if (isNaN(date.getTime())) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    }
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });

const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const PalletInput: React.FC<{ 
    pallet: Partial<Pallet>;
    index: number;
    totalPallets: number;
    isCollapsed: boolean;
    updatePallet: (index: number, data: Partial<Pallet>) => void; 
    onToggleCollapse: () => void;
    onCopyToOthers: () => void;
    isDuplicate: boolean;
}> = ({ pallet, index, totalPallets, isCollapsed, updatePallet, onToggleCollapse, onCopyToOthers, isDuplicate }) => {
    const [palletImageFile, setPalletImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const isAIAvailable = useMemo(() => !!process.env.API_KEY, []);

    const isIncident = pallet.incident !== undefined;
    const incidentDescription = pallet.incident?.description || '';

    const handleIncidentToggle = () => {
        if (isIncident) {
            const { incident, ...rest } = pallet;
            updatePallet(index, { ...rest, incident: undefined });
        } else {
            updatePallet(index, { ...pallet, incident: { description: '', images: [] } });
        }
    };

    const handleIncidentDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updatePallet(index, { 
            ...pallet,
            incident: { 
                description: e.target.value, 
                images: pallet.incident?.images || [] 
            } 
        });
    };
    
    const handlePalletIncidentImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            try {
                const imagesBase64 = await Promise.all(files.map(fileToBase64));
                updatePallet(index, {
                    ...pallet,
                    incident: {
                        description: pallet.incident?.description || '',
                        images: imagesBase64,
                    }
                });
            } catch (err) {
                console.error("Error processing pallet incident images:", err);
                setError("Failed to process incident images.");
            }
        }
    };

    const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
    );
    
    const ExclamationIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5a1 1 0 102 0v-4a1 1 0 10-2 0v4zm1-8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
    );

    const handlePalletImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPalletImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    const removeImage = () => {
        setPalletImageFile(null);
        setImagePreview(null);
        const input = document.getElementById(`pallet-image-input-${index}`) as HTMLInputElement;
        if (input) input.value = '';
    }

    const processPalletImage = async () => {
        if (!palletImageFile) return;
        setIsLoading(true);
        setError(null);
        try {
            const prompt = `From this pallet label, extract the following fields: 
            - SSCC code ('SSCC')
            - Product name ('Descripción')
            - Lot number ('Lote fabricación')
            - Bottles per box ('Botellas/caja')
            - Boxes per pallet ('Cajas/palet')
            - Total bottles per pallet ('Botellas/palet')
            - Bottle EAN ('EANBotella')
            - Box EAN ('EANCaja')
            - Pallet Number ('Nº Palet')
            Return the result as a JSON object with keys: sscc, productName, lot, bottlesPerBox, boxesPerPallet, totalBottles, eanBottle, eanBox, palletNumber. If a field is not found, use an empty string or 0 for numeric values. Ensure numeric values are returned as numbers, not strings.`;
            const extractedData = await extractDataFromImage(palletImageFile, prompt);
            
            updatePallet(index, {
                ...pallet,
                palletNumber: extractedData.palletNumber != null ? String(extractedData.palletNumber) : pallet.palletNumber,
                sscc: extractedData.sscc || pallet.sscc,
                product: { 
                    name: extractedData.productName || pallet.product?.name || '', 
                    lot: extractedData.lot || pallet.product?.lot || '' 
                },
                bottlesPerBox: extractedData.bottlesPerBox || pallet.bottlesPerBox,
                boxesPerPallet: extractedData.boxesPerPallet || pallet.boxesPerPallet,
                totalBottles: extractedData.totalBottles || pallet.totalBottles,
                eanBottle: extractedData.eanBottle || pallet.eanBottle,
                eanBox: extractedData.eanBox || pallet.eanBox,
            });

        } catch (e: any) {
            setError(e.message || "Failed to process pallet image.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const cardTitle = `Datos del Pallet ${index + 1} de ${totalPallets}${pallet.palletNumber ? ` (Nº ${pallet.palletNumber})` : ''}`;
    const isComplete = pallet.palletNumber && pallet.product?.name;

    return (
        <Card className="mb-4 border border-gray-200">
             <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                    <h3 className="text-base font-semibold text-gray-800">{cardTitle}</h3>
                    {isComplete && !isDuplicate && <CheckCircleIcon className="ml-2 h-5 w-5 text-green-500" title="Datos completos"/>}
                    {isDuplicate && <ExclamationIcon className="ml-2 h-5 w-5 text-red-500" title="Número de pallet duplicado"/>}
                </div>
                <button type="button" onClick={onToggleCollapse} className="text-gray-500 hover:text-gray-800 font-mono text-xl -mt-2">
                    {isCollapsed ? '+' : '−'}
                </button>
            </div>
            {!isCollapsed && (
                 <div className="mt-4 space-y-4">
                     {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}
                     <div className="p-4 bg-gray-50 rounded-lg border">
                         <h4 className="font-semibold text-sm mb-2 text-gray-600">Extracción Automática por IA</h4>
                         {!isAIAvailable && (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 text-sm rounded-md mb-3">
                                <p><strong>Función no disponible:</strong> La clave API de IA no está configurada.</p>
                            </div>
                         )}
                        <p className="text-xs text-gray-500 mb-2">Sube una foto de la etiqueta del pallet para rellenar los datos.</p>
                        
                        {imagePreview && (
                            <div className="my-2 relative w-32 h-32">
                                <img src={imagePreview} alt={`Previsualización Pallet ${index + 1}`} className="rounded-md object-cover w-full h-full" />
                                <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold hover:bg-red-700 transition-colors" aria-label="Eliminar imagen">&times;</button>
                            </div>
                        )}

                        <input type="file" id={`pallet-image-input-${index}`} accept="image/*" onChange={handlePalletImageChange} className="mb-2 block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-100 file:text-yellow-700 hover:file:bg-yellow-200 disabled:opacity-50" disabled={!isAIAvailable} />
                        <Button type="button" onClick={processPalletImage} disabled={!palletImageFile || isLoading || !isAIAvailable}>
                            {isLoading ? <Spinner /> : 'Extraer datos de etiqueta'}
                        </Button>
                     </div>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-3 text-sm font-medium text-gray-500">
                                O introduce los datos manualmente
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <input 
                                type="text" 
                                placeholder="Nº Palet" 
                                value={pallet.palletNumber || ''} 
                                onChange={e => updatePallet(index, { ...pallet, palletNumber: e.target.value })} 
                                className={`block w-full rounded-md p-2 ${isDuplicate ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`}
                                aria-invalid={isDuplicate}
                                aria-describedby={isDuplicate ? `pallet-error-${index}` : undefined}
                            />
                            {isDuplicate && <p id={`pallet-error-${index}`} className="mt-1 text-xs text-red-600">Este número de pallet ya ha sido introducido.</p>}
                        </div>
                        <input type="text" placeholder="SSCC" value={pallet.sscc || ''} onChange={e => updatePallet(index, { ...pallet, sscc: e.target.value })} className="block w-full border-gray-300 rounded-md p-2"/>
                        <input type="text" placeholder="Producto" value={pallet.product?.name || ''} onChange={e => updatePallet(index, { ...pallet, product: { name: capitalizeWords(e.target.value), lot: pallet.product?.lot || '' } })} className="block w-full border-gray-300 rounded-md p-2"/>
                        <input type="text" placeholder="Lote" value={pallet.product?.lot || ''} onChange={e => updatePallet(index, { ...pallet, product: { name: pallet.product?.name || '', lot: e.target.value } })} className="block w-full border-gray-300 rounded-md p-2"/>
                        <input type="number" placeholder="Cajas/pallet" value={pallet.boxesPerPallet || ''} onChange={e => updatePallet(index, { ...pallet, boxesPerPallet: parseInt(e.target.value,10) || 0 })} className="block w-full border-gray-300 rounded-md p-2"/>
                        <input type="number" placeholder="Botellas/caja" value={pallet.bottlesPerBox || ''} onChange={e => updatePallet(index, { ...pallet, bottlesPerBox: parseInt(e.target.value,10) || 0 })} className="block w-full border-gray-300 rounded-md p-2"/>
                    </div>
                     <div className="mt-4 flex justify-end">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={onCopyToOthers}
                            title="Copia Producto, Lote, Cajas y Botellas a todos los otros pallets."
                        >
                            Copiar a los demás
                        </Button>
                    </div>
                     <div className="flex items-center mt-4">
                         <input type="checkbox" id={`incident-check-${index}`} checked={isIncident} onChange={handleIncidentToggle} className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"/>
                         <label htmlFor={`incident-check-${index}`} className="ml-2 block text-sm text-gray-900">Reportar incidencia en este pallet</label>
                     </div>
                     {isIncident && (
                         <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50">
                             <textarea placeholder="Describe la incidencia del pallet..." value={incidentDescription} onChange={handleIncidentDescriptionChange} className="w-full border-gray-300 rounded-md p-2 mb-2"/>
                             <input type="file" multiple onChange={handlePalletIncidentImagesChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-100 file:text-yellow-700 hover:file:bg-yellow-200" />
                         </div>
                     )}
                </div>
            )}
        </Card>
    );
};


const GoodsReceipt: React.FC<GoodsReceiptProps> = ({ onAddAlbaran, onUpdateAlbaran, albaranes }) => {
  const navigate = useNavigate();
  const { albaranId: paramId } = useParams<{ albaranId: string }>();
  const isEditMode = !!paramId;
  
  const isAIAvailable = useMemo(() => !!process.env.API_KEY, []);

  const [albaranId, setAlbaranId] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [carrier, setCarrier] = useState('');
  const [driver, setDriver] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [entryDate, setEntryDate] = useState(toDateTimeLocalInput());
  const [numberOfPallets, setNumberOfPallets] = useState(0);
  const [status, setStatus] = useState<'Correcto' | 'Incidencia'>('Correcto');
  const [incidentDetails, setIncidentDetails] = useState('');
  const [incidentImages, setIncidentImages] = useState<File[]>([]);
  const [pallets, setPallets] = useState<Partial<Pallet>[]>([]);
  const [palletsCollapsed, setPalletsCollapsed] = useState<boolean[]>([]);

  const [albaranImageFile, setAlbaranImageFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  useEffect(() => {
    if (isEditMode && albaranes && !initialDataLoaded) {
      const albaranToEdit = albaranes.find(a => a.id === paramId);
      if (albaranToEdit) {
        setAlbaranId(albaranToEdit.id);
        setTruckPlate(albaranToEdit.truckPlate);
        setCarrier(albaranToEdit.carrier);
        setDriver(albaranToEdit.driver || '');
        setOrigin(albaranToEdit.origin || '');
        setDestination(albaranToEdit.destination || '');
        setEntryDate(toDateTimeLocalInput(albaranToEdit.entryDate));
        setNumberOfPallets(albaranToEdit.pallets.length);
        setPallets(albaranToEdit.pallets);
        setStatus(albaranToEdit.status === 'incident' ? 'Incidencia' : 'Correcto');
        setIncidentDetails(albaranToEdit.incidentDetails || '');
        setPalletsCollapsed(Array(albaranToEdit.pallets.length).fill(true).map((_, i) => i === 0 ? false : true));
        setInitialDataLoaded(true);
      } else {
        console.error(`Albaran with ID ${paramId} not found.`);
        navigate('/entradas');
      }
    }
  }, [isEditMode, albaranes, paramId, initialDataLoaded, navigate]);
  
  const handleNumberOfPalletsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10) || 0;
    setNumberOfPallets(num);
    
    setPallets(currentPallets => {
      if (num === currentPallets.length) return currentPallets;

      const newPallets = Array.from({ length: num }, (_, i) => 
        currentPallets[i] || { id: `new-pallet-${Date.now()}-${i}`, product: { name: '', lot: '' } }
      );
      
      setPalletsCollapsed(Array.from({ length: num }, (_, i) => i === 0 ? false : true));
      return newPallets;
    });
  };

  const handleAlbaranImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setAlbaranImageFile(e.target.files[0]);
        setExtractionError(null);
    }
  };

  const handleAlbaranImageExtraction = async () => {
    if (!albaranImageFile) return;
    setIsExtracting(true);
    setExtractionError(null);
    try {
        const prompt = `From the provided delivery note image (albarán), extract the following fields:
        - Delivery Note ID/Number ('Nº Albarán')
        - Truck Plate ('Matrícula Camión')
        - Carrier/Transport Company ('Transportista')
        - Driver's Name ('Conductor')
        - Total number of pallets ('Número de Palets')
        Return the result as a single JSON object with keys: "albaranId", "truckPlate", "carrier", "driver", "numberOfPallets". If a field is not found, use an empty string "" for text fields or 0 for numeric fields. Ensure 'numberOfPallets' is a number.`;
        
        const data = await extractDataFromImage(albaranImageFile, prompt);

        if (data.albaranId) setAlbaranId(data.albaranId.toUpperCase());
        if (data.truckPlate) setTruckPlate(data.truckPlate.toUpperCase());
        if (data.carrier) setCarrier(capitalizeWords(data.carrier));
        if (data.driver) setDriver(capitalizeWords(data.driver));
        if (typeof data.numberOfPallets === 'number' && !isNaN(data.numberOfPallets)) {
            setNumberOfPallets(data.numberOfPallets);
        }

    } catch (e: any) {
        setExtractionError(e.message || "Failed to process the delivery note image.");
    } finally {
        setIsExtracting(false);
    }
  };


  const updatePalletData = (index: number, data: Partial<Pallet>) => {
    const updatedPallets = [...pallets];
    updatedPallets[index] = { ...updatedPallets[index], ...data };
    setPallets(updatedPallets);
  };
  
    const handleIncidentImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setIncidentImages(Array.from(e.target.files));
        }
    };

  const handleRegister = async () => {
    setIsSubmitting(true);
    try {
        // --- Data Validation ---
        const firstInvalidPalletIndex = pallets.findIndex(p => !p.product?.name?.trim() || !p.product?.lot?.trim());
        if (firstInvalidPalletIndex !== -1) {
            // Set state to expand the invalid pallet before throwing.
            setPalletsCollapsed(current => {
                const newCollapsed = [...current];
                if (newCollapsed[firstInvalidPalletIndex]) { // Only change state if needed
                    newCollapsed[firstInvalidPalletIndex] = false;
                    return newCollapsed;
                }
                return current;
            });
            throw new Error(`Por favor, complete el nombre del Producto y el Lote para el Pallet ${firstInvalidPalletIndex + 1}.`);
        }
        
        // --- Data Preparation & API Call ---
        const hasPalletIncident = pallets.some(p => p.incident);
        let incidentImagesBase64: string[] | undefined = undefined;
        if (status === 'Incidencia' && incidentImages.length > 0) {
            incidentImagesBase64 = await Promise.all(incidentImages.map(fileToBase64));
        }

        const finalAlbaran: Albaran = {
          id: albaranId,
          entryDate: new Date(entryDate).toISOString(),
          truckPlate,
          carrier,
          driver,
          origin: origin || undefined,
          destination: destination || undefined,
          status: status === 'Incidencia' || hasPalletIncident ? 'incident' : 'verified',
          pallets: pallets as Pallet[],
          incidentDetails: status === 'Incidencia' ? incidentDetails : undefined,
          incidentImages: incidentImagesBase64,
        };

        if (isEditMode && onUpdateAlbaran) {
            await onUpdateAlbaran(finalAlbaran);
        } else {
            await onAddAlbaran(finalAlbaran);
        }
    } catch (error) {
        console.error("Fallo al registrar la entrada:", error);

        let errorMessage = "Ocurrió un error inesperado.";
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (error && typeof error === 'object' && 'message' in error) {
            const msg = (error as { message: unknown }).message;
            errorMessage = typeof msg === 'string' ? msg : JSON.stringify(msg);
        } else {
            errorMessage = String(error);
        }
        
        alert(`Ocurrió un error al guardar la entrada. Por favor, inténtelo de nuevo.\n\nError: ${errorMessage}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const togglePalletCollapse = (index: number) => {
    setPalletsCollapsed(current => {
        const newCollapsed = [...current];
        newCollapsed[index] = !newCollapsed[index];
        return newCollapsed;
    });
  };

  const expandAllPallets = () => setPalletsCollapsed(Array(numberOfPallets).fill(false));
  const collapseAllPallets = () => setPalletsCollapsed(Array(numberOfPallets).fill(true));

  const handleCopyToOthers = (sourceIndex: number) => {
    const sourcePallet = pallets[sourceIndex];
    if (!sourcePallet) return;

    const dataToCopy = {
        product: sourcePallet.product ? { ...sourcePallet.product } : { name: '', lot: '' },
        boxesPerPallet: sourcePallet.boxesPerPallet,
        bottlesPerBox: sourcePallet.bottlesPerBox,
    };
    
    const totalBottles = (dataToCopy.boxesPerPallet || 0) * (dataToCopy.bottlesPerBox || 0);

    setPallets(currentPallets => 
        currentPallets.map((pallet, index) => {
            if (index === sourceIndex) {
                return pallet;
            }
            return {
                ...pallet,
                product: { ...dataToCopy.product },
                boxesPerPallet: dataToCopy.boxesPerPallet,
                bottlesPerBox: dataToCopy.bottlesPerBox,
                totalBottles: totalBottles,
            };
        })
    );
  };

  const palletNumbers = pallets.map(p => p.palletNumber).filter(Boolean);
  const duplicatePalletNumbers = new Set(palletNumbers.filter((num, index) => String(num).trim() !== '' && palletNumbers.indexOf(num) !== index));

  if (isEditMode && !initialDataLoaded) {
    return (
      <div className="p-8 flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">{isEditMode ? 'Editar Entrada' : 'Registrar Nueva Entrada'}</h1>
            <Button onClick={() => navigate('/entradas')} variant="secondary">
                Volver a la Lista
            </Button>
        </div>

        <Card>
            <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
                <Card className="mb-6 border-brand-yellow border-2 bg-yellow-50">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Extracción Automática por IA</h3>
                    <p className="text-sm text-gray-600 mb-4">Sube una foto del albarán para que la IA extraiga los datos principales.</p>
                    
                    {!isAIAvailable && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                           La variable de entorno API_KEY no está configurada. Las funciones de IA están desactivadas.
                        </div>
                    )}
                    {extractionError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{extractionError}</div>}
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleAlbaranImageChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 disabled:opacity-50"
                            disabled={!isAIAvailable}
                        />
                        <Button type="button" className="w-full sm:w-auto" onClick={handleAlbaranImageExtraction} disabled={!albaranImageFile || isExtracting || !isAIAvailable}>
                            {isExtracting ? <Spinner /> : 'Procesar Albarán'}
                        </Button>
                    </div>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    <div><label className="block text-sm font-medium">Nº Albarán</label><input type="text" value={albaranId} onChange={e => setAlbaranId(e.target.value.toUpperCase())} required disabled={isEditMode} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100 disabled:cursor-not-allowed" /></div>
                    <div><label className="block text-sm font-medium">Matrícula Camión</label><input type="text" value={truckPlate} onChange={e => setTruckPlate(e.target.value.toUpperCase())} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                    <div><label className="block text-sm font-medium">Transportista</label><input type="text" value={carrier} onChange={e => setCarrier(capitalizeWords(e.target.value))} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                    <div><label className="block text-sm font-medium">Conductor</label><input type="text" value={driver} onChange={e => setDriver(capitalizeWords(e.target.value))} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                    <div><label className="block text-sm font-medium">Origen (Opcional)</label><input type="text" value={origin} onChange={e => setOrigin(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                    <div><label className="block text-sm font-medium">Destino (Opcional)</label><input type="text" value={destination} onChange={e => setDestination(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                    <div className="md:col-span-1 lg:col-span-1"><label className="block text-sm font-medium">Fecha y Hora</label><input type="datetime-local" value={entryDate} onChange={e => setEntryDate(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                    <div className="md:col-span-1 lg:col-span-1"><label className="block text-sm font-medium">Número de Palets</label><input type="number" min="0" value={numberOfPallets} onChange={handleNumberOfPalletsChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                    <div className="md:col-span-1 lg:col-span-1"><label className="block text-sm font-medium">Estado de la Entrada</label>
                        <select value={status} onChange={e => setStatus(e.target.value as any)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2">
                            <option value="Correcto">Correcto</option>
                            <option value="Incidencia">Incidencia</option>
                        </select>
                    </div>
                </div>

                {status === 'Incidencia' && (
                    <div className="mt-6 p-4 border-l-4 border-yellow-400 bg-yellow-50">
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Detalles de la Incidencia General</h3>
                        <div><label className="block text-sm font-medium text-gray-700">Describa el problema...</label><textarea value={incidentDetails} onChange={e => setIncidentDetails(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"></textarea></div>
                        <div className="mt-2"><label className="block text-sm font-medium text-gray-700">Adjuntar Imágenes</label><input type="file" multiple onChange={handleIncidentImagesChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-100 file:text-yellow-800 hover:file:bg-yellow-200" /></div>
                    </div>
                )}
                
                {numberOfPallets > 0 && (
                    <div className="mt-8 pt-6 border-t">
                        <div className="flex justify-between items-center mb-4">
                           <h2 className="text-xl font-bold text-gray-800">Detalles de los Pallets</h2>
                           <div className="space-x-2">
                                <Button type="button" variant="secondary" onClick={expandAllPallets}>Expandir Todos</Button>
                                <Button type="button" variant="secondary" onClick={collapseAllPallets}>Contraer Todos</Button>
                           </div>
                        </div>
                        {pallets.map((p, i) => {
                            const palletNumber = p.palletNumber || '';
                            const isDuplicate = String(palletNumber).trim() !== '' && duplicatePalletNumbers.has(palletNumber);
                            return (
                                <PalletInput 
                                    key={p.id || `pallet-${i}`} 
                                    pallet={p} 
                                    index={i} 
                                    totalPallets={numberOfPallets} 
                                    updatePallet={updatePalletData}
                                    isCollapsed={palletsCollapsed[i]}
                                    onToggleCollapse={() => togglePalletCollapse(i)}
                                    onCopyToOthers={() => handleCopyToOthers(i)} 
                                    isDuplicate={isDuplicate}
                                />
                            );
                        })}
                    </div>
                )}

                <div className="mt-8 flex justify-end space-x-3">
                    <Button type="button" variant="secondary" onClick={() => navigate('/entradas')}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner /> : (isEditMode ? 'Actualizar Entrada' : 'Registrar Entrada')}
                    </Button>
                </div>
            </form>
        </Card>
    </div>
  );
};

export default GoodsReceipt;