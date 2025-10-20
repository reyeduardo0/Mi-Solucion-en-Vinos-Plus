import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, useNavigate, Navigate, Outlet } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

// --- Types ---
import { Albaran, AuditLog, DispatchNote, Incident, PackModel, Role, Supply, User, WinePack } from './types';

// --- Components ---
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/Dashboard';
import GoodsReceiptList from './components/GoodsReceiptList';
import GoodsReceipt from './components/GoodsReceipt';
import GoodsReceiptDetail from './components/GoodsReceiptDetail';
import Stock from './components/Stock';
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

// --- Hooks and Context ---
import { PermissionsProvider } from './hooks/usePermissions';


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
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
                    session ? <AppContent session={session} /> : <Navigate to="/login" replace />
                }
            />
        </Routes>
    );
};


const AppContent: React.FC<{session: Session}> = ({ session }) => {
    // --- App State ---
    const [albaranes, setAlbaranes] = useState<Albaran[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [packs, setPacks] = useState<WinePack[]>([]);
    const [salidas, setSalidas] = useState<DispatchNote[]>([]);
    const [supplies, setSupplies] = useState<Supply[]>([]);
    const [packModels, setPackModels] = useState<PackModel[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        if (!session) return;
        setLoadingData(true);
        try {
            // Fetch user profile from public.users
            const { data: userProfile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profileError) throw new Error(`Error fetching user profile: ${profileError.message}`);
            if (!userProfile) throw new Error("User profile not found. Please ensure the setup script has run correctly.");
            
            const combinedUser: User = {
                id: userProfile.id,
                name: userProfile.full_name || userProfile.email,
                email: userProfile.email,
                roleId: userProfile.role_id,
            };
            setCurrentUser(combinedUser);
            
            // Fetch all other data in parallel
            const [
                rolesRes, albaranesRes, incidentsRes, packsRes, 
                dispatchNotesRes, suppliesRes, packModelsRes, 
                usersRes, auditLogsRes
            ] = await Promise.all([
                supabase.from('roles').select('*'),
                supabase.from('albaranes').select('*, pallets(*)'),
                supabase.from('incidents').select('*'),
                supabase.from('wine_packs').select('*'),
                supabase.from('dispatch_notes').select('*'),
                supabase.from('supplies').select('*'),
                supabase.from('pack_models').select('*'),
                supabase.from('users').select('*'),
                supabase.from('audit_logs').select('*')
            ]);
            
            if (rolesRes.error) throw rolesRes.error;
            setRoles(rolesRes.data || []);
            
            if (albaranesRes.error) throw albaranesRes.error;
            const fetchedAlbaranes = albaranesRes.data || [];
            // Map DB columns to camelCase for the app
            const mappedAlbaranes = fetchedAlbaranes.map((dbAlbaran: any) => ({
                id: dbAlbaran.id,
                entryDate: dbAlbaran.entrydate,
                truckPlate: dbAlbaran.truckplate,
                carrier: dbAlbaran.carrier,
                driver: dbAlbaran.driver,
                origin: dbAlbaran.origin,
                destination: dbAlbaran.destination,
                status: dbAlbaran.status,
                incidentDetails: dbAlbaran.incidentdetails,
                incidentImages: dbAlbaran.incidentimages,
                created_at: dbAlbaran.created_at,
                pallets: (dbAlbaran.pallets || []).map((dbPallet: any) => ({
                    id: dbPallet.id,
                    palletNumber: dbPallet.palletnumber,
                    sscc: dbPallet.sscc,
                    product: {
                        name: dbPallet.product_name,
                        lot: dbPallet.product_lot,
                    },
                    boxesPerPallet: dbPallet.boxesperpallet,
                    bottlesPerBox: dbPallet.bottlesperbox,
                    totalBottles: dbPallet.totalbottles,
                    eanBottle: dbPallet.eanbottle,
                    eanBox: dbPallet.eanbox,
                    labelImage: dbPallet.labelimage,
                    incident: dbPallet.incident_description ? {
                        description: dbPallet.incident_description,
                        images: dbPallet.incident_images || [],
                    } : undefined,
                    created_at: dbPallet.created_at,
                })),
            }));
            setAlbaranes(mappedAlbaranes);

            if (incidentsRes.error) throw incidentsRes.error;
            setIncidents(incidentsRes.data || []);

            if (packsRes.error) throw packsRes.error;
            setPacks(packsRes.data || []);

            if (dispatchNotesRes.error) throw dispatchNotesRes.error;
            setSalidas(dispatchNotesRes.data || []);

            if (suppliesRes.error) throw suppliesRes.error;
            setSupplies(suppliesRes.data || []);

            if (packModelsRes.error) throw packModelsRes.error;
            setPackModels(packModelsRes.data || []);

            // Map fetched users to the User type
            if (usersRes.error) throw usersRes.error;
             const allUsers = (usersRes.data || []).map(u => ({ 
                 id: u.id, 
                 name: u.full_name || u.email,
                 email: u.email, 
                 roleId: u.role_id 
            }));
            setUsers(allUsers);

            if (auditLogsRes.error) throw auditLogsRes.error;
            setAuditLogs(auditLogsRes.data || []);

        } catch (error) {
            console.error("Failed to fetch application data:", error);
            // Optionally, set an error state to show a message to the user
        } finally {
            setLoadingData(false);
        }
    }, [session]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    const addAlbaran = async (albaran: Albaran) => {
        const { pallets, ...albaranData } = albaran;
    
        const albaranToInsert = {
            id: albaranData.id,
            entrydate: albaranData.entryDate,
            truckplate: albaranData.truckPlate,
            carrier: albaranData.carrier,
            driver: albaranData.driver,
            origin: albaranData.origin,
            destination: albaranData.destination,
            status: albaranData.status,
            incidentdetails: albaranData.incidentDetails,
            incidentimages: albaranData.incidentImages,
        };

        const { data: insertedAlbaran, error: albaranError } = await supabase
            .from('albaranes')
            .insert([albaranToInsert])
            .select('id')
            .single();
    
        if (albaranError || !insertedAlbaran) {
            console.error('Error adding albaran:', albaranError);
            throw new Error(albaranError?.message || "No se pudo crear la entrada del albarán.");
        }
        
        if (pallets && pallets.length > 0) {
            const palletsToInsert = pallets.map(p => ({
                albaran_id: insertedAlbaran.id,
                palletnumber: p.palletNumber || null,
                sscc: p.sscc || null,
                product_name: p.product.name,
                product_lot: p.product.lot,
                boxesperpallet: p.boxesPerPallet || 0,
                bottlesperbox: p.bottlesPerBox || 0,
                totalbottles: (p.boxesPerPallet || 0) * (p.bottlesPerBox || 0),
                eanbottle: p.eanBottle || null,
                eanbox: p.eanBox || null,
                labelimage: p.labelImage || null,
                incident_description: p.incident?.description || null,
                incident_images: p.incident?.images || null
            }));
            
            const { error: palletsError } = await supabase.from('pallets').insert(palletsToInsert);
    
            if (palletsError) {
                console.error('Error adding pallets:', palletsError);
                // In a real app, you'd implement a transaction or delete the albaran here for consistency
                throw new Error(palletsError.message || "No se pudieron añadir los pallets.");
            }
        }
        
        await fetchData();
        navigate('/entradas');
    };
    
    const handleUpdateAlbaran = async (albaran: Albaran) => {
        const { pallets, ...albaranData } = albaran;

        const albaranToUpdate = {
            entrydate: albaranData.entryDate,
            truckplate: albaranData.truckPlate,
            carrier: albaranData.carrier,
            driver: albaranData.driver,
            origin: albaranData.origin,
            destination: albaranData.destination,
            status: albaranData.status,
            incidentdetails: albaranData.incidentDetails,
            incidentimages: albaranData.incidentImages,
        };

        const { error: albaranError } = await supabase
            .from('albaranes')
            .update(albaranToUpdate)
            .eq('id', albaranData.id);

        if (albaranError) {
            console.error('Error updating albaran:', albaranError);
            throw new Error(albaranError.message || "Error al actualizar la cabecera del albarán.");
        }

        const { error: deleteError } = await supabase
            .from('pallets')
            .delete()
            .eq('albaran_id', albaranData.id);

        if (deleteError) {
            console.error('Error deleting old pallets:', deleteError);
            throw new Error(deleteError.message || "Error al eliminar los pallets antiguos para la actualización.");
        }

        if (pallets && pallets.length > 0) {
            const palletsToInsert = pallets.map(p => ({
                albaran_id: albaranData.id,
                palletnumber: p.palletNumber || null,
                sscc: p.sscc || null,
                product_name: p.product.name,
                product_lot: p.product.lot,
                boxesperpallet: p.boxesPerPallet || 0,
                bottlesperbox: p.bottlesPerBox || 0,
                totalbottles: (p.boxesPerPallet || 0) * (p.bottlesPerBox || 0),
                eanbottle: p.eanBottle || null,
                eanbox: p.eanBox || null,
                labelimage: p.labelImage || null,
                incident_description: p.incident?.description || null,
                incident_images: p.incident?.images || null
            }));
            
            const { error: insertError } = await supabase.from('pallets').insert(palletsToInsert);

            if (insertError) {
                console.error('Error inserting new pallets:', insertError);
                throw new Error(insertError.message || "Error al insertar los nuevos pallets durante la actualización.");
            }
        }
        
        await fetchData();
        navigate('/entradas');
    };

    const handleDeleteAlbaran = async (albaranId: string) => {
        // Due to foreign key constraints, pallets must be deleted first.
        const { error: palletsError } = await supabase
            .from('pallets')
            .delete()
            .eq('albaran_id', albaranId);
    
        if (palletsError) {
            console.error('Error deleting associated pallets:', palletsError);
            throw new Error(palletsError.message || "Error al eliminar los pallets asociados.");
        }
    
        const { error: albaranError } = await supabase
            .from('albaranes')
            .delete()
            .eq('id', albaranId);
    
        if (albaranError) {
            console.error('Error deleting albaran:', albaranError);
            throw new Error(albaranError.message || "Error al eliminar la entrada del albarán.");
        }
    
        await fetchData(); // Refresh data after deletion
    };

    const addPack = async (pack: WinePack) => {
        const { error } = await supabase.from('wine_packs').insert([pack]);
        if (error) console.error('Error adding pack:', error);
        else await fetchData();
        navigate('/stock');
    };

    const addPackModel = async (model: Omit<PackModel, 'id' | 'created_at'>) => {
         const { error } = await supabase.from('pack_models').insert([model]);
        if (error) console.error('Error adding pack model:', error);
        else await fetchData();
    };

    const addNewSupply = async (supplyData: Omit<Supply, 'id' | 'created_at' | 'quantity'>) => {
        const { error } = await supabase.from('supplies').insert([{ ...supplyData, quantity: 0 }]);
        if (error) console.error('Error adding supply:', error);
        else await fetchData();
    };
    
    const addSupplyStock = async (supplyId: string, quantity: number) => {
        // This should be an RPC function for safety (e.g., increment_stock)
        const currentSupply = supplies.find(s => s.id === supplyId);
        if(!currentSupply) return;
        const newQuantity = currentSupply.quantity + quantity;
        const { error } = await supabase.from('supplies').update({ quantity: newQuantity }).eq('id', supplyId);
        if (error) console.error('Error updating supply stock:', error);
        else await fetchData();
    };

    const addIncident = async (incident: Omit<Incident, 'id' | 'date' | 'resolved' | 'created_at'>) => {
        const newIncident = { ...incident, date: new Date().toISOString(), resolved: false };
        const { error } = await supabase.from('incidents').insert([newIncident]);
        if (error) console.error('Error adding incident:', error);
        else await fetchData();
    };
    
    const resolveIncident = async (incidentId: string) => {
         const { error } = await supabase.from('incidents').update({ resolved: true }).eq('id', incidentId);
        if (error) console.error('Error resolving incident:', error);
        else await fetchData();
    };

    const handleDispatch = async (dispatchNote: Omit<DispatchNote, 'id' | 'status' | 'created_at'>) => {
        const newNote: Omit<DispatchNote, 'created_at'> = { ...dispatchNote, id: `disp-${Date.now()}`, status: 'Despachado' };
        // This should be a transaction in a real DB
        const { error: dispatchError } = await supabase.from('dispatch_notes').insert([newNote]);
        if (dispatchError) { console.error('Error creating dispatch note:', dispatchError); return; }

        const { error: packUpdateError } = await supabase.from('wine_packs').update({ status: 'Despachado' }).in('id', dispatchNote.packIds);
         if (packUpdateError) { console.error('Error updating packs status:', packUpdateError); return; }
        
        await fetchData();
        navigate('/stock');
    };
    
    // User and Role management needs to be carefully implemented
    const handleAddUser = async (user: Omit<User, 'id'>) => { console.log("Add user not implemented", user); await fetchData(); };
    const handleUpdateUser = async (user: User) => { console.log("Update user not implemented", user); await fetchData(); };
    const handleDeleteUser = async (userId: string) => { console.log("Delete user not implemented", userId); await fetchData(); };
    const handleAddRole = async (role: Omit<Role, 'id' | 'created_at'>) => {
        const { error } = await supabase.from('roles').insert([role]);
        if(error) console.error("Error adding role:", error);
        else await fetchData();
    };
    const handleUpdateRole = async (role: Role) => {
        const { error } = await supabase.from('roles').update(role).eq('id', role.id);
        if(error) console.error("Error updating role:", error);
        else await fetchData();
    };
    const handleDeleteRole = async (roleId: string) => {
        const { error } = await supabase.from('roles').delete().eq('id', roleId);
        if(error) console.error("Error deleting role:", error);
        else await fetchData();
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    if (loadingData || !currentUser) {
        return <div className="min-h-screen bg-brand-light flex justify-center items-center"><Spinner /></div>;
    }

    const roleName = roles.find(r => r.id === currentUser.roleId)?.name || 'Sin Rol';

    return (
        <PermissionsProvider user={currentUser} roles={roles}>
            <div className="flex h-screen bg-gray-100">
                <div className="hidden md:flex flex-shrink-0">
                    <Sidebar />
                </div>
                
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header 
                        user={currentUser} 
                        roleName={roleName} 
                        onLogout={handleLogout} 
                        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                    />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                        <Routes>
                            <Route index element={<Dashboard albaranes={albaranes} incidents={incidents} packs={packs} salidas={salidas} navigateTo={navigate} />} />
                            <Route path="entradas" element={<GoodsReceiptList albaranes={albaranes} onDeleteAlbaran={handleDeleteAlbaran} />} />
                            <Route path="entradas/nueva" element={<GoodsReceipt onAddAlbaran={addAlbaran} />} />
                            <Route path="entradas/editar/:albaranId" element={<GoodsReceipt onAddAlbaran={addAlbaran} onUpdateAlbaran={handleUpdateAlbaran} albaranes={albaranes} />} />
                            <Route path="entradas/:albaranId" element={<GoodsReceiptDetail albaranes={albaranes} />} />
                            <Route path="stock" element={<Stock albaranes={albaranes} supplies={supplies} packs={packs} onAddNewSupply={addNewSupply} onAddSupplyStock={addSupplyStock} />} />
                            <Route path="packing" element={<CreatePack albaranes={albaranes} packModels={packModels} onAddPack={addPack}/>} />
                            <Route path="modelos-pack" element={<PackModels models={packModels} supplies={supplies} onAddModel={addPackModel} />} />
                            <Route path="salidas" element={<Dispatch packs={packs} onDispatch={handleDispatch} />} />
                            <Route path="etiquetas" element={<GenerateLabels />} />
                            <Route path="incidencias" element={<Incidents incidents={incidents} onAddIncident={addIncident} onResolveIncident={resolveIncident} />} />
                            <Route path="reportes" element={<Reports albaranes={albaranes} incidents={incidents} packs={packs} salidas={salidas} supplies={supplies} />} />
                            <Route path="trazabilidad" element={<Traceability packs={packs} albaranes={albaranes} salidas={salidas} />} />
                            <Route path="usuarios" element={<Users users={users} roles={roles} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} onAddRole={handleAddRole} onUpdateRole={handleUpdateRole} onDeleteRole={handleDeleteRole} />} />
                            <Route path="auditoria" element={<Audit logs={auditLogs} users={users} />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </PermissionsProvider>
    );
};

export default App;