
import React from 'react';
import Card from './ui/Card';

const LogoIcon = () => (
    <div className="w-16 h-16 bg-brand-yellow rounded-lg flex justify-center items-center mx-auto mb-6">
        <div className="flex space-x-2">
            <div className="w-2 h-8 bg-brand-dark rounded-full"></div>
            <div className="w-2 h-8 bg-brand-dark rounded-full"></div>
        </div>
    </div>
);


const SupabaseConfigNotice: React.FC = () => {
    return (
        <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-2xl">
                 <LogoIcon />
                <h1 className="text-3xl font-bold text-center text-white mb-2">Configuración Requerida</h1>
                 <p className="text-center text-brand-text mb-8">La aplicación necesita conectarse a tu base de datos Supabase.</p>
                <Card className="bg-gray-800 border border-yellow-500">
                    <h2 className="text-xl font-semibold text-white mb-4">Acción Necesaria (Variables de Entorno):</h2>
                    <p className="text-brand-text mb-4">
                        Esta aplicación utiliza variables de entorno para la configuración de seguridad.
                    </p>
                    <p className="text-brand-text mb-4">
                        Si estás en desarrollo local, crea un archivo <code className="bg-gray-900 text-yellow-300 px-2 py-1 rounded-md text-sm">.env</code> en la raíz del proyecto.
                        Si estás en Netlify, ve a <strong>Site configuration > Environment variables</strong>.
                    </p>
                    <pre className="bg-gray-900 text-white p-4 rounded-md overflow-x-auto text-sm">
                        <code>
{`VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-larga`}
                        </code>
                    </pre>
                     <p className="text-brand-text mt-4 text-sm">
                        Una vez configuradas las variables, reinicia el servidor de desarrollo o redespliega la aplicación.
                    </p>
                </Card>
            </div>
        </div>
    );
};

export default SupabaseConfigNotice;
