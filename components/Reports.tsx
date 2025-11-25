
import React, { useState } from 'react';
import { Albaran, Incident, WinePack, DispatchNote, Supply } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import { formatDateTimeSafe, formatDateSafe } from '../utils/helpers';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

const ReportsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const CsvIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const PdfIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;

const Reports: React.FC = () => {
    const { albaranes, incidents, salidas, supplies, inventoryStock, productionReports, packs, mermas } = useData();
    const [reportFilters, setReportFilters] = useState({ type: 'entries', startDate: '', endDate: '', carrier: '', customer: '', status: 'all' });
    const [generatedReport, setGeneratedReport] = useState<{ headers: string[], data: (string|number)[][] } | null>(null);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setReportFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleGenerateReport = () => {
        let headers: string[] = [], data: (string|number)[][] = [];
        const startDate = reportFilters.startDate ? new Date(reportFilters.startDate) : null;
        const endDate = reportFilters.endDate ? new Date(reportFilters.endDate) : null;
        if(startDate) startDate.setHours(0,0,0,0);
        if(endDate) endDate.setHours(23,59,59,999);
        const dateFilter = (dateStr: string) => { if (!startDate && !endDate) return true; const itemDate = new Date(dateStr); return !isNaN(itemDate.getTime()) && (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate); }

        switch (reportFilters.type) {
            case 'entries':
                headers = ['ID Albarán', 'Fecha', 'Transportista', 'Conductor', '# Pallets', 'Estado'];
                data = albaranes.filter(a => dateFilter(a.entryDate) && (!reportFilters.carrier || a.carrier === reportFilters.carrier) && (reportFilters.status === 'all' || a.status === reportFilters.status)).map(a => [a.id, formatDateSafe(a.entryDate), a.carrier, a.driver || 'N/A', a.pallets?.length || 0, a.status]);
                break;
            case 'dispatches':
                headers = ['ID Salida', 'Fecha', 'Cliente', 'Destino', 'Transportista', '# Packs'];
                data = salidas.filter(s => dateFilter(s.dispatchDate) && (!reportFilters.customer || s.customer === reportFilters.customer) && (!reportFilters.carrier || s.carrier === reportFilters.carrier)).map(s => [s.id, formatDateSafe(s.dispatchDate), s.customer, s.destination, s.carrier, s.packIds?.length || 0]);
                break;
            case 'incidents':
                headers = ['ID Incidencia', 'Fecha', 'Tipo', 'ID Relacionado', 'Estado', 'Descripción'];
                 data = incidents.filter(i => dateFilter(i.date) && (reportFilters.status === 'all' || (reportFilters.status === 'resolved' ? i.resolved : !i.resolved))).map(i => [i.id, formatDateTimeSafe(i.date), i.type, i.relatedId, i.resolved ? 'Resuelta' : 'Pendiente', i.description]);
                break;
            case 'supplies':
                headers = ['Nombre', 'Tipo', 'Stock Actual', 'Unidad', 'Stock Mínimo'];
                data = supplies.map(s => {
                    const calculatedStock = inventoryStock
                        .filter(item => item.type === 'Consumible' && item.name === s.name)
                        .reduce((acc, item) => acc + item.available, 0);
                    return [s.name, s.type, calculatedStock, s.unit, s.minStock ?? 'N/A'];
                });
                break;
            case 'stock_detailed':
                // Inventario Actual Detallado por Lote
                headers = ['Código', 'Artículo', 'Tipo', 'Lote', 'Stock Total', 'Disponible', 'En Packs', 'En Merma'];
                data = inventoryStock.map(i => [
                    i.code || '-',
                    i.name,
                    i.type,
                    i.lot || 'SIN LOTE',
                    i.total,
                    i.available,
                    i.inPacks,
                    i.inMerma
                ]);
                break;
            case 'stock_aggregated':
                // Inventario Actual Agrupado por Producto
                headers = ['Código', 'Artículo', 'Tipo', 'Stock Total', 'Disponible', 'En Packs', 'En Merma'];
                const aggregatedStock = inventoryStock.reduce((acc, curr) => {
                    const key = curr.name;
                    if (!acc[key]) {
                        acc[key] = { 
                            name: curr.name, 
                            code: curr.code || '-', 
                            type: curr.type, 
                            total: 0, 
                            available: 0, 
                            inPacks: 0, 
                            inMerma: 0 
                        };
                    }
                    acc[key].total += curr.total;
                    acc[key].available += curr.available;
                    acc[key].inPacks += curr.inPacks;
                    acc[key].inMerma += curr.inMerma;
                    return acc;
                }, {} as Record<string, any>);
                
                data = Object.values(aggregatedStock).sort((a: any, b: any) => a.name.localeCompare(b.name)).map((i: any) => [
                    i.code,
                    i.name,
                    i.type,
                    i.total,
                    i.available,
                    i.inPacks,
                    i.inMerma
                ]);
                break;
            case 'production':
                headers = ['Fecha', 'Nº Lanzamiento', 'Modelo', 'Cant. Producida', 'Total Mermas (Items)'];
                data = productionReports.filter(r => dateFilter(r.reportDate)).map(r => {
                    const pack = packs.find(p => p.id === r.packId);
                    const mermasCount = r.consumptions.filter(c => c.quantityWaste > 0).length;
                    return [
                        formatDateSafe(r.reportDate),
                        pack ? pack.orderId : r.packId,
                        pack ? pack.modelName : '---',
                        r.producedQuantity,
                        mermasCount > 0 ? `${mermasCount} items` : '0'
                    ];
                });
                break;
            case 'mermas_total':
                headers = ['Artículo', 'Tipo', 'Total Merma', 'Veces Reportado'];
                // Agrupar mermas por nombre
                const groupedMermas = mermas.filter(m => dateFilter(m.created_at)).reduce((acc, curr) => {
                    const key = curr.itemName;
                    if (!acc[key]) acc[key] = { name: curr.itemName, type: curr.itemType, total: 0, count: 0 };
                    acc[key].total += curr.quantity;
                    acc[key].count += 1;
                    return acc;
                }, {} as Record<string, any>);
                data = Object.values(groupedMermas).map(m => [m.name, m.type, m.total, m.count]);
                break;
            case 'production_by_model':
                headers = ['Modelo de Pack', 'Unidades Producidas', 'Nº de Partes (Lotes)'];
                // Agrupar producción por nombre del modelo del pack
                const groupedProd = productionReports.filter(r => dateFilter(r.reportDate)).reduce((acc, curr) => {
                    const pack = packs.find(p => p.id === curr.packId);
                    const name = pack ? pack.modelName : 'Modelo Desconocido';
                    if (!acc[name]) acc[name] = { name, totalQty: 0, batches: 0 };
                    acc[name].totalQty += curr.producedQuantity;
                    acc[name].batches += 1;
                    return acc;
                }, {} as Record<string, any>);
                data = Object.values(groupedProd).map(p => [p.name, p.totalQty, p.batches]);
                break;
        }
        setGeneratedReport({ headers, data });
    };

    const handleExportPDF = () => {
        if (!generatedReport) return;

        const doc = new jsPDF();
        
        let title = "Reporte";
        switch (reportFilters.type) {
            case 'entries': title = "Reporte de Entradas"; break;
            case 'dispatches': title = "Reporte de Salidas"; break;
            case 'incidents': title = "Reporte de Incidencias"; break;
            case 'supplies': title = "Reporte de Inventario de Consumibles (General)"; break;
            case 'stock_detailed': title = "Reporte de Stock Detallado (Por Lotes)"; break;
            case 'stock_aggregated': title = "Reporte de Stock Agrupado (Por Producto)"; break;
            case 'production': title = "Reporte de Partes de Montaje"; break;
            case 'mermas_total': title = "Resumen Total de Mermas"; break;
            case 'production_by_model': title = "Resumen de Producción por Modelo"; break;
        }

        const dateStr = new Date().toLocaleDateString('es-ES');
        
        doc.setFontSize(18);
        doc.text(title, 14, 20);
        
        doc.setFontSize(10);
        doc.text(`Generado el: ${dateStr}`, 14, 28);
        if (reportFilters.startDate || reportFilters.endDate) {
            doc.text(`Filtro de fecha: ${reportFilters.startDate || 'Inicio'} - ${reportFilters.endDate || 'Fin'}`, 14, 34);
        }

        autoTable(doc, {
            startY: 40,
            head: [generatedReport.headers],
            body: generatedReport.data,
            headStyles: { fillColor: [251, 191, 36], textColor: [17, 24, 39] },
            styles: { fontSize: 8 },
        });

        const fileName = `reporte_${reportFilters.type}_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
    };

    const handleExportCSV = () => {
        if (!generatedReport) return;
        const csvContent = [
            generatedReport.headers.join(','),
            ...generatedReport.data.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `reporte_${reportFilters.type}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const uniqueCarriers = [...new Set(albaranes.map(a => a.carrier).concat(salidas.map(s => s.carrier)))];
    const uniqueCustomers = [...new Set(salidas.map(s => s.customer))];
    
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Generador de Reportes</h1>
            <div className="space-y-6">
                <Card title="Configurar Reporte">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium mb-1">Tipo de Reporte</label>
                            <select name="type" value={reportFilters.type} onChange={handleFilterChange} className="w-full p-2 border rounded-md">
                                <option value="entries">Historial de Entradas</option>
                                <option value="dispatches">Detalle de Salidas</option>
                                <option value="incidents">Resumen de Incidencias</option>
                                <option value="stock_detailed">Inventario Detallado (Lotes)</option>
                                <option value="stock_aggregated">Inventario Agrupado (Producto)</option>
                                <option value="supplies">Maestro de Consumibles</option>
                                <option value="production">Listado Partes de Montaje</option>
                                <option value="mermas_total">Total Mermas (Agrupado)</option>
                                <option value="production_by_model">Producción por Modelo (Agrupado)</option>
                            </select>
                        </div>
                        <div><label className="block text-sm font-medium mb-1">Fecha Desde</label><input type="date" name="startDate" value={reportFilters.startDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md"/></div>
                        <div><label className="block text-sm font-medium mb-1">Fecha Hasta</label><input type="date" name="endDate" value={reportFilters.endDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md"/></div>
                        {(reportFilters.type === 'entries' || reportFilters.type === 'dispatches') && <div><label className="block text-sm font-medium mb-1">Transportista</label><select name="carrier" value={reportFilters.carrier} onChange={handleFilterChange} className="w-full p-2 border rounded-md"><option value="">Todos</option>{uniqueCarriers.map(c => <option key={c} value={c}>{c}</option>)}</select></div>}
                        {(reportFilters.type === 'dispatches') && <div><label className="block text-sm font-medium mb-1">Cliente</label><select name="customer" value={reportFilters.customer} onChange={handleFilterChange} className="w-full p-2 border rounded-md"><option value="">Todos</option>{uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}</select></div>}
                        {(reportFilters.type === 'entries' || reportFilters.type === 'incidents') && <div><label className="block text-sm font-medium mb-1">Estado</label><select name="status" value={reportFilters.status} onChange={handleFilterChange} className="w-full p-2 border rounded-md"><option value="all">Todos</option>{reportFilters.type === 'entries' ? <><option value="verified">Verificado</option><option value="incident">Incidencia</option></> : <><option value="pending">Pendiente</option><option value="resolved">Resuelta</option></>}</select></div>}
                    </div>
                    <div className="mt-4 flex justify-end"><Button onClick={handleGenerateReport}>Generar Reporte</Button></div>
                </Card>
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Resultados del Reporte</h3>
                        {generatedReport && <div className="space-x-2"><Button variant="secondary" onClick={handleExportCSV}><CsvIcon/>Exportar a CSV</Button><Button variant="secondary" onClick={handleExportPDF}><PdfIcon/>Exportar a PDF</Button></div>}
                    </div>
                    <div className="overflow-x-auto">
                        {generatedReport ? (
                            generatedReport.data.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>{generatedReport.headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase">{h}</th>)}</tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {generatedReport.data.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{cell as React.ReactNode}</td>)}</tr>)}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-center text-gray-500 py-8">No se encontraron datos para los filtros seleccionados.</p>
                            )
                        ) : (
                            <div className="text-center py-12 flex flex-col items-center">
                                <ReportsIcon/>
                                <h3 className="text-xl font-semibold text-gray-700 mt-4">Listo para generar reportes</h3>
                                <p className="text-gray-500 mt-2">Configure las opciones de arriba y haga clic en "Generar Reporte".</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Reports;
