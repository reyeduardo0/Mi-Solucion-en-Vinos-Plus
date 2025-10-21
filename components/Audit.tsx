
import React, { useState, useMemo } from 'react';
import Card from './ui/Card';
import { useData } from '../context/DataContext';
import { formatDateTimeSafe } from '../utils/helpers';

const CreateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const UpdateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const LoginIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h5a3 3 0 013 3v1" /></svg>;
const GenericIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const EmptyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;

const ActionIcon: React.FC<{ action: string }> = ({ action }) => {
    const lowerCaseAction = action.toLowerCase();
    let icon = <GenericIcon />, color = 'bg-gray-400';
    if (lowerCaseAction.includes('creó') || lowerCaseAction.includes('registró')) { icon = <CreateIcon />; color = 'bg-green-500'; } 
    else if (lowerCaseAction.includes('actualizó') || lowerCaseAction.includes('resolvió')) { icon = <UpdateIcon />; color = 'bg-blue-500'; } 
    else if (lowerCaseAction.includes('eliminó')) { icon = <DeleteIcon />; color = 'bg-red-500'; } 
    else if (lowerCaseAction.includes('inició sesión')) { icon = <LoginIcon />; color = 'bg-purple-500'; }
    return <div className={`z-10 flex items-center justify-center w-8 h-8 ${color} rounded-full ring-4 ring-white`}>{React.cloneElement(icon, { className: "h-4 w-4 text-white"})}</div>;
};

const Audit: React.FC = () => {
    const { auditLogs: logs, users } = useData();
    const [filters, setFilters] = useState({ userId: '', actionQuery: '', startDate: '', endDate: '' });

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const logDate = new Date(log.timestamp);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;
            if (startDate) startDate.setHours(0, 0, 0, 0);
            if (endDate) endDate.setHours(23, 59, 59, 999);
            const userMatch = !filters.userId || log.userId === filters.userId;
            const actionMatch = !filters.actionQuery || log.action.toLowerCase().includes(filters.actionQuery.toLowerCase());
            const dateMatch = !isNaN(logDate.getTime()) && (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
            return userMatch && actionMatch && dateMatch;
        });
    }, [logs, filters]);
    
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Auditoría de Actividad</h1>
            <Card title="Filtros de Búsqueda" className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Usuario</label><select name="userId" value={filters.userId} onChange={handleFilterChange} className="w-full p-2 border rounded-md"><option value="">Todos los usuarios</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium mb-1">Acción Contiene</label><input type="text" name="actionQuery" value={filters.actionQuery} onChange={handleFilterChange} placeholder="Ej: eliminó, albarán..." className="w-full p-2 border rounded-md" /></div>
                    <div><label className="block text-sm font-medium mb-1">Desde</label><input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md" /></div>
                    <div><label className="block text-sm font-medium mb-1">Hasta</label><input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md" /></div>
                </div>
            </Card>
            <Card>
                <div className="flow-root">
                    {filteredLogs.length > 0 ? (
                        <ul role="list" className="-mb-8">
                            {filteredLogs.map((log, logIdx) => (
                                <li key={log.id}><div className="relative pb-8">{logIdx !== filteredLogs.length - 1 && (<span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />)}<div className="relative flex items-start space-x-3"><ActionIcon action={log.action} /><div className="min-w-0 flex-1"><div><div className="text-sm"><span className="font-semibold text-gray-900">{log.userName}</span></div><p className="mt-0.5 text-sm text-gray-500">{formatDateTimeSafe(log.timestamp)}</p></div><div className="mt-2 text-sm text-gray-700"><p>{log.action}</p></div></div></div></div></li>
                            ))}
                        </ul>
                    ) : (<div className="text-center py-12 flex flex-col items-center"><EmptyIcon /><h3 className="text-xl font-semibold text-gray-700 mt-4">No se encontraron registros</h3><p className="text-gray-500 mt-2">No hay registros de auditoría que coincidan con los filtros aplicados.</p></div>)}
                </div>
            </Card>
        </div>
    );
};

export default Audit;
