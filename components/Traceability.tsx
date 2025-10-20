import React, { useState, useMemo } from 'react';
import { WinePack, Albaran, DispatchNote, Pallet } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';

// --- Icons ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const EntryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const PackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m0 0v10l8 4m0-14L4 7" /></svg>;
const ExitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const EmptyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>;

const formatDateTimeSafe = (dateString?: string): string => {
    if (!dateString) return 'Fecha inválida';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};

// --- Helper Types ---
interface TraceabilityData {
    pack: WinePack;
    sourcePallet?: Pallet & { albaranId: string; carrier: string; entryDate: string; };
    dispatch?: DispatchNote;
}

// --- Helper Components ---
const TimelineStep: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; isLast?: boolean }> = ({ icon, title, children, isLast = false }) => (
    <li>
        <div className="relative pb-8">
            {!isLast && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />}
            <div className="relative flex items-start space-x-3">
                <div className="z-10 flex items-center justify-center w-8 h-8 bg-brand-yellow rounded-full ring-4 ring-white">
                    {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5 text-brand-dark"})}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <div className="mt-2 text-sm text-gray-600 space-y-2">{children}</div>
                </div>
            </div>
        </div>
    </li>
);

const InfoPair: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
    <p><strong className="font-medium text-gray-900">{label}:</strong> {value || 'N/A'}</p>
);

// --- Main Component ---
interface TraceabilityProps {
    packs: WinePack[];
    albaranes: Albaran[];
    salidas: DispatchNote[];
}

const Traceability: React.FC<TraceabilityProps> = ({ packs, albaranes, salidas }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searched, setSearched] = useState(false);
    const [traceabilityData, setTraceabilityData] = useState<TraceabilityData | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearched(true);
        const query = searchQuery.trim();
        if (!query) {
            setTraceabilityData(null);
            return;
        }

        const foundPack = packs.find(p => p.id.toLowerCase() === query.toLowerCase());
        if (!foundPack) {
            setTraceabilityData(null);
            return;
        }

        // Find the source pallet and albaran
        let sourcePalletData: (Pallet & { albaranId: string, carrier: string, entryDate: string }) | undefined = undefined;
        const packContent = foundPack.contents[0]; // Assuming one main content for simplicity
        if (packContent) {
            for (const albaran of albaranes) {
                const pallet = albaran.pallets.find(p => p.product.name === packContent.productName && p.product.lot === packContent.lot);
                if (pallet) {
                    sourcePalletData = { ...pallet, albaranId: albaran.id, carrier: albaran.carrier, entryDate: albaran.entryDate };
                    break;
                }
            }
        }
        
        // Find the dispatch note
        const dispatchNote = salidas.find(s => s.packIds.includes(foundPack.id));

        setTraceabilityData({
            pack: foundPack,
            sourcePallet: sourcePalletData,
            dispatch: dispatchNote
        });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Trazabilidad de Packs</h1>
            
            <Card className="mb-6">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Introduce el ID de un pack para ver su historial (ej: pack-001)"
                        className="flex-grow w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    <Button type="submit" className="flex items-center justify-center">
                        <SearchIcon />
                        <span className="ml-2">Buscar</span>
                    </Button>
                </form>
            </Card>

            <Card>
                {traceabilityData ? (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Historial del Pack: <span className="text-brand-yellow">{traceabilityData.pack.id}</span></h2>
                        <p className="text-md text-gray-600 mb-6">Estado actual: <span className="font-semibold">{traceabilityData.pack.status}</span></p>

                        <ul role="list" className="-mb-8">
                            {traceabilityData.sourcePallet && (
                                <TimelineStep icon={<EntryIcon />} title="1. Entrada de Materia Prima">
                                    <InfoPair label="Fecha de Entrada" value={formatDateTimeSafe(traceabilityData.sourcePallet.entryDate)} />
                                    <InfoPair label="Producto Origen" value={traceabilityData.sourcePallet.product.name} />
                                    <InfoPair label="Lote Origen" value={traceabilityData.sourcePallet.product.lot} />
                                    <InfoPair label="Nº de Pallet" value={traceabilityData.sourcePallet.palletNumber} />
                                    <InfoPair label="Albarán de Entrada" value={traceabilityData.sourcePallet.albaranId} />
                                    <InfoPair label="Transportista" value={traceabilityData.sourcePallet.carrier} />
                                </TimelineStep>
                            )}

                             <TimelineStep icon={<PackIcon />} title="2. Ensamblaje del Pack">
                                <InfoPair label="Fecha de Creación" value={formatDateTimeSafe(traceabilityData.pack.creationDate)} />
                                <InfoPair label="Modelo de Pack" value={traceabilityData.pack.modelName} />
                                <InfoPair label="Orden de Pedido" value={traceabilityData.pack.orderId} />
                                <p className="font-medium text-gray-900">Contenido:</p>
                                <ul className="list-disc pl-5">
                                    {traceabilityData.pack.contents.map(c => <li key={c.lot}>{c.quantity} x {c.productName} (Lote: {c.lot})</li>)}
                                </ul>
                            </TimelineStep>

                            {traceabilityData.dispatch && (
                                <TimelineStep icon={<ExitIcon />} title="3. Nota de Salida" isLast={true}>
                                    <InfoPair label="Fecha de Despacho" value={formatDateTimeSafe(traceabilityData.dispatch.dispatchDate)} />
                                    <InfoPair label="ID de Salida" value={traceabilityData.dispatch.id} />
                                    <InfoPair label="Cliente" value={traceabilityData.dispatch.customer} />
                                    <InfoPair label="Destino" value={traceabilityData.dispatch.destination} />
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                        <InfoPair label="Transportista" value={traceabilityData.dispatch.carrier} />
                                        <InfoPair label="Matrícula" value={traceabilityData.dispatch.truckPlate} />
                                        <InfoPair label="Conductor" value={traceabilityData.dispatch.driver} />
                                    </div>
                                </TimelineStep>
                            )}
                        </ul>
                    </div>
                ) : (
                    <div className="text-center py-12 flex flex-col items-center">
                        <EmptyIcon />
                        <h3 className="text-xl font-semibold text-gray-700 mt-4">
                            {searched ? 'Pack no encontrado' : 'Busca un pack para empezar'}
                        </h3>
                        <p className="text-gray-500 mt-2">
                            {searched ? `No se encontró ningún pack con el ID "${searchQuery}".` : 'Introduce un ID de pack en el campo de búsqueda para ver su ciclo de vida.'}
                        </p>
                    </div>
                )}
            </Card>

        </div>
    );
};

export default Traceability;
