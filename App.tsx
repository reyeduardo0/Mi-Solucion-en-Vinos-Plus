import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
// FIX: Changed to a type-only import for Session.
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

// --- Components ---
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/Dashboard';
import GoodsReceiptList from './components/GoodsReceiptList';
import GoodsReceipt from './components/GoodsReceipt';
import GoodsReceiptDetail from './components/GoodsReceiptDetail';
import Inventory from './components/Stock';
import CreatePack from './components/CreatePack';
import PackModels from './components/PackModels';
import Dispatch from './components/Dispatch';
import GenerateLabels from './components/GenerateLabels';
import Incidents from './components/Incidents';
import Reports from './components/Reports';
import Users from './components/Users';
import Audit from './components/Audit';
import Traceability from './components/Traceability';
import Login from './components/Login';
import SupabaseConfigNotice from './components/SupabaseConfigNotice';
import Spinner from './components/ui/Spinner';
import ProfileModal from './components/users/ProfileModal';

// --- Hooks and Context ---
import { PermissionsProvider } from './hooks/usePermissions';
import { DataProvider, useData } from './context/DataContext';

const App: React.FC = () => {
    if (!isSupabaseConfigured) {
        return <SupabaseConfigNotice />;
    }

    return (
        <HashRouter>
            <AppRoutes />
        </HashRouter>
    );
};

const AppRoutes: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase!.auth.getSession();
            setSession(session);
            setLoading(false);
        };
        
        fetchSession();

        const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return <div className="min-h-screen bg-brand-dark flex justify-center items-center"><Spinner /></div>;
    }

    return (
        <Routes>
            <Route 
                path="/login" 
                element={
                    session ? <Navigate to="/" replace /> : <Login />
                } 
            />
            <Route 
                path="/*"
                element={
                    session ? (
                        <DataProvider session={session}>
                            <AppLayout />
                        </DataProvider>
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }
            />
        </Routes>
    );
};


const AppLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);
    const navigate = useNavigate();
    
    // Consume the centralized data and user context
    const { currentUser, roles } = useData();

    const handleLogout = async () => {
        await supabase!.auth.signOut();
        navigate('/login');
    };

    if (!currentUser) {
        // This can happen briefly while the DataProvider is loading its own user data
        return <div className="min-h-screen bg-brand-light flex justify-center items-center"><Spinner /></div>;
    }

    // DEFINITIVE FIX: This robust check prevents a crash if the user's role is deleted by another admin.
    // It safely finds the role first, then accesses the name, avoiding `undefined.name`.
    const userRole = roles.find(r => r.id === currentUser.roleId);
    const roleName = userRole ? userRole.name : 'Sin Rol Asignado';

    return (
        <PermissionsProvider user={currentUser} roles={roles}>
            <div className="relative flex h-screen bg-gray-100">
                {/* Desktop Sidebar */}
                <div className="hidden md:flex flex-shrink-0">
                    <Sidebar />
                </div>
                
                {/* Mobile Sidebar & Overlay */}
                <div 
                    className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                ></div>
                <div 
                    className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <Sidebar onLinkClick={() => setIsSidebarOpen(false)} />
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header 
                        user={currentUser} 
                        roleName={roleName} 
                        onLogout={handleLogout} 
                        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                        onOpenProfile={() => setProfileModalOpen(true)}
                    />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                        <Routes>
                            <Route index element={<Dashboard />} />
                            <Route path="entradas" element={<GoodsReceiptList />} />
                            <Route path="entradas/nueva" element={<GoodsReceipt />} />
                            <Route path="entradas/editar/:albaranId" element={<GoodsReceipt />} />
                            <Route path="entradas/:albaranId" element={<GoodsReceiptDetail />} />
                            <Route path="inventario" element={<Inventory />} />
                            <Route path="packing" element={<CreatePack />} />
                            <Route path="modelos-pack" element={<PackModels />} />
                            <Route path="salidas" element={<Dispatch />} />
                            <Route path="etiquetas" element={<GenerateLabels />} />
                            <Route path="incidencias" element={<Incidents />} />
                            <Route path="reportes" element={<Reports />} />
                            <Route path="trazabilidad" element={<Traceability />} />
                            <Route path="usuarios" element={<Users />} />
                            <Route path="auditoria" element={<Audit />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                </div>
                {isProfileModalOpen && <ProfileModal onClose={() => setProfileModalOpen(false)} />}
            </div>
        </PermissionsProvider>
    );
};

export default App;