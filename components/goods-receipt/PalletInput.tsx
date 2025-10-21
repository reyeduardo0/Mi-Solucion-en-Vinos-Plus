

import React, { useState, useMemo } from 'react';
import { Pallet } from '../../types';
import { fileToBase64, capitalizeWords } from '../../utils/helpers';
import { extractDataFromImage } from '../../services/geminiService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

interface PalletInputProps {
    pallet: Partial<Pallet>;
    index: number;
    totalPallets: number;
    isCollapsed: boolean;
    updatePallet: (index: number, data: Partial<Pallet>) => void; 
    onToggleCollapse: () => void;
    onCopyToOthers: () => void;
    isDuplicate: boolean;
}

// FIX: Modify icon component to accept a `title` prop and render it as a <title> element for accessibility and to fix the type error.
const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> = ({ title, ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

// FIX: Modify icon component to accept a `title` prop and render it as a <title> element for accessibility and to fix the type error.
const ExclamationIcon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> = ({ title, ...props }) => (
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5a1 1 0 102 0v-4a1 1 0 10-2 0v4zm1-8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
);

const PalletInput: React.FC<PalletInputProps> = ({ pallet, index, totalPallets, isCollapsed, updatePallet, onToggleCollapse, onCopyToOthers, isDuplicate }) => {
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
        updatePallet(index, { ...pallet, incident: { description: e.target.value, images: pallet.incident?.images || [] } });
    };
    
    const handlePalletIncidentImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            try {
                const imagesBase64 = await Promise.all(Array.from(e.target.files).map(fileToBase64));
                updatePallet(index, { ...pallet, incident: { description: pallet.incident?.description || '', images: imagesBase64 } });
            } catch (err) {
                setError("Failed to process incident images.");
            }
        }
    };

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
        setIsLoading(true); setError(null);
        try {
            const prompt = `From this pallet label, extract: SSCC, Product name ('Descripción'), Lot number ('Lote fabricación'), Bottles per box ('Botellas/caja'), Boxes per pallet ('Cajas/palet'), Total bottles per pallet ('Botellas/palet'), Bottle EAN ('EANBotella'), Box EAN ('EANCaja'), Pallet Number ('Nº Palet'). Return JSON with keys: sscc, productName, lot, bottlesPerBox, boxesPerPallet, totalBottles, eanBottle, eanBox, palletNumber. Ensure numeric values are numbers.`;
            const extractedData = await extractDataFromImage(palletImageFile, prompt);
            
            updatePallet(index, {
                ...pallet,
                palletNumber: extractedData.palletNumber != null ? String(extractedData.palletNumber) : pallet.palletNumber,
                sscc: extractedData.sscc || pallet.sscc,
                product: { name: extractedData.productName || pallet.product?.name || '', lot: extractedData.lot || pallet.product?.lot || '' },
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
                <button type="button" onClick={onToggleCollapse} className="text-gray-500 hover:text-gray-800 font-mono text-xl -mt-2">{isCollapsed ? '+' : '−'}</button>
            </div>
            {!isCollapsed && (
                 <div className="mt-4 space-y-4">
                     {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}
                     <div className="p-4 bg-gray-50 rounded-lg border">
                         <h4 className="font-semibold text-sm mb-2 text-gray-600">Extracción Automática por IA</h4>
                         {!isAIAvailable && (<div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 text-sm rounded-md mb-3"><p><strong>Función no disponible:</strong> La clave API de IA no está configurada.</p></div>)}
                        <p className="text-xs text-gray-500 mb-2">Sube una foto de la etiqueta del pallet para rellenar los datos.</p>
                        
                        {imagePreview && (<div className="my-2 relative w-32 h-32"><img src={imagePreview} alt={`Previsualización Pallet ${index + 1}`} className="rounded-md object-cover w-full h-full" /><button type="button" onClick={removeImage} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold hover:bg-red-700" aria-label="Eliminar imagen">&times;</button></div>)}

                        <input type="file" id={`pallet-image-input-${index}`} accept="image/*" onChange={handlePalletImageChange} className="mb-2 block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-100 file:text-yellow-700 hover:file:bg-yellow-200 disabled:opacity-50" disabled={!isAIAvailable} />
                        <Button type="button" onClick={processPalletImage} disabled={!palletImageFile || isLoading || !isAIAvailable}>{isLoading ? <Spinner /> : 'Extraer datos de etiqueta'}</Button>
                     </div>

                    <div className="relative my-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-sm font-medium text-gray-500">O introduce los datos manualmente</span></div></div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="text" placeholder="Nº Palet" value={pallet.palletNumber || ''} onChange={e => updatePallet(index, { ...pallet, palletNumber: e.target.value })} className={`block w-full rounded-md p-2 ${isDuplicate ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`} />
                        <input type="text" placeholder="SSCC" value={pallet.sscc || ''} onChange={e => updatePallet(index, { ...pallet, sscc: e.target.value })} className="block w-full border-gray-300 rounded-md p-2"/>
                        <input type="text" placeholder="Producto" value={pallet.product?.name || ''} onChange={e => updatePallet(index, { ...pallet, product: { name: capitalizeWords(e.target.value), lot: pallet.product?.lot || '' } })} className="block w-full border-gray-300 rounded-md p-2"/>
                        <input type="text" placeholder="Lote" value={pallet.product?.lot || ''} onChange={e => updatePallet(index, { ...pallet, product: { name: pallet.product?.name || '', lot: e.target.value } })} className="block w-full border-gray-300 rounded-md p-2"/>
                        <input type="number" placeholder="Cajas/pallet" value={pallet.boxesPerPallet || ''} onChange={e => updatePallet(index, { ...pallet, boxesPerPallet: parseInt(e.target.value,10) || 0 })} className="block w-full border-gray-300 rounded-md p-2"/>
                        <input type="number" placeholder="Botellas/caja" value={pallet.bottlesPerBox || ''} onChange={e => updatePallet(index, { ...pallet, bottlesPerBox: parseInt(e.target.value,10) || 0 })} className="block w-full border-gray-300 rounded-md p-2"/>
                    </div>
                     <div className="mt-4 flex justify-end"><Button type="button" variant="secondary" onClick={onCopyToOthers} title="Copia Producto, Lote, Cajas y Botellas a todos los otros pallets.">Copiar a los demás</Button></div>
                     <div className="flex items-center mt-4"><input type="checkbox" id={`incident-check-${index}`} checked={isIncident} onChange={handleIncidentToggle} className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"/><label htmlFor={`incident-check-${index}`} className="ml-2 block text-sm text-gray-900">Reportar incidencia en este pallet</label></div>
                     {isIncident && (<div className="p-4 border-l-4 border-yellow-400 bg-yellow-50"><textarea placeholder="Describe la incidencia del pallet..." value={incidentDescription} onChange={handleIncidentDescriptionChange} className="w-full border-gray-300 rounded-md p-2 mb-2"/><input type="file" multiple onChange={handlePalletIncidentImagesChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-100 file:text-yellow-700 hover:file:bg-yellow-200" /></div>)}
                </div>
            )}
        </Card>
    );
};

export default PalletInput;