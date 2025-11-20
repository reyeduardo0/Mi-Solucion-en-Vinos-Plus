
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

const LogoIcon = () => (
    <div className="w-12 h-12 bg-brand-yellow rounded-md flex justify-center items-center mx-auto mb-4">
        <div className="flex space-x-1.5">
            <div className="w-1.5 h-6 bg-brand-dark rounded-full"></div>
            <div className="w-1.5 h-6 bg-brand-dark rounded-full"></div>
        </div>
    </div>
);

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Por favor, introduce el correo y la contraseña.");
            return;
        }
        try {
            setLoading(true);
            setError(null);

            const authResponse = await supabase!.auth.signInWithPassword({ email, password });

            if (authResponse.error) {
                throw authResponse.error;
            }
        } catch (error: any) {
            if (error.message.includes("Invalid login credentials")) {
                setError("Correo o contraseña incorrectos.");
            } else if (error.message.includes("Email not confirmed")) {
                setError("El correo electrónico no ha sido confirmado. Pida al administrador que confirme su cuenta o ejecute el script SQL.");
            } else {
                setError(error.error_description || error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4 relative">
            <div className="w-full max-w-sm">
                <LogoIcon />
                <h2 className="text-2xl font-bold text-white text-center">Mi Solución en Vinos</h2>
                <p className="text-sm text-gray-400 text-center mt-1 mb-6">
                    Inicia sesión en tu cuenta
                </p>

                <div className="bg-white p-8 rounded-lg shadow-md">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
                            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm" />
                        </div>

                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                        
                        <div>
                            <Button type="submit" disabled={loading} className="w-full justify-center">{loading ? <Spinner /> : 'Iniciar Sesión'}</Button>
                        </div>
                    </form>
                </div>
            </div>
            <div className="absolute bottom-6 text-center w-full left-0">
                <p className="text-xs text-gray-500">Desarrollado por: Msc. Ing. Eduardo Rey</p>
            </div>
        </div>
    );
};

export default Login;
