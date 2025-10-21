
import React from 'react';

type StatusType = 
  | 'pending' | 'verified' | 'incident' // Albaran status
  | 'Correcto' | 'Bajo Stock' // Supply status
  | 'Ensamblado' | 'Despachado' // Pack status
  | 'Pendiente' | 'Resuelta'; // Incident status

interface StatusBadgeProps {
  status: StatusType;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const statusMap: Record<string, { text: string; color: string; dot?: string }> = {
        // Albaran
        pending: { text: 'Pendiente', color: 'bg-gray-100 text-gray-800' },
        verified: { text: 'Verificado', color: 'bg-green-100 text-green-800' },
        incident: { text: 'Incidencia', color: 'bg-yellow-100 text-yellow-800' },
        // Supply
        'Correcto': { text: 'Correcto', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
        'Bajo Stock': { text: 'Bajo Stock', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
        // Pack
        'Ensamblado': { text: 'Ensamblado', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
        'Despachado': { text: 'Despachado', color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500' },
        // Incident
        'Pendiente': { text: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
        'Resuelta': { text: 'Resuelta', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
    };

    const { text, color, dot } = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
            {dot && (
                <svg className={`-ml-0.5 mr-1.5 h-2 w-2 ${dot}`} fill="currentColor" viewBox="0 0 8 8">
                    <circle cx={4} cy={4} r={3} />
                </svg>
            )}
            {text}
        </span>
    );
};

export default StatusBadge;
