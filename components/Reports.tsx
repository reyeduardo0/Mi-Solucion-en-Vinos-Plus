import React, { useState, useMemo } from 'react';
import { Albaran, Incident, WinePack, DispatchNote, Supply } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- Icons ---
const ReportsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const EntryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h5a3 3 0 013 3v1" /></svg>;
const ExitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IncidentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const PackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m0 0v10l8 4m0-14L4 7" /></svg>;
const CsvIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const PdfIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;

const formatDateTimeSafe = (dateString?: string): string => {
    if (!dateString) return 'Fecha inválida';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};

const formatDateSafe = (dateString?: string): string => {
    if (!dateString) return 'Fecha inválida';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }
    return date.toLocaleDateString('es-ES');
};

// --- Helper Components ---
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <Card className="flex items-center p-4">
        <div className="p-3 rounded-full bg-gray-100 mr-4">{icon}</div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </Card>
);

const Modal: React.FC<{ title: string; children: React.ReactNode; onClose: () => void; }> = ({ title, children, onClose }) => (
     <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center p-5 border-b">
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
        </div>
    </div>
);


// --- Main Component ---
interface ReportsProps {
  albaranes: Albaran[];
  incidents: Incident[];
  packs: WinePack[];
  salidas: DispatchNote[];
  supplies: Supply[];
}

const Reports: React.FC<ReportsProps> = ({ albaranes, incidents, packs, salidas, supplies }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'generator'>('dashboard');
    const [modalData, setModalData] = useState<{ title: string; data: any[] | null; type: 'incidents' | 'packs' } | null>(null);

    // --- State for Report Generator ---
    const [reportFilters, setReportFilters] = useState({
        type: 'entries',
        startDate: '',
        endDate: '',
        carrier: '',
        customer: '',
        status: 'all', // For incidents or albaranes
    });
    const [generatedReport, setGeneratedReport] = useState<{ headers: string[], data: (string|number)[][] } | null>(null);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setReportFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleGenerateReport = () => {
        let headers: string[] = [];
        let data: (string|number)[][] = [];

        const startDate = reportFilters.startDate ? new Date(reportFilters.startDate) : null;
        const endDate = reportFilters.endDate ? new Date(reportFilters.endDate) : null;
        if(startDate) startDate.setHours(0,0,0,0);
        if(endDate) endDate.setHours(23,59,59,999);
        const dateFilter = (dateStr: string) => {
            if (!startDate && !endDate) return true;
            const itemDate = new Date(dateStr);
            if (isNaN(itemDate.getTime())) return false; // Exclude invalid dates
            return (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);
        }

        switch (reportFilters.type) {
            case 'entries':
                headers = ['ID Albarán', 'Fecha', 'Transportista', 'Conductor', '# Pallets', 'Estado'];
                data = albaranes
                    .filter(a => dateFilter(a.entryDate))
                    .filter(a => !reportFilters.carrier || a.carrier === reportFilters.carrier)
                    .filter(a => reportFilters.status === 'all' || a.status === reportFilters.status)
                    .map(a => [a.id, formatDateSafe(a.entryDate), a.carrier, a.driver || 'N/A', a.pallets.length, a.status]);
                break;
            case 'dispatches':
                headers = ['ID Salida', 'Fecha', 'Cliente', 'Destino', 'Transportista', '# Packs'];
                data = salidas
                    .filter(s => dateFilter(s.dispatchDate))
                    .filter(s => !reportFilters.customer || s.customer === reportFilters.customer)
                    .filter(s => !reportFilters.carrier || s.carrier === reportFilters.carrier)
                    .map(s => [s.id, formatDateSafe(s.dispatchDate), s.customer, s.destination, s.carrier, s.packIds.length]);
                break;
            case 'incidents':
                headers = ['ID Incidencia', 'Fecha', 'Tipo', 'ID Relacionado', 'Estado', 'Descripción'];
                 data = incidents
                    .filter(i => dateFilter(i.date))
                    .filter(i => reportFilters.status === 'all' || (reportFilters.status === 'resolved' ? i.resolved : !i.resolved))
                    .map(i => [i.id, formatDateTimeSafe(i.date), i.type, i.relatedId, i.resolved ? 'Resuelta' : 'Pendiente', i.description]);
                break;
            case 'supplies':
                headers = ['ID Insumo', 'Nombre', 'Tipo', 'Stock Actual', 'Unidad', 'Stock Mínimo'];
                data = supplies.map(s => [s.id, s.name, s.type, s.quantity, s.unit, s.minStock || 'N/A']);
                break;
        }

        setGeneratedReport({ headers, data });
    };

    // --- Memoized data for Dashboard ---
    const kpis = useMemo(() => ({
        totalEntries: albaranes.length,
        totalDispatches: salidas.length,
        pendingIncidents: incidents.filter(i => !i.resolved).length,
        packsReady: packs.filter(p => p.status === 'Ensamblado').length,
    }), [albaranes, salidas, incidents, packs]);

    const packStatusData = useMemo(() => {
        const assembled = packs.filter(p => p.status === 'Ensamblado').length;
        const dispatched = packs.filter(p => p.status === 'Despachado').length;
        return [
            { name: 'Ensamblado', value: assembled, color: '#3b82f6' },
            { name: 'Despachado', value: dispatched, color: '#6b7280' },
        ];
    }, [packs]);
    
    const incidentsByCarrierData = useMemo(() => {
        const carrierIncidents = new Map<string, number>();
        incidents.forEach(incident => {
            if (incident.type === 'Entrada') {
                const albaran = albaranes.find(a => a.id === incident.relatedId);
                if (albaran) {
                    carrierIncidents.set(albaran.carrier, (carrierIncidents.get(albaran.carrier) || 0) + 1);
                }
            }
        });
        return Array.from(carrierIncidents.entries()).map(([name, value]) => ({ name, Incidencias: value }));
    }, [incidents, albaranes]);

    // --- Click Handlers for Dashboard ---
    const handlePieClick = (data: any) => {
        const filteredPacks = packs.filter(p => p.status === data.name);
        setModalData({ title: `Packs con estado: ${data.name}`, data: filteredPacks, type: 'packs' });
    };

    const handleBarClick = (data: any) => {
        if (!data || !data.activePayload) return;
        const carrierName = data.activePayload[0].payload.name;
        const filteredIncidents = incidents.filter(incident => {
            const albaran = albaranes.find(a => a.id === incident.relatedId);
            return albaran && albaran.carrier === carrierName;
        });
        setModalData({ title: `Incidencias del transportista: ${carrierName}`, data: filteredIncidents, type: 'incidents' });
    };

    // --- Render Functions ---
     const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
        <button onClick={onClick} className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors duration-200 ${isActive ? 'border-brand-yellow text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{label}</button>
    );

    const renderModalContent = () => {
        if (!modalData || !modalData.data) return null;
        if (modalData.type === 'packs') {
            return (
                <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th>ID Pack</th><th>Modelo</th><th>Orden Pedido</th><th>Fecha Creación</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{(modalData.data as WinePack[]).map(p => <tr key={p.id}><td>{p.id}</td><td>{p.modelName}</td><td>{p.orderId}</td><td>{formatDateSafe(p.creationDate)}</td></tr>)}</tbody></table>
            );
        }
        if (modalData.type === 'incidents') {
            return (
                <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th>Fecha</th><th>Descripción</th><th>ID Relacionado</th><th>Estado</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{(modalData.data as Incident[]).map(i => <tr key={i.id}><td>{formatDateTimeSafe(i.date)}</td><td>{i.description}</td><td>{i.relatedId}</td><td>{i.resolved ? 'Resuelta' : 'Pendiente'}</td></tr>)}</tbody></table>
            )
        }
        return null;
    }

    const uniqueCarriers = [...new Set(albaranes.map(a => a.carrier).concat(salidas.map(s => s.carrier)))];
    const uniqueCustomers = [...new Set(salidas.map(s => s.customer))];

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {modalData && <Modal title={modalData.title} onClose={() => setModalData(null)}>{renderModalContent()}</Modal>}

            <h1 className="text-3xl font-bold text-gray-800 mb-6">Reportes y Análisis</h1>
            
            <div className="mb-4 border-b border-gray-200">
                <TabButton label="Dashboard Interactivo" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <TabButton label="Generador de Reportes" isActive={activeTab === 'generator'} onClick={() => setActiveTab('generator')} />
            </div>

            {activeTab === 'dashboard' && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <StatCard title="Total Entradas" value={kpis.totalEntries} icon={<EntryIcon />} />
                        <StatCard title="Total Salidas" value={kpis.totalDispatches} icon={<ExitIcon />} />
                        <StatCard title="Incidencias Pendientes" value={kpis.pendingIncidents} icon={<IncidentIcon />} />
                        <StatCard title="Packs Listos (Ensamb.)" value={kpis.packsReady} icon={<PackIcon />} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <Card title="Estado de Packs" className="lg:col-span-2">
                            <div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={packStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{packStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} onClick={() => handlePieClick(entry)} style={{ cursor: 'pointer' }}/>)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
                        </Card>
                         <Card title="Incidencias en Entrada por Transportista" className="lg:col-span-3">
                            <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={incidentsByCarrierData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="Incidencias" fill="#f59e0b" onClick={handleBarClick} style={{ cursor: 'pointer' }} /></BarChart></ResponsiveContainer></div>
                        </Card>
                    </div>
                </>
            )}

            {activeTab === 'generator' && (
                <div className="space-y-6">
                    <Card title="Configurar Reporte">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div><label className="block text-sm font-medium mb-1">Tipo de Reporte</label><select name="type" value={reportFilters.type} onChange={handleFilterChange} className="w-full p-2 border rounded-md"><option value="entries">Historial de Entradas</option><option value="dispatches">Detalle de Salidas</option><option value="incidents">Resumen de Incidencias</option><option value="supplies">Inventario de Insumos</option></select></div>
                            <div><label className="block text-sm font-medium mb-1">Fecha Desde</label><input type="date" name="startDate" value={reportFilters.startDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md"/></div>
                            <div><label className="block text-sm font-medium mb-1">Fecha Hasta</label><input type="date" name="endDate" value={reportFilters.endDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md"/></div>
                            {(reportFilters.type === 'entries' || reportFilters.type === 'dispatches') && <div><label className="block text-sm font-medium mb-1">Transportista</label><select name="carrier" value={reportFilters.carrier} onChange={handleFilterChange} className="w-full p-2 border rounded-md"><option value="">Todos</option>{uniqueCarriers.map(c => <option key={c} value={c}>{c}</option>)}</select></div>}
                            {reportFilters.type === 'dispatches' && <div><label className="block text-sm font-medium mb-1">Cliente</label><select name="customer" value={reportFilters.customer} onChange={handleFilterChange} className="w-full p-2 border rounded-md"><option value="">Todos</option>{uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}</select></div>}
                            {(reportFilters.type === 'entries' || reportFilters.type === 'incidents') && <div><label className="block text-sm font-medium mb-1">Estado</label><select name="status" value={reportFilters.status} onChange={handleFilterChange} className="w-full p-2 border rounded-md"><option value="all">Todos</option>{reportFilters.type === 'entries' ? <><option value="verified">Verificado</option><option value="incident">Incidencia</option></> : <><option value="pending">Pendiente</option><option value="resolved">Resuelta</option></>}</select></div>}
                        </div>
                         <div className="mt-4 flex justify-end">
                            <Button onClick={handleGenerateReport}>Generar Reporte</Button>
                        </div>
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
                                        <thead className="bg-gray-50"><tr>{generatedReport.headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase">{h}</th>)}</tr></thead>
                                        <tbody className="bg-white divide-y divide-gray-200">{generatedReport.data.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{cell}</td>)}</tr>)}</tbody>
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
            )}
        </div>
    );
};

export default Reports;
