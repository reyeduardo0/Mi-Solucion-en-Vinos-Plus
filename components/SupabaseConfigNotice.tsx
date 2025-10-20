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
                    <h2 className="text-xl font-semibold text-white mb-4">Acción Necesaria:</h2>
                    <p className="text-brand-text mb-4">
                        Para continuar, por favor abre el archivo <code className="bg-gray-900 text-yellow-300 px-2 py-1 rounded-md text-sm">index.html</code> en el editor de código.
                    </p>
                    <p className="text-brand-text mb-4">
                        Busca la sección de configuración de Supabase y reemplaza los valores de marcador de posición con tu propia URL y Clave Anónima (anon key) de tu proyecto de Supabase.
                    </p>
                    <pre className="bg-gray-900 text-white p-4 rounded-md overflow-x-auto text-sm">
                        <code>
{`<!-- PEGA AQUÍ TUS CLAVES DE SUPABASE -->
<script>
  window.SUPABASE_CONFIG = {
    URL: 'TU_SUPABASE_URL', // <-- Reemplaza esto
    ANON_KEY: 'TU_SUPABASE_ANON_KEY' // <-- Reemplaza esto
  };
</script>`}
                        </code>
                    </pre>
                     <p className="text-brand-text mt-4 text-sm">
                        Una vez que guardes los cambios en <code className="bg-gray-900 text-yellow-300 px-2 py-1 rounded-md text-sm">index.html</code>, la aplicación se recargará automáticamente.
                    </p>
                </Card>
            </div>
        </div>
    );
};

export default SupabaseConfigNotice;