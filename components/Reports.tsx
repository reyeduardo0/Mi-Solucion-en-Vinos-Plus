import React, { useState } from 'react';
import { Albaran, Incident, WinePack, DispatchNote, Supply } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import { formatDateTimeSafe, formatDateSafe } from '../utils/helpers';

const ReportsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const CsvIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const PdfIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;

const Reports: React.FC = () => {
    const { albaranes, incidents, salidas, supplies } = useData();
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
                headers = ['ID Consumible', 'Nombre', 'Tipo', 'Stock Actual', 'Unidad', 'Stock Mínimo'];
                // FIX: Use nullish coalescing operator (??) to correctly handle minStock of 0.
                data = supplies.map(s => [s.id, s.name, s.type, s.quantity, s.unit, s.minStock ?? 'N/A']);
                break;
        }
        setGeneratedReport({ headers, data });
    };

    const uniqueCarriers = [...new Set(albaranes.map(a => a.carrier).concat(salidas.map(s => s.carrier)))];
    const uniqueCustomers = [...new Set(salidas.map(s => s.customer))];
    
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Generador de Reportes</h1>
            <div className="space-y-6">
                <Card title="Configurar Reporte">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div><label className="block text-sm font-medium mb-1">Tipo de Reporte</label><select name="type" value={reportFilters.type} onChange={handleFilterChange} className="w-full p-2 border rounded-md"><option value="entries">Historial de Entradas</option><option value="dispatches">Detalle de Salidas</option><option value="incidents">Resumen de Incidencias</option><option value="supplies">Inventario de Consumibles</option></select></div>
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
                        {generatedReport && <div className="space-x-2"><Button variant="secondary"><CsvIcon/>Exportar a CSV</Button><Button variant="secondary"><PdfIcon/>Exportar a PDF</Button></div>}
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