import React, { useState, useMemo } from 'react';
import { Incident, IncidentType } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';

// --- Icons ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const formatDateTimeSafe = (dateString?: string): string => {
    if (!dateString) return 'Fecha inválida';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};

// --- Child Components ---

const StatusBadge: React.FC<{ resolved: boolean }> = ({ resolved }) => {
    const isResolved = resolved;
    const bgColor = isResolved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    const dotColor = isResolved ? 'bg-green-500' : 'bg-yellow-500';
    const text = isResolved ? 'Resuelta' : 'Pendiente';

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
            <svg className={`-ml-0.5 mr-1.5 h-2 w-2 ${dotColor}`} fill="currentColor" viewBox="0 0 8 8">
                <circle cx={4} cy={4} r={3} />
            </svg>
            {text}
        </span>
    );
};

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pt-2 pb-2 z-10">
                <h3 className="text-xl font-bold">{title}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
            </div>
            {children}
        </div>
    </div>
);

const AddIncidentModal: React.FC<{
    onSave: (incident: Omit<Incident, 'id'|'date'|'resolved'>) => void;
    onClose: () => void;
}> = ({ onSave, onClose }) => {
    const [type, setType] = useState<IncidentType>(IncidentType.Receiving);
    const [relatedId, setRelatedId] = useState('');
    const [description, setDescription] = useState('');
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setImageFiles(files);
            const previews = await Promise.all(files.map(fileToBase64));
            setImagePreviews(previews);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const imagesBase64 = await Promise.all(imageFiles.map(fileToBase64));
        onSave({ type, relatedId, description, images: imagesBase64 });
        onClose();
    };

    return (
        <Modal title="Registrar Nueva Incidencia" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-sm font-medium">Tipo de Incidencia</label><select value={type} onChange={e => setType(e.target.value as IncidentType)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2">{Object.values(IncidentType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div><label className="block text-sm font-medium">ID Relacionado</label><input type="text" value={relatedId} onChange={e => setRelatedId(e.target.value)} placeholder="Ej: alb-001, pack-002" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                </div>
                <div><label className="block text-sm font-medium">Descripción</label><textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div>
                    <label className="block text-sm font-medium mb-2">Adjuntar Imágenes</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <CameraIcon />
                            <div className="flex text-sm text-gray-600"><label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-yellow-600 hover:text-yellow-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-yellow-500"><span>Cargar archivos</span><input id="file-upload" name="file-upload" type="file" multiple accept="image/*" className="sr-only" onChange={handleImageChange} /></label><p className="pl-1">o arrastrar y soltar</p></div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
                        </div>
                    </div>
                </div>
                {imagePreviews.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">{imagePreviews.map((src, i) => <img key={i} src={src} alt={`Preview ${i}`} className="h-24 w-24 object-cover rounded-md" />)}</div>}
                <div className="flex justify-end space-x-3 pt-4 border-t"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Guardar Incidencia</Button></div>
            </form>
        </Modal>
    );
};


// --- Main Component ---
interface IncidentsProps {
    incidents: Incident[];
    onAddIncident: (incident: Omit<Incident, 'id' | 'date' | 'resolved'>) => void;
    onResolveIncident: (incidentId: string) => void;
}

const Incidents: React.FC<IncidentsProps> = ({ incidents, onAddIncident, onResolveIncident }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: 'Pendiente',
        type: 'Todos',
        startDate: '',
        endDate: ''
    });

    const filteredIncidents = useMemo(() => {
        return incidents.filter(incident => {
            const statusMatch = filters.status === 'Todos' || (filters.status === 'Pendiente' && !incident.resolved) || (filters.status === 'Resuelta' && incident.resolved);
            const typeMatch = filters.type === 'Todos' || incident.type === filters.type;

            const incidentDate = new Date(incident.date);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;
            if (startDate) startDate.setHours(0,0,0,0);
            if (endDate) endDate.setHours(23,59,59,999);
            const dateMatch = (!startDate || incidentDate >= startDate) && (!endDate || incidentDate <= endDate);

            return statusMatch && typeMatch && dateMatch;
        });
    }, [incidents, filters]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {isModalOpen && <AddIncidentModal onSave={onAddIncident} onClose={() => setIsModalOpen(false)} />}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Incidencias</h1>
                <Button onClick={() => setIsModalOpen(true)}>
                    <PlusIcon /> <span className="ml-2 hidden sm:inline">Registrar Incidencia</span>
                </Button>
            </div>
            
            <Card title="Filtros" className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Estado</label><select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border rounded-md"><option>Todos</option><option>Pendiente</option><option>Resuelta</option></select></div>
                    <div><label className="block text-sm font-medium mb-1">Tipo</label><select name="type" value={filters.type} onChange={handleFilterChange} className="w-full p-2 border rounded-md"><option>Todos</option>{Object.values(IncidentType).map(t => <option key={t}>{t}</option>)}</select></div>
                    <div><label className="block text-sm font-medium mb-1">Desde</label><input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md" /></div>
                    <div><label className="block text-sm font-medium mb-1">Hasta</label><input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md" /></div>
                </div>
            </Card>

            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium uppercase">Tipo</th><th className="px-4 py-3 text-left text-xs font-medium uppercase">Fecha</th><th className="px-4 py-3 text-left text-xs font-medium uppercase">Descripción</th><th className="px-4 py-3 text-left text-xs font-medium uppercase">ID Rel.</th><th className="px-4 py-3 text-left text-xs font-medium uppercase">Estado</th><th className="px-4 py-3 text-right text-xs font-medium uppercase">Acciones</th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredIncidents.length > 0 ? filteredIncidents.map(inc => (
                                <tr key={inc.id}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">{inc.type}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTimeSafe(inc.date)}</td>
                                    <td className="px-4 py-4 text-sm text-gray-600 max-w-sm truncate" title={inc.description}>{inc.description}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{inc.relatedId}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm"><StatusBadge resolved={inc.resolved} /></td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Button variant="secondary" className="text-xs py-1 px-2">Ver</Button>
                                            {!inc.resolved && <Button onClick={() => onResolveIncident(inc.id)} className="text-xs py-1 px-2"><CheckCircleIcon />Resolver</Button>}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="text-center py-10 text-gray-500">No se encontraron incidencias con los filtros aplicados.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Incidents;
