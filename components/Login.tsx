import React, { useState } from 'react';
import { loginWithEmailOrFallback } from '../services/authService';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

const LogoIcon = () => (
    <div className="w-14 h-14 bg-brand-yellow rounded-xl shadow-lg flex justify-center items-center mx-auto mb-4 border border-amber-300">
        <svg className="w-8 h-8 text-brand-dark" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 3h12a1 1 0 0 1 1 1v1a7 7 0 0 1-5 6.708V19h3a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2h3v-7.292A7 7 0 0 1 5 5V4a1 1 0 0 1 1-1zm1 3a5 5 0 0 0 10 0V5H7v1z"/>
        </svg>
    </div>
);

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('reyeduardo0@gmail.com');
    const [password, setPassword] = useState('123456');
    const [error, setError] = useState<string | null>(null);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Por favor, introduce el correo y la contraseña.");
            return;
        }
        try {
            setLoading(true);
            setError(null);
            await loginWithEmailOrFallback(email, password);
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.message || "No se pudo iniciar sesión. Por favor verifica tus credenciales.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4 relative">
            <div className="w-full max-w-md">
                <LogoIcon />
                <h2 className="text-2xl font-bold text-white text-center">Mi Solución en Vinos Plus</h2>
                <p className="text-sm text-gray-400 text-center mt-1 mb-6">
                    Sistema Integral de Gestión de Bodega & Inventario
                </p>

                <div className="bg-white p-8 rounded-xl shadow-2xl border border-gray-100">
                    <form className="space-y-4" onSubmit={handleEmailLogin}>
                        <div>
                            <label htmlFor="email" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                Correo Electrónico
                            </label>
                            <input 
                                id="email" 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                                placeholder="ejemplo@bodega.com"
                                className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white" 
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                Contraseña
                            </label>
                            <input 
                                id="password" 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                placeholder="••••••••"
                                className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white" 
                            />
                        </div>

                        {error && (
                          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg text-center font-medium">
                            {error}
                          </div>
                        )}
                        
                        <div className="pt-2">
                            <Button type="submit" disabled={loading} className="w-full justify-center py-2.5">
                              {loading ? <Spinner /> : 'Iniciar Sesión'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
            <div className="absolute bottom-4 text-center w-full left-0">
                <p className="text-xs text-gray-500">Desarrollado por: Msc. Ing. Eduardo Rey</p>
            </div>
        </div>
    );
};

export default Login;
