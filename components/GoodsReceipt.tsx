
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Albaran, Pallet } from '../types';
import { extractDataFromImage } from '../services/geminiService';
import { useData } from '../context/DataContext';
import { toDateTimeLocalInput, fileToBase64, capitalizeWords } from '../utils/helpers';
import Spinner from './ui/Spinner';
import Button from './ui/Button';
import Card from './ui/Card';
import PalletInput from './goods-receipt/PalletInput';


const GoodsReceipt: React.FC = () => {
  const navigate = useNavigate();
  const { albaranId: paramId } = useParams<{ albaranId: string }>();
  const isEditMode = !!paramId;

  const { albaranes, addAlbaran, updateAlbaran, loadingData } = useData();
  
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
      } else if(!loadingData) { // Avoid navigation while context is still loading
        console.error(`Albaran with ID ${paramId} not found.`);
        navigate('/entradas');
      }
    }
  }, [isEditMode, albaranes, paramId, initialDataLoaded, navigate, loadingData]);
  
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
             handleNumberOfPalletsChange({ target: { value: String(data.numberOfPallets) } } as any);
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
        const firstInvalidPalletIndex = pallets.findIndex(p => !p.product?.name?.trim() || !p.product?.lot?.trim());
        if (firstInvalidPalletIndex !== -1) {
            setPalletsCollapsed(current => {
                const newCollapsed = [...current];
                if (newCollapsed[firstInvalidPalletIndex]) {
                    newCollapsed[firstInvalidPalletIndex] = false;
                    return newCollapsed;
                }
                return current;
            });
            throw new Error(`Por favor, complete el nombre del Producto y el Lote para el Pallet ${firstInvalidPalletIndex + 1}.`);
        }
        
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

        if (isEditMode) {
            await updateAlbaran(finalAlbaran);
        } else {
            await addAlbaran(finalAlbaran);
        }
        navigate('/entradas');
    } catch (error: any) {
        console.error("Fallo al registrar la entrada:", error);
        alert(`Ocurrió un error al guardar la entrada. Por favor, inténtelo de nuevo.\n\nError: ${error.message}`);
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
            if (index === sourceIndex) return pallet;
            return { ...pallet, ...dataToCopy, totalBottles };
        })
    );
  };

  const palletNumbers = pallets.map(p => p.palletNumber).filter(Boolean);
  const duplicatePalletNumbers = new Set(palletNumbers.filter((num, index) => String(num).trim() !== '' && palletNumbers.indexOf(num) !== index));

  if ((isEditMode && !initialDataLoaded) || loadingData) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">{isEditMode ? 'Editar Entrada' : 'Registrar Nueva Entrada'}</h1>
            <Button onClick={() => navigate('/entradas')} variant="secondary">Volver a la Lista</Button>
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
                        <input type="file" accept="image/*" onChange={handleAlbaranImageChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 disabled:opacity-50" disabled={!isAIAvailable} />
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
                    <div className="md:col-span-1 lg:col-span-1"><label className="block text-sm font-medium">Estado de la Entrada</label><select value={status} onChange={e => setStatus(e.target.value as any)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value="Correcto">Correcto</option><option value="Incidencia">Incidencia</option></select></div>
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
                        <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Detalles de los Pallets</h2><div className="space-x-2"><Button type="button" variant="secondary" onClick={expandAllPallets}>Expandir Todos</Button><Button type="button" variant="secondary" onClick={collapseAllPallets}>Contraer Todos</Button></div></div>
                        {pallets.map((p, i) => <PalletInput key={p.id || `pallet-${i}`} pallet={p} index={i} totalPallets={numberOfPallets} updatePallet={updatePalletData} isCollapsed={palletsCollapsed[i]} onToggleCollapse={() => togglePalletCollapse(i)} onCopyToOthers={() => handleCopyToOthers(i)} isDuplicate={String(p.palletNumber || '').trim() !== '' && duplicatePalletNumbers.has(p.palletNumber!)} />)}
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
