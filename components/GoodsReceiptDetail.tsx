

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pallet } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import { formatDateTimeLong } from '../utils/helpers';
import StatusBadge from './ui/StatusBadge';

const InfoPair: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{value || '—'}</dd>
    </div>
);

const PalletDetailCard: React.FC<{ pallet: Pallet, index: number }> = ({ pallet, index }) => {
    return (
        <Card className="mb-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Pallet #{index + 1} - Nº: {pallet.palletNumber || 'N/A'}</h4>
            {pallet.type === 'product' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <InfoPair label="Producto" value={pallet.product?.name} />
                    <InfoPair label="Lote" value={pallet.product?.lot} />
                    <InfoPair label="SSCC" value={pallet.sscc} />
                    <InfoPair label="Cajas/Pallet" value={pallet.boxesPerPallet} />
                    <InfoPair label="Botellas/Caja" value={pallet.bottlesPerBox} />
                    <InfoPair label="Total Botellas" value={pallet.totalBottles} />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <InfoPair label="Tipo" value={<span className="font-semibold">Consumible</span>} />
                    <InfoPair label="Consumible" value={pallet.supplyName} />
                    <InfoPair label="Cantidad" value={`${pallet.supplyQuantity} unidades`} />
                </div>
            )}
            {pallet.incident && (
                 <div className="mt-4 p-3 border-l-4 border-yellow-400 bg-yellow-50">
                    <h5 className="text-sm font-semibold text-yellow-800">Incidencia del Pallet</h5>
                    <p className="text-sm text-yellow-700 mt-1">{pallet.incident.description}</p>
                    {pallet.incident.images.length > 0 && <p className="text-xs mt-2 text-yellow-600">({pallet.incident.images.length} imágenes adjuntas)</p>}
                 </div>
            )}
        </Card>
    );
};


const GoodsReceiptDetail: React.FC = () => {
    const { albaranId } = useParams<{ albaranId: string }>();
    const navigate = useNavigate();
    const { albaranes } = useData();
    const albaran = albaranes.find(a => a.id === albaranId);

    if (!albaran) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-700">Albarán no encontrado</h2>
                <p className="text-gray-500 mt-2">El albarán con el ID "{albaranId}" no existe.</p>
                <Button onClick={() => navigate('/entradas')} className="mt-6">Volver a la Lista</Button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Detalle de Entrada</h1>
                    <p className="text-gray-500 font-mono">ID Albarán: {albaran.id}</p>
                </div>
                <Button onClick={() => navigate('/entradas')} variant="secondary">&larr; Volver a la Lista</Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card title="Información General">
                        <dl className="space-y-4">
                            <InfoPair label="Fecha y Hora de Entrada" value={formatDateTimeLong(albaran.entryDate)} />
                            <InfoPair label="Estado" value={<StatusBadge status={albaran.status} />} />
                            <InfoPair label="Número de Pallets" value={albaran.pallets?.length || 0} />
                        </dl>
                    </Card>
                     <Card title="Datos de Transporte">
                        <dl className="space-y-4">
                            <InfoPair label="Matrícula Camión" value={albaran.truckPlate} />
                            <InfoPair label="Transportista" value={albaran.carrier} />
                            <InfoPair label="Conductor" value={albaran.driver} />
                            <InfoPair label="Origen" value={albaran.origin} />
                        </dl>
                    </Card>

                    {albaran.incidentDetails && (
                        <Card title="Incidencia General">
                             <div className="p-3 border-l-4 border-red-400 bg-red-50">
                                <p className="text-sm text-red-800">{albaran.incidentDetails}</p>
                                {/* FIX: Correctly close JSX and display image count. */}
                                {albaran.incidentImages && albaran.incidentImages.length > 0 && (
                                    <p className="text-xs mt-2 text-red-600">({albaran.incidentImages.length} imágenes adjuntas)</p>
                                )}
                             </div>
                        </Card>
                    )}
                </div>
                <div className="lg:col-span-2">
                    <Card title={`Pallets (${albaran.pallets?.length || 0})`}>
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            {albaran.pallets && albaran.pallets.length > 0 ? (
                                albaran.pallets.map((pallet, index) => (
                                    <PalletDetailCard key={pallet.id} pallet={pallet} index={index} />
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">No hay pallets registrados para esta entrada.</p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default GoodsReceiptDetail;
