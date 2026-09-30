import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { auth, onAuthStateChanged, fbSignOut, FirebaseUser } from './services/firebase';

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
import Login from './components/Login';
import Spinner from './components/ui/Spinner';
import ProfileModal from './components/users/ProfileModal';
import Traceability from './components/Traceability';
import Audit from './components/Audit';
import Changelog from './components/Changelog';
import ProductionReports from './components/ProductionReports';
import CreateProductionReport from './components/CreateProductionReport';
import InventoryAdjustments from './components/InventoryAdjustments';
import Billing from './components/Billing';
import NeonMigrationModal from './components/NeonMigrationModal';

// --- Hooks and Context ---
import { PermissionsProvider } from './hooks/usePermissions';
import { DataProvider, useData } from './context/DataContext';

const App: React.FC = () => {
    return (
        <HashRouter>
            <AppRoutes />
        </HashRouter>
    );
};

const AppRoutes: React.FC = () => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
          <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center text-white">
            <Spinner />
            <p className="mt-4 text-sm text-gray-400">Cargando Mi Solución en Vinos...</p>
          </div>
        );
    }

    return (
        <Routes>
            <Route 
                path="/login" 
                element={
                    user ? <Navigate to="/" replace /> : <Login />
                } 
            />
            <Route 
                path="/*"
                element={
                    user ? (
                        <DataProvider authUser={user}>
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
    const [isNeonModalOpen, setIsNeonModalOpen] = useState(false);
    const navigate = useNavigate();
    
    // Centralized data and user context
    const { currentUser, roles, error } = useData();

    const handleLogout = async () => {
        try {
            await fbSignOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
        navigate('/login');
    };

    if (!currentUser || roles.length === 0) {
        return (
          <div className="min-h-screen bg-brand-light flex flex-col justify-center items-center">
            <Spinner />
            <p className="mt-4 text-sm text-gray-600">Sincronizando datos de bodega...</p>
          </div>
        );
    }

    const userRole = roles.find(r => r.id === currentUser.roleId);
    const roleName = userRole ? userRole.name : 'Sin Rol Asignado';

    return (
        <PermissionsProvider user={currentUser} roles={roles}>
            <div className="relative flex h-screen bg-gray-100 overflow-hidden">
                {/* Desktop Sidebar */}
                <div className="hidden md:flex flex-shrink-0 h-full">
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
                        onOpenNeonModal={() => setIsNeonModalOpen(true)}
                    />
                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mx-4 mt-4" role="alert">
                            <p className="font-bold">Aviso del Sistema</p>
                            <p>{error}</p>
                        </div>
                    )}
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                        <Routes>
                            <Route index element={<Dashboard />} />
                            <Route path="entradas" element={<GoodsReceiptList />} />
                            <Route path="entradas/nueva" element={<GoodsReceipt />} />
                            <Route path="entradas/editar/:albaranId" element={<GoodsReceipt />} />
                            <Route path="entradas/:albaranId" element={<GoodsReceiptDetail />} />
                            <Route path="inventario" element={<Inventory />} />
                            <Route path="ajustes-inventario" element={<InventoryAdjustments />} />
                            <Route path="packing" element={<CreatePack />} />
                            <Route path="modelos-pack" element={<PackModels />} />
                            <Route path="partes-montaje" element={<ProductionReports />} />
                            <Route path="partes-montaje/nuevo" element={<CreateProductionReport />} />
                            <Route path="partes-montaje/editar/:id" element={<CreateProductionReport />} />
                            <Route path="salidas" element={<Dispatch />} />
                            <Route path="etiquetas" element={<GenerateLabels />} />
                            <Route path="incidencias" element={<Incidents />} />
                            <Route path="reportes" element={<Reports />} />
                            <Route path="facturacion" element={<Billing />} />
                            <Route path="usuarios" element={<Users />} />
                            <Route path="trazabilidad" element={<Traceability />} />
                            <Route path="auditoria" element={<Audit />} />
                            <Route path="changelog" element={<Changelog />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                </div>
                {isProfileModalOpen && <ProfileModal onClose={() => setProfileModalOpen(false)} />}
                {isNeonModalOpen && <NeonMigrationModal isOpen={isNeonModalOpen} onClose={() => setIsNeonModalOpen(false)} />}
            </div>
        </PermissionsProvider>
    );
};

export default App;
