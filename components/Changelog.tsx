
import React from 'react';
import Card from './ui/Card';

const changelogData = [
    {
        version: '1.8.3',
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
        changes: [
            { type: 'fix', text: 'Implementación completa de códigos de producto y ajuste de inventario.' },
            { type: 'improvement', text: 'Actualización forzada para garantizar despliegue en producción.' },
        ]
    },
    {
        version: '1.8.2',
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
        changes: [
            { type: 'fix', text: 'Corrección mayor: Reescritura completa de módulos para forzar la actualización de código en GitHub.' },
            { type: 'improvement', text: 'Estabilidad garantizada en gestión de inventarios y códigos de producto.' },
        ]
    },
    {
        version: '1.8.1',
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
        changes: [
            { type: 'new', text: 'Gestión de "Lotes de Expedición" en Partes de Montaje.' },
            { type: 'new', text: 'Despacho Parcial: Selección de cantidades específicas por lote de expedición en Salidas.' },
            { type: 'improvement', text: 'Cálculo de inventario disponible en tiempo real basado en producción y despachos previos.' },
        ]
    },
    {
        version: '1.8.0',
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
        changes: [
            { type: 'new', text: 'Soporte completo para códigos de producto (Vinos) en Ajustes de Inventario.' },
            { type: 'improvement', text: 'Estandarización de nombres a mayúsculas para productos.' },
            { type: 'fix', text: 'Resincronización total de cambios en el sistema.' },
        ]
    },
    {
        version: '1.7.9',
        date: '25 de noviembre de 2025',
        changes: [
            { type: 'new', text: 'Funcionalidad de Ajuste de Inventario extendida a Productos (Vinos).' },
            { type: 'improvement', text: 'Mejora en la interfaz de fusión y renombrado masivo.' },
        ]
    },
    {
        version: '1.7.7',
        date: '25 de noviembre de 2025',
        changes: [
            { type: 'fix', text: 'Resincronización completa de código con repositorio remoto.' },
            { type: 'fix', text: 'Asegurada la limpieza de caché de despliegue.' },
        ]
    },
    {
        version: '1.7.5',
        date: '25 de noviembre de 2025',
        changes: [
            { type: 'fix', text: 'Migración completa a Variables de Entorno para configuración de Supabase.' },
            { type: 'improvement', text: 'Eliminación de configuración manual en index.html por seguridad.' },
        ]
    },
    {
        version: '1.7.2',
        date: '25 de noviembre de 2025',
        changes: [
            { type: 'fix', text: 'Corrección crítica de seguridad: Eliminación de claves API en código fuente.' },
            { type: 'improvement', text: 'Implementación estricta de variables de entorno para despliegue.' },
        ]
    },
    {
        version: '1.7.0',
        date: '25 de noviembre de 2025',
        changes: [
            { type: 'fix', text: 'Actualización mayor del sistema para sincronización de despliegue.' },
            { type: 'improvement', text: 'Optimización de carga y seguridad en variables de entorno.' },
        ]
    },
    {
        version: '1.6.6',
        date: '25 de noviembre de 2025',
        changes: [
            { type: 'fix', text: 'Eliminación total de referencias a claves API en index.html para despliegue seguro.' },
            { type: 'improvement', text: 'Configuración estricta de variables de entorno para servicios de IA.' },
        ]
    },
    {
        version: '1.6.5',
        date: '25 de noviembre de 2025',
        changes: [
            { type: 'fix', text: 'Limpieza profunda de credenciales en código fuente para pasar auditoría de seguridad de Netlify.' },
            { type: 'improvement', text: 'Validación de entorno de despliegue.' },
        ]
    },
    {
        version: '1.6.4',
        date: '25 de noviembre de 2025',
        changes: [
            { type: 'fix', text: 'Resolución de error de seguridad en despliegue: