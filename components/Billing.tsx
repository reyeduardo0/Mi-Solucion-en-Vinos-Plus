
import React, { useState, useMemo } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import { PackModel, PriceList } from '../types';
import { formatDateSafe } from '../utils/helpers';
import Modal from './ui/Modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const CsvIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const PdfIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;

const PriceListModal: React.FC<{ 
    onClose: () => void; 
    onSave: (pl: Omit<PriceList, 'id' | 'created_at'> | PriceList) => void;
    priceList?: PriceList | null;
    models: PackModel[];
}> = ({ onClose, onSave, priceList, models }) => {
    const [modelId, setModelId] = useState(priceList?.modelId || '');
    const [startDate, setStartDate] = useState(priceList?.startDate ? priceList.startDate.split('T')[0] : '');
    const [endDate, setEndDate] = useState(priceList?.endDate ? priceList.endDate.split('T')[0] : '');
    const [basePrice, setBasePrice] = useState(priceList?.basePrice || 0);
    const [holidaySurchargePercent, setHolidaySurchargePercent] = useState(priceList?.holidaySurchargePercent || 0);
    const [nightSurchargePercent, setNightSurchargePercent] = useState(priceList?.nightSurchargePercent || 0);
    const [overtimePrice, setOvertimePrice] = useState(priceList?.overtimePrice || 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            modelId,
            startDate: new Date(startDate).toISOString(),
            endDate: endDate ? new Date(endDate).toISOString() : undefined,
            basePrice,
            holidaySurchargePercent,
            nightSurchargePercent,
            overtimePrice
        };
        if(priceList) onSave({ ...priceList, ...data });
        else onSave(data);
        onClose();
    };

    return (
        <Modal title={priceList ? "Editar Tarifa" : "Nueva Tarifa"} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Modelo de Pack</label>
                    <select value={modelId} onChange={e => setModelId(e.target.value)} required className="w-full p-2 border rounded-md">
                        <option value="">Seleccionar Modelo...</option>
                        {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium">Fecha Inicio Vigencia</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium">Fecha Fin (Opcional)</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-md"/></div>
                </div>
                <div><label className="block text-sm font-medium">Precio Base (por Unidad)</label><input type="number" step="0.01" value={basePrice} onChange={e => setBasePrice(Number(e.target.value))} required className="w-full p-2 border rounded-md"/></div>
                <div className="grid grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium">% Recargo Festivo</label><input type="number" step="1" value={holidaySurchargePercent} onChange={e => setHolidaySurchargePercent(Number(e.target.value))} className="w-full p-2 border rounded-md" placeholder="Ej: 20"/></div>
                    <div><label className="block text-sm font-medium">% Recargo Nocturno</label><input type="number" step="1" value={nightSurchargePercent} onChange={e => setNightSurchargePercent(Number(e.target.value))} className="w-full p-2 border rounded-md" placeholder="Ej: 15"/></div>
                    <div><label className="block text-sm font-medium">Precio Hora Extra</label><input type="number" step="0.01" value={overtimePrice} onChange={e => setOvertimePrice(Number(e.target.value))} className="w-full p-2 border rounded-md" placeholder="Ej: 50.00"/></div>
                </div>
                <div className="flex justify-end pt-4 space-x-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Guardar</Button></div>
            </form>
        </Modal>
    );
};

const Billing: React.FC = () => {
    const { priceLists, packModels, addPriceList, updatePriceList, deletePriceList, productionReports, packs, salidas, assignBillingMonth } = useData();
    const [activeTab, setActiveTab] = useState<'rates' | 'pending' | 'report'>('pending');
    const [showRateModal, setShowRateModal] = useState(false);
    const [rateToEdit, setRateToEdit] = useState<PriceList | null>(null);
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [searchTerm, setSearchTerm] = useState('');
    
    // Pending Tab State
    const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set());
    const [targetBillingMonth, setTargetBillingMonth] = useState(new Date().toISOString().slice(0, 7));

    const handleSaveRate = async (data: any) => {
        if ('id' in data) await updatePriceList(data);
        else await addPriceList(data);
        setShowRateModal(false); setRateToEdit(null);
    };

    // Calculate Data for Reports (Common logic for both pending and billed)
    const calculateRowData = (reports: typeof productionReports) => {
        return reports.map(report => {
            const pack = packs.find(p => p.id === report.packId);
            const model = pack ? packModels.find(m => m.id === pack.modelId) : null;
            
            // Find Dispatch info
            const dispatch = salidas.find(s => s.packIds?.includes(report.packId) || s.dispatchDetails?.some(d => d.packId === report.packId));

            // Find effective price list based on REPORT DATE (Production Date)
            const reportDateObj = new Date(report.reportDate);
            const priceList = priceLists.find(pl => {
                if (pl.modelId !== pack?.modelId) return false;
                const start = new Date(pl.startDate);
                const end = pl.endDate ? new Date(pl.endDate) : new Date('2099-12-31');
                return reportDateObj >= start && reportDateObj <= end;
            });

            const basePrice = priceList?.basePrice || 0;
            let finalRate = basePrice;
            let surchargeInfo = "";

            if (report.isHoliday) {
                finalRate += basePrice * ((priceList?.holidaySurchargePercent || 0) / 100);
                surchargeInfo = "Festivo";
            } else if (report.isNightShift) {
                finalRate += basePrice * ((priceList?.nightSurchargePercent || 0) / 100);
                surchargeInfo = "Nocturno";
            }

            const productionCost = finalRate * report.producedQuantity;
            const overtimeCost = (report.overtimeHours || 0) * (priceList?.overtimePrice || 0);
            const totalAmount = productionCost + overtimeCost;

            return {
                id: report.id,
                packOrderId: pack?.orderId || report.packId, // Use Pack Order ID as visible identifier
                status: dispatch ? 'Expedido' : 'Terminado',
                productionDate: report.reportDate,
                orderDate: pack?.creationDate,
                shipDate: dispatch?.dispatchDate,
                dispatchNoteId: dispatch?.dispatchNoteId || dispatch?.id,
                description: model?.name || pack?.modelName,
                lot: report.expeditionLot,
                qty: report.producedQuantity,
                rate: finalRate,
                overtime: report.overtimeHours,
                totalAmount,
                notes: surchargeInfo + (report.overtimeHours ? ` (+ ${report.overtimeHours}h Extra)` : '')
            };
        });
    };

    const filterData = (data: ReturnType<typeof calculateRowData>) => {
        if (!searchTerm) return data;
        const lower = searchTerm.toLowerCase();
        return data.filter(item => 
            item.packOrderId.toLowerCase().includes(lower) ||
            item.description?.toLowerCase().includes(lower) ||
            item.lot?.toLowerCase().includes(lower) ||
            item.dispatchNoteId?.toLowerCase().includes(lower) ||
            item.id.toLowerCase().includes(lower)
        );
    };

    const pendingData = useMemo(() => {
        const pendingReports = productionReports.filter(r => !r.billingStatus || r.billingStatus === 'pending');
        const calculated = calculateRowData(pendingReports);
        return filterData(calculated).sort((a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime());
    }, [productionReports, packs, salidas, priceLists, packModels, searchTerm]);

    const billedData = useMemo(() => {
        const billedReports = productionReports.filter(r => r.billingStatus === 'billed' && r.assignedBillingMonth === reportMonth);
        const calculated = calculateRowData(billedReports);
        return filterData(calculated).sort((a, b) => new Date(a.shipDate || '0').getTime() - new Date(b.shipDate || '0').getTime());
    }, [productionReports, packs, salidas, priceLists, packModels, reportMonth, searchTerm]);

    const totalBilling = billedData.reduce((sum, item) => sum + item.totalAmount, 0);

    const handleSelectPending = (id: string) => {
        const newSet = new Set(selectedPendingIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedPendingIds(newSet);
    };

    const handleSelectAllPending = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedPendingIds(new Set(pendingData.map(d => d.id)));
        } else {
            setSelectedPendingIds(new Set());
        }
    };

    const handleAssignBilling = async () => {
        if (selectedPendingIds.size === 0) return;
        if (!targetBillingMonth) {
            alert("Selecciona un mes de facturación.");
            return;
        }
        try {
            await assignBillingMonth(Array.from(selectedPendingIds), targetBillingMonth);
            setSelectedPendingIds(new Set());
            alert(`Se han asignado ${selectedPendingIds.size} partes al mes ${targetBillingMonth}`);
            setActiveTab('report');
            setReportMonth(targetBillingMonth);
        } catch (e) {
            console.error(e);
            alert("Error al asignar facturación.");
        }
    };

    const handleExportCSV = () => {
        const headers = ['Status', 'Fecha Prod.', 'Fecha Envío', 'Parte Montaje', 'Descripción Artículo', 'Lote Exp.', 'Nº Albarán Salida', 'Cantidad', 'Tarifa', 'Extras (H)', 'Total', 'Notas'];
        const rows = billedData.map(item => [
            item.status, 
            formatDateSafe(item.productionDate), 
            formatDateSafe(item.shipDate || ''),
            item.packOrderId, // Show Order ID
            item.description, 
            item.lot || '', 
            item.dispatchNoteId || '',
            item.qty, 
            item.rate.toFixed(2), 
            item.overtime || 0,
            item.totalAmount.toFixed(2), 
            item.notes
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Facturacion_${reportMonth}.csv`;
        link.click();
    };

    const handleExportPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
        doc.text(`Reporte de Facturación - ${reportMonth}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Total Facturable: ${totalBilling.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`, 14, 22);

        autoTable(doc, {
            startY: 25,
            head: [['Status', 'F. Prod', 'F. Envío', 'Parte', 'Descripción', 'Lote Exp.', 'Albarán', 'Cant.', 'Tarifa', 'Total', 'Notas']],
            body: billedData.map(item => [
                item.status,
                formatDateSafe(item.productionDate),
                formatDateSafe(item.shipDate),
                item.packOrderId, // Show Order ID
                item.description,
                item.lot || '-',
                item.dispatchNoteId || '-',
                item.qty,
                item.rate.toFixed(2),
                item.totalAmount.toFixed(2),
                item.notes
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [220, 252, 231], textColor: [0,0,0] }
        });
        doc.save(`Facturacion_${reportMonth}.pdf`);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {showRateModal && <PriceListModal onClose={() => setShowRateModal(false)} onSave={handleSaveRate} priceList={rateToEdit} models={packModels} />}
            
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Módulo de Facturación</h1>
            
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setActiveTab('pending')} className={`${activeTab === 'pending' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        Producción Pendiente ({pendingData.length})
                    </button>
                    <button onClick={() => setActiveTab('report')} className={`${activeTab === 'report' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        Reporte Mensual
                    </button>
                    <button onClick={() => setActiveTab('rates')} className={`${activeTab === 'rates' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        Gestión de Tarifas
                    </button>
                </nav>
            </div>

            {/* Global Search Bar for Reporting Tabs */}
            {activeTab !== 'rates' && (
                <div className="mb-6 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por Parte de Montaje, Artículo, Lote, Albarán..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
                    />
                </div>
            )}

            {activeTab === 'pending' && (
                <Card title="Selección de Producción para Facturar">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-center space-x-4">
                            <label className="block text-sm font-medium text-gray-700">Facturar en Mes:</label>
                            <input type="month" value={targetBillingMonth} onChange={e => setTargetBillingMonth(e.target.value)} className="p-2 border rounded-md shadow-sm"/>
                        </div>
                        <Button onClick={handleAssignBilling} disabled={selectedPendingIds.size === 0} className="w-full md:w-auto">
                            <CheckIcon /> Asignar ({selectedPendingIds.size}) a Facturación
                        </Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border text-sm">
                            <thead className="bg-yellow-100">
                                <tr>
                                    <th className="px-3 py-2 w-10">
                                        <input type="checkbox" onChange={handleSelectAllPending} checked={pendingData.length > 0 && selectedPendingIds.size === pendingData.length} />
                                    </th>
                                    <th className="px-3 py-2 text-left">Fecha Prod.</th>
                                    <th className="px-3 py-2 text-left">Parte Montaje</th>
                                    <th className="px-3 py-2 text-left">Modelo / Artículo</th>
                                    <th className="px-3 py-2 text-left">Lote Exp.</th>
                                    <th className="px-3 py-2 text-right">Cantidad</th>
                                    <th className="px-3 py-2 text-right">Tarifa Est.</th>
                                    <th className="px-3 py-2 text-right">Total Est.</th>
                                    <th className="px-3 py-2 text-left">Condiciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {pendingData.map((row) => (
                                    <tr key={row.id} className={selectedPendingIds.has(row.id) ? 'bg-yellow-50' : ''}>
                                        <td className="px-3 py-2">
                                            <input type="checkbox" checked={selectedPendingIds.has(row.id)} onChange={() => handleSelectPending(row.id)} />
                                        </td>
                                        <td className="px-3 py-2">{formatDateSafe(row.productionDate)}</td>
                                        <td className="px-3 py-2 font-mono text-xs text-gray-900 font-bold">{row.packOrderId}</td>
                                        <td className="px-3 py-2 font-medium">{row.description}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{row.lot || '-'}</td>
                                        <td className="px-3 py-2 text-right">{row.qty}</td>
                                        <td className="px-3 py-2 text-right">{row.rate.toFixed(2)} €</td>
                                        <td className="px-3 py-2 text-right font-bold">{row.totalAmount.toFixed(2)} €</td>
                                        <td className="px-3 py-2 text-xs text-gray-500 italic">{row.notes || '-'}</td>
                                    </tr>
                                ))}
                                {pendingData.length === 0 && (
                                    <tr><td colSpan={9} className="text-center py-8 text-gray-500">No hay producción pendiente de facturar.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === 'report' && (
                <Card>
                    <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mes del Reporte</label>
                            <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="p-2 border rounded-md shadow-sm"/>
                        </div>
                        <div className="flex space-x-2">
                            <Button variant="secondary" onClick={handleExportCSV} disabled={billedData.length === 0}><CsvIcon/> CSV</Button>
                            <Button variant="secondary" onClick={handleExportPDF} disabled={billedData.length === 0}><PdfIcon/> PDF</Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border text-sm">
                            <thead className="bg-gray-800 text-white">
                                <tr>
                                    <th className="px-3 py-2 text-left">Status</th>
                                    <th className="px-3 py-2 text-left">F. Prod.</th>
                                    <th className="px-3 py-2 text-left">F. Envío</th>
                                    <th className="px-3 py-2 text-left">Parte Montaje</th>
                                    <th className="px-3 py-2 text-left">Descripción Artículo</th>
                                    <th className="px-3 py-2 text-left">Lote Exp.</th>
                                    <th className="px-3 py-2 text-left">Nº Albarán</th>
                                    <th className="px-3 py-2 text-right">Cant.</th>
                                    <th className="px-3 py-2 text-right">Tarifa</th>
                                    <th className="px-3 py-2 text-right">Monto Facturar</th>
                                    <th className="px-3 py-2 text-left">Notas</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {billedData.map((row, idx) => (
                                    <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-3 py-2">{row.status}</td>
                                        <td className="px-3 py-2">{formatDateSafe(row.productionDate)}</td>
                                        <td className="px-3 py-2">{formatDateSafe(row.shipDate)}</td>
                                        <td className="px-3 py-2 font-mono text-xs text-gray-900 font-bold">{row.packOrderId}</td>
                                        <td className="px-3 py-2 font-medium">{row.description}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{row.lot || '-'}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{row.dispatchNoteId}</td>
                                        <td className="px-3 py-2 text-right">{row.qty}</td>
                                        <td className="px-3 py-2 text-right">{row.rate.toFixed(2)} €</td>
                                        <td className="px-3 py-2 text-right font-bold">{row.totalAmount.toFixed(2)} €</td>
                                        <td className="px-3 py-2 text-xs text-gray-500 italic">{row.notes}</td>
                                    </tr>
                                ))}
                                {billedData.length === 0 && (
                                    <tr><td colSpan={11} className="text-center py-8 text-gray-500">No hay datos facturados en este mes.</td></tr>
                                )}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold">
                                <tr>
                                    <td colSpan={9} className="px-3 py-3 text-right">TOTAL FACTURACIÓN:</td>
                                    <td className="px-3 py-3 text-right text-lg text-blue-700">{totalBilling.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === 'rates' && (
                <Card title="Listado de Tarifas">
                    <div className="flex justify-end mb-4"><Button onClick={() => { setRateToEdit(null); setShowRateModal(true); }}>Nueva Tarifa</Button></div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modelo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vigencia</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Base</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Festivo</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Nocturno</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hora Extra</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {priceLists.map(pl => (
                                    <tr key={pl.id}>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{packModels.find(m => m.id === pl.modelId)?.name || pl.modelId}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{formatDateSafe(pl.startDate)} - {pl.endDate ? formatDateSafe(pl.endDate) : 'Indefinido'}</td>
                                        <td className="px-6 py-4 text-sm text-right">{pl.basePrice.toFixed(2)} €</td>
                                        <td className="px-6 py-4 text-sm text-right text-red-600">+{pl.holidaySurchargePercent}%</td>
                                        <td className="px-6 py-4 text-sm text-right text-blue-600">+{pl.nightSurchargePercent}%</td>
                                        <td className="px-6 py-4 text-sm text-right">{pl.overtimePrice.toFixed(2)} €</td>
                                        <td className="px-6 py-4 text-sm text-right space-x-2">
                                            <button onClick={() => { setRateToEdit(pl); setShowRateModal(true); }} className="text-blue-600 hover:text-blue-900"><PencilIcon/></button>
                                            <button onClick={() => deletePriceList(pl.id)} className="text-red-600 hover:text-red-900"><TrashIcon/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default Billing;
