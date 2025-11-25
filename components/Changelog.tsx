
import React from 'react';
import Card from './ui/Card';

const changelogData = [
    {
        version: '1.5.10',
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
        changes: [
            { type: 'fix', text: 'Solución definitiva error width(-1) en gráficos usando estilos en línea.' },
            { type: 'improvement', text: 'Estabilización del Dashboard para evitar errores de renderizado.' },
        ]
    },
    {
        version: '1.5.9',
        date: '24 de Agosto, 2024',
        changes: [
            { type: 'fix', text: 'Corrección de estabilidad en gráficos del Dashboard (99% width).' },
            { type: 'improvement', text: 'Sincronización general de componentes para despliegue.' },
        ]
    },
    {
        version: '1.5.8',
        date: '24 de Agosto, 2024',
        changes: [
            { type: 'fix', text: 'Corrección definitiva del contenedor de gráficos del Dashboard.' },
            { type: 'fix', text: 'Sincronización de código de producción para corrección de nombres.' },
        ]
    },
    {
        version: '1.5.7',
        date: '24 de Agosto, 2024',
        changes: [
            { type: 'fix', text: 'Solución definitiva a error de ancho en gráfico del Dashboard.' },
            { type: 'fix', text: 'Actualización forzada para corregir nombres en Partes de Montaje.' },
        ]
    },
    {
        version: '1.5.6',
        date: '24 de Agosto, 2024',
        changes: [
            { type: 'fix', text: 'Resolución definitiva del error visual en gráficos del Dashboard.' },
            { type: 'fix', text: 'Forzado de actualización en GitHub para reflejar cambios en nombres de consumibles.' },
            { type: 'improvement', text: 'Estabilidad mejorada en la carga de reportes de producción.' },
        ]
    },
    {
        version: '1.5.5',
        date: '24 de Agosto, 2024',
        changes: [
            { type: 'fix', text: 'Actualización crítica para forzar la sincronización de código en producción.' },
            { type: 'fix', text: 'Corrección del error de ancho en gráficos del Dashboard.' },
            { type: 'improvement', text: 'Visualización actualizada de códigos de consumibles en Partes de Montaje.' },
        ]
    },
    {
        version: '1.5.4',
        date: '24 de Agosto, 2024',
        changes: [
            { type: 'fix', text: 'Actualización forzada: Corrección visual en Partes de Montaje para nombres de consumibles.' },
            { type: 'fix', text: 'Solución robusta para error de ancho en gráfico del Dashboard.' },
            { type: 'improvement', text: 'Sincronización de código asegurada para despliegue en GitHub.' },
        ]
    },
    {
        version: '1.5.1',
        date: '23 de Agosto, 2024',
        changes: [
            { type: 'fix', text: 'Corrección en nombres de consumibles desactualizados en Partes de Montaje y Modelos.' },
            { type: 'fix', text: 'Solución a error de renderizado en gráfico de Dashboard.' },
            { type: 'improvement', text: 'Sincronización robusta de nombres al editar inventario.' },
        ]
    },
    {
        version: '1.5.0',
        date: '22 de Agosto, 2024',
        changes: [
            { type: 'new', text: 'Nuevo Módulo de Ajustes de Inventario: Estandarización de nombres y códigos.' },
            { type: 'new', text: 'Herramienta de Fusión de Duplicados para unificar stocks.' },
            { type: 'improvement', text: 'Visualización de Códigos de Artículo en el Inventario.' },
        ]
    },
    {
        version: '1.4.0',
        date: '15 de Agosto, 2024',
        changes: [
            { type: 'new', text: 'Reportes de Rendimiento de Producción añadidos.' },
            { type: 'new', text: 'Funcionalidad para imprimir "Parte de Montaje" en PDF (diseño Excel).' },
            { type: 'fix', text: 'Asegurada la persistencia de la tabla de partes de montaje.' },
        ]
    },
    {
        version: '1.3.3',
        date: '10 de Agosto, 2024',
        changes: [
            { type: 'fix', text: 'Actualización forzada de componentes para asegurar sincronización con repositorio Git.' },
            { type: 'improvement', text: 'Mejoras visuales (tooltips) en botón de creación de packs para indicar estado deshabilitado.' },
            { type: 'fix', text: 'Lógica de "Max" en asignación de lotes ajustada para recálculo dinámico.' },
        ]
    },
    {
        version: '1.3.2',
        date: '08 de Agosto, 2024',
        changes: [
            { type: 'fix', text: 'Sincronización con GitHub y mejoras en UX de asignación de lotes para grandes volúmenes.' },
            { type: 'improvement', text: 'Visualización mejorada de cantidades restantes en modal de creación de packs.' },
            { type: 'new', text: 'Integración de IA (Gemini) en Entradas: Lectura automática de albaranes completa.' },
        ]
    },
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
