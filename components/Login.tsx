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
    const [message, setMessage] = useState<string | null>(null);

    const handleAuthAction = async (action: 'login' | 'register') => {
        if (!email || !password) {
            setError("Por favor, introduce el correo y la contraseña.");
            return;
        }
        try {
            setLoading(true);
            setError(null);
            setMessage(null);

            let authResponse;
            if (action === 'login') {
                authResponse = await supabase!.auth.signInWithPassword({ email, password });
            } else {
                authResponse = await supabase!.auth.signUp({ email, password });
            }

            if (authResponse.error) {
                throw authResponse.error;
            }

            if (action === 'register' && authResponse.data.user) {
                 setMessage("¡Registro exitoso! Revisa tu correo para la confirmación.");
            }
            // For login, the onAuthStateChange listener in App.tsx will handle navigation
        } catch (error: any) {
            if (error.message.includes("User already registered")) {
                setError("Este correo electrónico ya está registrado.");
            } else if (error.message.includes("Invalid login credentials")) {
                setError("Correo o contraseña incorrectos.");
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
                <p className="text-sm text-gray-400 text-center mt-1 mb-6">Inicia sesión en tu cuenta</p>

                <div className="bg-white p-8 rounded-lg shadow-md">
                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                            />
                        </div>

                        <div className="text-right">
                            <a href="#" className="text-sm text-yellow-600 hover:text-yellow-500 hover:underline">¿Olvidaste tu contraseña?</a>
                        </div>

                        {message && <p className="text-sm text-green-600 text-center">{message}</p>}
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                        <div className="flex items-center justify-between space-x-4 pt-2">
                            <Button
                                type="button"
                                onClick={() => handleAuthAction('register')}
                                disabled={loading}
                                className="w-full justify-center bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500"
                            >
                                Registrarse
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleAuthAction('login')}
                                disabled={loading}
                                className="w-full justify-center"
                            >
                                {loading ? <Spinner /> : 'Iniciar Sesión'}
                            </Button>
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