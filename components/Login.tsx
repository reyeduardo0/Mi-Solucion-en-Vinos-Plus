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
    const [view, setView] = useState<'signIn' | 'forgotPassword'>('signIn');

    const handleAuthAction = async (action: 'login' | 'register') => {
        if (!email || (action === 'login' && !password)) {
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
                const { data: roles, error: rolesError } = await supabase!
                    .from('roles')
                    .select('id, name');

                if (rolesError || !roles) {
                    throw new Error("No se pudo obtener la lista de roles para el registro. Contacte al administrador.");
                }

                const defaultRole = roles.find(r => r.name.toLowerCase() !== 'admin') || roles[0];
                
                if (!defaultRole) {
                    throw new Error("No existen roles configurados en el sistema. Contacte al administrador.");
                }
                
                authResponse = await supabase!.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: email.split('@')[0],
                            role_id: defaultRole.id,
                        }
                    }
                });
            }

            if (authResponse.error) {
                throw authResponse.error;
            }

            if (action === 'register' && authResponse.data.user) {
                 setMessage("¡Registro exitoso! Revisa tu correo para la confirmación.");
            }
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

    const handlePasswordReset = async () => {
        if (!email) {
            setError("Por favor, introduce tu correo electrónico.");
            return;
        }
        try {
            setLoading(true);
            setError(null);
            setMessage(null);

            const { error } = await supabase!.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname,
            });

            if (error) throw error;
            
            setMessage("Si existe una cuenta con este correo, recibirás un enlace para restablecer tu contraseña.");
            setView('signIn');
        } catch (error: any) {
            console.error("Error en restablecimiento de contraseña:", error);
            setMessage("Si existe una cuenta con este correo, recibirás un enlace para restablecer tu contraseña.");
            setView('signIn');
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
                    {view === 'signIn' ? 'Inicia sesión en tu cuenta' : 'Restablece tu contraseña'}
                </p>

                <div className="bg-white p-8 rounded-lg shadow-md">
                    {view === 'signIn' ? (
                        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
                                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm" />
                            </div>
                            <div className="text-right">
                                <a href="#" onClick={(e) => { e.preventDefault(); setView('forgotPassword'); setError(null); setMessage(null); }} className="text-sm text-yellow-600 hover:text-yellow-500 hover:underline">¿Olvidaste tu contraseña?</a>
                            </div>
                            {message && <p className="text-sm text-green-600 text-center">{message}</p>}
                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                            <div className="flex items-center justify-between space-x-4 pt-2">
                                <Button type="button" onClick={() => handleAuthAction('register')} disabled={loading} className="w-full justify-center bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500">Registrarse</Button>
                                <Button type="button" onClick={() => handleAuthAction('login')} disabled={loading} className="w-full justify-center">{loading ? <Spinner /> : 'Iniciar Sesión'}</Button>
                            </div>
                        </form>
                    ) : (
                         <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                             <p className="text-sm text-gray-600 text-center">Introduce tu correo y te enviaremos instrucciones para restablecer tu contraseña.</p>
                            <div>
                                <label htmlFor="email-reset" className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                                <input id="email-reset" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm" />
                            </div>
                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                            <Button type="button" onClick={handlePasswordReset} disabled={loading} className="w-full justify-center">
                                {loading ? <Spinner /> : 'Enviar Instrucciones'}
                            </Button>
                             <div className="text-center pt-2">
                                <a href="#" onClick={(e) => { e.preventDefault(); setView('signIn'); setError(null); setMessage(null); }} className="text-sm text-yellow-600 hover:text-yellow-500 hover:underline">
                                    Volver a Iniciar Sesión
                                </a>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            <div className="absolute bottom-6 text-center w-full left-0">
                <p className="text-xs text-gray-500">Desarrollado por: Msc. Ing. Eduardo Rey</p>
            </div>
        </div>
    );
};

export default Login;