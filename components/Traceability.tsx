
import React, { useState } from 'react';
import { WinePack, DispatchNote, ProductionReport } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import { formatDateTimeSafe, formatDateSafe } from '../utils/helpers';

// --- Icons ---
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const PackIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m0 0v10l8 4m0-14L4 7" /></svg>;
const ExitIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0L8 8m4-4v12" /></svg>;
const EmptyIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>;
const WineIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>;
const CubeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m0 0v10l8 4m0-14L4 7" /></svg>;

// --- Types ---
interface TraceIngredient {
    name: string;
    lot: string;
    type: 'wine' | 'supply';
    quantityUsed: number;
    origins: {
        albaranId: string;
        entryDate: string;
        carrier: string;
        palletNumber: string;
        originalQuantity: number;
    }[];
}

interface TraceabilityData {
    pack: WinePack;
    ingredients: TraceIngredient[];
    dispatch?: DispatchNote;
    productionReport?: ProductionReport; // Added to show Expedition Lot
}

const InfoPair: React.FC<{ label: string; value?: string | number; className?: string }> = ({ label, value, className = "" }) => (
    <div className={`mb-1 ${className}`}>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}:</span>
        <span className="ml-2 text-sm text-gray-900">{value || 'N/A'}</span>
    </div>
);

const Traceability: React.FC = () => {
    const { packs, albaranes, salidas, productionReports } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [searched, setSearched] = useState(false);
    const [traceData, setTraceData] = useState<TraceabilityData | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearched(true);
        const query = searchQuery.trim().toLowerCase();
        
        if (!query) { setTraceData(null); return; }

        let foundPack = packs.find(p => 
            p.id.toLowerCase().includes(query) || 
            p.orderId.toLowerCase().includes(query)
        );

        // If not found by Pack ID or Order ID, try searching by Expedition Lot in Production Reports
        let foundReport: ProductionReport | undefined;
        
        if (!foundPack) {
            foundReport = productionReports.find(r => 
                r.expeditionLot && r.expeditionLot.toLowerCase().includes(query)
            );
            
            if (foundReport) {
                foundPack = packs.find(p => p.id === foundReport!.packId);
            }
        } else {
            // If found by pack, try to find the associated report to show the lot
            foundReport = productionReports.find(r => r.packId === foundPack!.id);
        }

        if (!foundPack) { setTraceData(null); return; }

        // 2. Build Ingredients List (Backward Traceability)
        const ingredients: TraceIngredient[] = [];

        // 2a. Process Wines
        foundPack.contents.forEach(content => {
            ingredients.push({
                name: content.productName,
                lot: content.lot,
                type: 'wine',
                quantityUsed: content.quantity,
                origins: findOrigins(content.productName, content.lot, 'product')
            });
        });

        // 2b. Process Supplies
        if (foundPack.suppliesUsed) {
            foundPack.suppliesUsed.forEach(supply => {
                ingredients.push({
                    name: supply.name,
                    lot: 'N/A', // Supplies in packs often don't store lot in legacy data, but we search by name
                    type: 'supply',
                    quantityUsed: supply.quantity,
                    origins: findOrigins(supply.name, '', 'consumable') 
                });
            });
        }

        // 3. Find Dispatch (Forward Traceability)
        const dispatch = salidas.find(s => 
            (s.packIds && s.packIds.includes(foundPack!.id)) ||
            (s.dispatchDetails && s.dispatchDetails.some(d => d.type === 'pack' && d.id === foundPack!.id))
        );

        setTraceData({
            pack: foundPack,
            ingredients,
            dispatch,
            productionReport: foundReport
        });
    };

    // Helper to find origin Albaranes for a given item
    const findOrigins = (name: string, lot: string, type: 'product' | 'consumable') => {
        const matches: TraceIngredient['origins'] = [];
        
        albaranes.forEach(alb => {
            if (!alb.pallets) return;
            
            alb.pallets.forEach(p => {
                let isMatch = false;
                
                if (type === 'product' && p.type === 'product') {
                    // Strict match for products: Name AND Lot
                    if (p.product?.name === name && p.product?.lot === lot) {
                        isMatch = true;
                    }
                } else if (type === 'consumable' && p.type === 'consumable') {
                    // Loose match for supplies: Name only (unless lot is tracked strictly in future)
                    // Note: Supply names should be unique or well-managed
                    if (p.supplyName === name) {
                        isMatch = true;
                    }
                }

                if (isMatch) {
                    matches.push({
                        albaranId: alb.id,
                        entryDate: alb.entryDate,
                        carrier: alb.carrier,
                        palletNumber: p.palletNumber,
                        originalQuantity: type === 'product' ? (p.totalBottles || 0) : (p.supplyQuantity || 0)
                    });
                }
            });
        });
        
        return matches;
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Trazabilidad de Packs</h1>
            
            {/* Search Bar */}
            <Card className="mb-6 bg-blue-50 border border-blue-200">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-grow">
                        <label className="block text-xs font-bold text-blue-800 mb-1 ml-1 uppercase">Buscar Pack</label>
                        <input 
                            type="text" 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar por ID Pack, Nº Pedido o Lote de Expedición (ej: PTAM...)"
                            className="block w-full border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-end">
                        <Button type="submit" className="h-[46px] flex items-center justify-center w-full sm:w-auto">
                            <SearchIcon className="mr-2 h-5 w-5"/>
                            Buscar Trazabilidad
                        </Button>
                    </div>
                </form>
            </Card>
            
            {searched && !traceData && (
                <Card>
                    <div className="text-center py-12 flex flex-col items-center">
                        <EmptyIcon />
                        <h3 className="text-xl font-semibold text-gray-700 mt-4">No se encontró el Pack</h3>
                        <p className="text-gray-500 mt-2">No se encontraron datos para "{searchQuery}". Intenta con el ID exacto, Nº de Pedido o Lote de Expedición.</p>
                    </div>
                </Card>
            )}

            {traceData && (
                <div className="space-y-6">
                    {/* Status Banner */}
                    <div className={`p-4 rounded-lg border-l-8 shadow-sm flex justify-between items-center ${traceData.dispatch ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}`}>
                        <div>
                            <h2 className={`text-lg font-bold ${traceData.dispatch ? 'text-green-800' : 'text-yellow-800'}`}>
                                {traceData.dispatch ? 'PACK EXPEDIDO / DESPACHADO' : 'PACK EN STOCK / PENDIENTE'}
                            </h2>
                            <p className="text-sm text-gray-600">
                                {traceData.dispatch 
                                    ? `Este pack salió de las instalaciones el ${formatDateSafe(traceData.dispatch.dispatchDate)}.` 
                                    : 'Este pack se encuentra actualmente en inventario.'}
                            </p>
                        </div>
                        {traceData.dispatch ? <ExitIcon className="h-10 w-10 text-green-300"/> : <PackIcon className="h-10 w-10 text-yellow-300"/>}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 1. Backward Trace: Components & Origins */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card title="Composición y Origen (Entradas)">
                                <div className="space-y-6 relative">
                                    <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200"></div>
                                    {traceData.ingredients.map((ing, idx) => (
                                        <div key={idx} className="relative pl-10">
                                            <div className={`absolute left-0 p-1.5 rounded-full border-2 border-white shadow-sm ${ing.type === 'wine' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {ing.type === 'wine' ? <WineIcon className="h-5 w-5"/> : <CubeIcon className="h-5 w-5"/>}
                                            </div>
                                            <div className="bg-white border rounded-md p-3 shadow-sm hover:shadow-md transition-shadow">
                                                <p className="font-bold text-gray-800 text-sm">{ing.name}</p>
                                                <p className="text-xs text-gray-500 mb-2">Lote usado: <span className="font-mono bg-gray-100 px-1 rounded">{ing.lot}</span></p>
                                                
                                                {ing.origins.length > 0 ? (
                                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Recibido en:</p>
                                                        {ing.origins.map((origin, oIdx) => (
                                                            <div key={oIdx} className="mb-1 last:mb-0 text-xs text-gray-600 bg-gray-50 p-1.5 rounded">
                                                                <div className="flex justify-between">
                                                                    <span className="font-semibold text-blue-600">{origin.albaranId}</span>
                                                                    <span>{formatDateSafe(origin.entryDate)}</span>
                                                                </div>
                                                                <div>Prov: {origin.carrier}</div>
                                                                {origin.palletNumber && <div>Pallet: {origin.palletNumber}</div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-red-400 italic mt-2">Origen no encontrado en historial.</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* 2. Central Node: The Pack */}
                        <div className="lg:col-span-1">
                            <Card title="Detalle de Producción (Pack)" className="h-full border-t-4 border-t-brand-yellow">
                                <div className="flex justify-center my-6">
                                    <div className="bg-brand-yellow p-4 rounded-full shadow-lg">
                                        <PackIcon className="h-16 w-16 text-brand-dark"/>
                                    </div>
                                </div>
                                <div className="space-y-4 px-2">
                                    <InfoPair label="ID Sistema" value={traceData.pack.id} className="border-b pb-2"/>
                                    <InfoPair label="Nº Pedido / Lanzamiento" value={traceData.pack.orderId} className="border-b pb-2"/>
                                    
                                    {/* Lote de Expedición */}
                                    <div className="mb-1 border-b pb-2">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lote Expedición:</span>
                                        {traceData.productionReport?.expeditionLot ? (
                                            <span className="ml-2 text-sm font-bold text-blue-600 font-mono">{traceData.productionReport.expeditionLot}</span>
                                        ) : (
                                            <span className="ml-2 text-sm text-gray-400 italic">No asignado</span>
                                        )}
                                    </div>

                                    <InfoPair label="Modelo de Pack" value={traceData.pack.modelName} className="border-b pb-2"/>
                                    <InfoPair label="Fecha Producción" value={formatDateTimeSafe(traceData.pack.creationDate)} className="border-b pb-2"/>
                                    <InfoPair label="Cantidad Producida" value={traceData.pack.quantity} className="border-b pb-2"/>
                                    <InfoPair label="Estado Actual" value={traceData.pack.status}/>
                                </div>
                            </Card>
                        </div>

                        {/* 3. Forward Trace: Dispatch */}
                        <div className="lg:col-span-1">
                            {traceData.dispatch ? (
                                <Card title="Destino (Salida)" className="h-full border-t-4 border-t-green-500">
                                    <div className="flex justify-center my-6">
                                        <div className="bg-green-100 p-4 rounded-full shadow-lg">
                                            <ExitIcon className="h-16 w-16 text-green-600"/>
                                        </div>
                                    </div>
                                    <div className="space-y-4 px-2">
                                        <InfoPair label="Nº Albarán Salida" value={traceData.dispatch.dispatchNoteId} className="border-b pb-2"/>
                                        <InfoPair label="Fecha Salida" value={formatDateTimeSafe(traceData.dispatch.dispatchDate)} className="border-b pb-2"/>
                                        <InfoPair label="Cliente" value={traceData.dispatch.customer} className="border-b pb-2"/>
                                        <InfoPair label="Destino" value={traceData.dispatch.destination} className="border-b pb-2"/>
                                        <InfoPair label="Transportista" value={traceData.dispatch.carrier} className="border-b pb-2"/>
                                        <InfoPair label="Matrícula" value={traceData.dispatch.truckPlate || '-'} className="border-b pb-2"/>
                                        <InfoPair label="Conductor" value={traceData.dispatch.driver || '-'}/>
                                    </div>
                                </Card>
                            ) : (
                                <Card title="Destino (Salida)" className="h-full border-t-4 border-t-gray-300 bg-gray-50">
                                    <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                                        <ExitIcon className="h-16 w-16 mb-4 opacity-50"/>
                                        <p className="font-semibold">No expedido</p>
                                        <p className="text-sm text-center px-6 mt-2">Este pack aún no ha sido asociado a ninguna orden de salida.</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Traceability;
