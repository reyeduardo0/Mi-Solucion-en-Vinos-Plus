import React from 'react';
import Card from './ui/Card';

const changelogData = [
    {
        version: '1.2.0',
        date: '05 de Agosto, 2024',
        changes: [
            { type: 'new', text: 'Módulo de Auditoría para registrar todas las acciones de los usuarios.' },
            { type: 'improvement', text: 'Optimización del cálculo de stock para un rendimiento más rápido en inventarios grandes.' },
            { type: 'fix', text: 'Solucionado un error que impedía editar consumibles sin lotes asignados.' },
        ]
    },
    {
        version: '1.1.0',
        date: '25 de Julio, 2024',
        changes: [
            { type: 'new', text: 'Módulo de Trazabilidad para seguimiento completo de lotes.' },
            { type: 'improvement', text: 'Se añade la funcionalidad de extracción de datos por IA en la creación de entradas a partir de imágenes de albaranes y etiquetas de pallets.' },
            { type: 'improvement', text: 'Interfaz de reportes mejorada con gráficos interactivos.' },
        ]
    },
    {
        version: '1.0.0',
        date: '15 de Julio, 2024',
        changes: [
            { type: 'new', text: 'Lanzamiento inicial de "Mi Solución en Vinos Plus".' },
            { type: 'new', text: 'Módulos principales: Entradas, Inventario, Creación de Packs, Salidas.' },
            { type: 'new', text: 'Gestión de Usuarios y Roles.' },
        ]
    }
];

const ChangeTypeBadge: React.FC<{ type: string }> = ({ type }) => {
    const styles = {
        new: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'NUEVO' },
        improvement: { bg: 'bg-green-100', text: 'text-green-800', label: 'MEJORA' },
        fix: { bg: 'bg-red-100', text: 'text-red-800', label: 'CORRECCIÓN' },
    };
    const style = styles[type as keyof typeof styles] || { bg: 'bg-gray-100', text: 'text-gray-800', label: type.toUpperCase() };

    return (
        <span className={`inline-block mr-2 px-2 py-0.5 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
            {style.label}
        </span>
    );
};


const Changelog: React.FC = () => {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Historial de Cambios de la Aplicación</h1>
            <Card>
                <div className="space-y-8">
                    {changelogData.map(entry => (
                        <div key={entry.version} className="border-b last:border-b-0 pb-6 last:pb-0">
                            <div className="flex items-baseline space-x-4">
                                <h2 className="text-2xl font-bold text-gray-900">Versión {entry.version}</h2>
                                <p className="text-sm font-medium text-gray-500">{entry.date}</p>
                            </div>
                            <ul className="mt-4 space-y-3 list-inside">
                                {entry.changes.map((change, index) => (
                                    <li key={index} className="flex items-start">
                                        <div className="flex-shrink-0 pt-1">
                                            <ChangeTypeBadge type={change.type} />
                                        </div>
                                        <span className="text-gray-700">{change.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default Changelog;