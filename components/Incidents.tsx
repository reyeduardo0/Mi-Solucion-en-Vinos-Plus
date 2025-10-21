

import React, { useState, useMemo } from 'react';
import { Incident, IncidentType } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import StatusBadge from './ui/StatusBadge';
import { useData } from '../context/DataContext';
import { fileToBase64, formatDateTimeSafe } from '../utils/helpers';
import ConfirmationModal from './ui/ConfirmationModal';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
// FIX: Update CheckCircleIcon to accept SVG props to allow passing className.
const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const IncidentModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const { addIncident, albaranes, packs } = useData();
    const [newIncidentType, setNewIncidentType] = useState<IncidentType>(IncidentType.Receiving);
    const [newIncidentDescription, setNewIncidentDescription] = useState('');
    const [newIncidentRelatedId, setNewIncidentRelatedId] = useState('');
    const [newIncidentImages, setNewIncidentImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    
    const relatedIdOptions = useMemo(() => {
        switch (newIncidentType) {
            case IncidentType.Receiving: return albaranes.map(a => ({ value: a.id, label: `Albarán ${a.id}` }));
            case IncidentType.Packing: return packs.map(p => ({ value: p.id, label: `Pack ${p.id}` }));
            case IncidentType.Dispatch: return []; // Assuming dispatch notes are not selectable yet
            default: return [];
        }
    }, [newIncidentType, albaranes, packs]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setNewIncidentImages(files);
            // Create previews
            // FIX: Explicitly type 'file' as File to resolve type inference issue.
            const previews = await Promise.all(files.map(async (file: File) => {
                const base64 = await fileToBase64(file);
                // The fileToBase64 helper now returns only the base64 part.
                return `data:${file.type};base64,${base64}`;
            }));
            setImagePreviews(previews);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIncidentType || !newIncidentDescription || !newIncidentRelatedId) {
            alert("Por favor, complete todos los campos requeridos.");
            return;
        }

        let imagesBase64: string[] = [];
        if (newIncidentImages.length > 0) {
            imagesBase64 = await Promise.all(newIncidentImages.map(fileToBase64));
        }

        await addIncident({
            type: newIncidentType,
            description: newIncidentDescription,
            images: imagesBase64,
            relatedId: newIncidentRelatedId,
        });
        
        onClose();
    };

    return (
        <Modal title="Registrar Nueva Incidencia" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium">Tipo de Incidencia</label><select value={newIncidentType} onChange={e => setNewIncidentType(e.target.value as IncidentType)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value={IncidentType.Receiving}>Entrada</option><option value={IncidentType.Packing}>Elaboración de Pack</option><option value={IncidentType.Dispatch}>Salida</option></select></div>
                <div><label className="block text-sm font-medium">ID Relacionado</label><select value={newIncidentRelatedId} onChange={e => setNewIncidentRelatedId(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value="">Seleccionar...</option>{relatedIdOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
                <div><label className="block text-sm font-medium">Descripción</label><textarea value={newIncidentDescription} onChange={e => setNewIncidentDescription(e.target.value)} required rows={4} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"></textarea></div>
                <div><label className="block text-sm font-medium">Adjuntar Imágenes</label><input type="file" multiple accept="image/*" onChange={handleImageChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"/></div>
                {imagePreviews.length > 0 && (<div className="flex flex-wrap gap-2">{imagePreviews.map((src, i) => <img key={i} src={src} alt={`preview ${i}`} className="h-24 w-24 object-cover rounded-md" />)}</div>)}
                <div className="flex justify-end space-x-3 pt-4 border-t"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Guardar Incidencia</Button></div>
            </form>
        </Modal>
    );
};


const Incidents: React.FC = () => {
    const { incidents, resolveIncident } = useData();
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
    const [incidentToResolve, setIncidentToResolve] = useState<Incident | null>(null);
    
    const filteredIncidents = useMemo(() => {
        const sorted = [...incidents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (filter === 'all') return sorted;
        if (filter === 'pending') return sorted.filter(i => !i.resolved);
        if (filter === 'resolved') return sorted.filter(i => i.resolved);
        return sorted;
    }, [incidents, filter]);

    const handleConfirmResolve = () => {
        if (incidentToResolve) {
            resolveIncident(incidentToResolve.id);
            setIncidentToResolve(null);
        }
    };

    const FilterButton: React.FC<{ label: string; value: typeof filter; }> = ({ label, value }) => (
        <button onClick={() => setFilter(value)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === value ? 'bg-brand-yellow text-brand-dark' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{label}</button>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {showModal && <IncidentModal onClose={() => setShowModal(false)} />}
            {incidentToResolve && <ConfirmationModal title="Confirmar Resolución" message={`¿Estás seguro de que quieres marcar la incidencia "${incidentToResolve.id}" como resuelta?`} onConfirm={handleConfirmResolve} onCancel={() => setIncidentToResolve(null)} confirmText="Sí, marcar como resuelta" />}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Historial de Incidencias</h1>
                <Button onClick={() => setShowModal(true)}><PlusIcon /> <span className="ml-2">Nueva Incidencia</span></Button>
            </div>
            <Card>
                <div className="flex space-x-2 mb-4 p-1 bg-gray-200 rounded-lg">
                    <FilterButton label="Pendientes" value="pending" />
                    <FilterButton label="Resueltas" value="resolved" />
                    <FilterButton label="Todas" value="all" />
                </div>
                <div className="space-y-4">
                    {filteredIncidents.length > 0 ? (
                        filteredIncidents.map(incident => (
                            <div key={incident.id} className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center space-x-3 mb-1">
                                            <StatusBadge status={incident.resolved ? 'Resuelta' : 'Pendiente'} />
                                            <p className="font-semibold text-gray-800">{incident.type}</p>
                                        </div>
                                        <p className="text-sm text-gray-500">ID Incidencia: {incident.id} | ID Relacionado: {incident.relatedId} | Fecha: {formatDateTimeSafe(incident.date)}</p>
                                    </div>
                                    {!incident.resolved && <Button onClick={() => setIncidentToResolve(incident)} variant="secondary" className="text-xs py-1.5"><CheckCircleIcon className="mr-1 h-4 w-4"/> Marcar como Resuelta</Button>}
                                </div>
                                <p className="mt-2 text-gray-700">{incident.description}</p>
                                {incident.images.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{incident.images.map((img, i) => <img key={i} src={`data:image/jpeg;base64,${img}`} alt={`evidence ${i}`} className="h-20 w-20 object-cover rounded-md border" />)}</div>}
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">No hay incidencias para mostrar con el filtro actual.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Incidents;