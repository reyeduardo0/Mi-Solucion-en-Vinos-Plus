
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Albaran, AuditLog, DispatchNote, Incident, PackModel, Role, Supply, User, WinePack, Pallet } from '../types';
import Spinner from '../components/ui/Spinner';

// --- TYPE DEFINITIONS ---
interface DataContextType {
    currentUser: User | null;
    albaranes: Albaran[];
    incidents: Incident[];
    packs: WinePack[];
    salidas: DispatchNote[];
    supplies: Supply[];
    packModels: PackModel[];
    users: User[];
    roles: Role[];
    auditLogs: AuditLog[];
    loadingData: boolean;
    addAlbaran: (albaran: Albaran) => Promise<void>;
    updateAlbaran: (albaran: Albaran) => Promise<void>;
    deleteAlbaran: (albaranId: string) => Promise<void>;
    addPack: (pack: WinePack) => Promise<void>;
    addPackModel: (model: Omit<PackModel, 'id' | 'created_at'>) => Promise<void>;
    addNewSupply: (supplyData: Omit<Supply, 'id' | 'created_at' | 'quantity'>) => Promise<void>;
    addSupplyStock: (supplyId: string, quantity: number) => Promise<void>;
    addIncident: (incident: Omit<Incident, 'id' | 'date' | 'resolved' | 'created_at'>) => Promise<void>;
    resolveIncident: (incidentId: string) => Promise<void>;
    handleDispatch: (dispatchNote: Omit<DispatchNote, 'id' | 'status' | 'created_at'>) => Promise<void>;
    handleAddUser: (user: Omit<User, 'id'>) => Promise<void>;
    handleUpdateUser: (user: User) => Promise<void>;
    handleDeleteUser: (userId: string) => Promise<void>;
    handleAddRole: (role: Omit<Role, 'id' | 'created_at'>) => Promise<void>;
    handleUpdateRole: (role: Role) => Promise<void>;
    handleDeleteRole: (roleId: string) => Promise<void>;
}

// --- DATA MAPPING HELPERS ---
const mapPalletFromDb = (dbPallet: any): Pallet => ({
    id: dbPallet.id,
    palletNumber: dbPallet.palletnumber,
    sscc: dbPallet.sscc,
    product: { name: dbPallet.product_name, lot: dbPallet.product_lot },
    boxesPerPallet: dbPallet.boxesperpallet,
    bottlesPerBox: dbPallet.bottlesperbox,
    totalBottles: dbPallet.totalbottles,
    eanBottle: dbPallet.eanbottle,
    eanBox: dbPallet.eanbox,
    labelImage: dbPallet.labelimage,
    incident: dbPallet.incident_description ? { description: dbPallet.incident_description, images: dbPallet.incident_images || [] } : undefined,
    created_at: dbPallet.created_at,
});

const mapAlbaranFromDb = (dbAlbaran: any): Albaran => ({
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
    pallets: (dbAlbaran.pallets || []).map(mapPalletFromDb),
});

const mapUserFromDb = (dbUser: any): User => ({
    id: dbUser.id,
    name: dbUser.full_name || dbUser.email,
    email: dbUser.email,
    roleId: dbUser.role_id,
});


// --- CONTEXT & HOOK ---
const DataContext = createContext<DataContextType | undefined>(undefined);
export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within a DataProvider");
    return context;
};


// --- PROVIDER COMPONENT ---
interface DataProviderProps {
    children: ReactNode;
    session: Session;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children, session }) => {
    const [loadingData, setLoadingData] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [albaranes, setAlbaranes] = useState<Albaran[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [packs, setPacks] = useState<WinePack[]>([]);
    const [salidas, setSalidas] = useState<DispatchNote[]>([]);
    const [supplies, setSupplies] = useState<Supply[]>([]);
    const [packModels, setPackModels] = useState<PackModel[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

    const fetchData = useCallback(async () => {
        if (!session || !supabase) return;
        setLoadingData(true);
        try {
            const { data: userProfile, error: profileError } = await supabase.from('users').select('*').eq('id', session.user.id).single();
            if (profileError) throw new Error(`Error fetching user profile: ${profileError.message}`);
            if (!userProfile) throw new Error("User profile not found.");
            
            setCurrentUser(mapUserFromDb(userProfile));
            
            const [ rolesRes, albaranesRes, incidentsRes, packsRes, dispatchNotesRes, suppliesRes, packModelsRes, usersRes, auditLogsRes ] = await Promise.all([
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
            
            if (rolesRes.error) throw rolesRes.error; setRoles(rolesRes.data || []);
            if (albaranesRes.error) throw albaranesRes.error; setAlbaranes((albaranesRes.data || []).map(mapAlbaranFromDb));
            if (incidentsRes.error) throw incidentsRes.error; setIncidents(incidentsRes.data || []);
            if (packsRes.error) throw packsRes.error; setPacks(packsRes.data || []);
            if (dispatchNotesRes.error) throw dispatchNotesRes.error; setSalidas(dispatchNotesRes.data || []);
            if (suppliesRes.error) throw suppliesRes.error; setSupplies(suppliesRes.data || []);
            if (packModelsRes.error) throw packModelsRes.error; setPackModels(packModelsRes.data || []);
            if (usersRes.error) throw usersRes.error; setUsers((usersRes.data || []).map(mapUserFromDb));
            if (auditLogsRes.error) throw auditLogsRes.error; setAuditLogs(auditLogsRes.data || []);

        } catch (error) {
            console.error("Failed to fetch application data:", error);
        } finally {
            setLoadingData(false);
        }
    }, [session]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const wrapApiCall = async (apiCall: () => Promise<any>) => {
        try {
            await apiCall();
            await fetchData();
        } catch (error: any) {
            console.error("API call failed:", error);
            // Re-throw to be caught by UI component
            throw error;
        }
    };
    
    // --- MUTATION FUNCTIONS ---
    const addAlbaran = async (albaran: Albaran) => wrapApiCall(async () => {
        const { pallets, ...albaranData } = albaran;
        const albaranToInsert = { id: albaranData.id, entrydate: albaranData.entryDate, truckplate: albaranData.truckPlate, carrier: albaranData.carrier, driver: albaranData.driver, origin: albaranData.origin, destination: albaranData.destination, status: albaranData.status, incidentdetails: albaranData.incidentDetails, incidentimages: albaranData.incidentImages, };
        const { data, error } = await supabase!.from('albaranes').insert(albaranToInsert).select('id').single();
        if (error || !data) throw error || new Error("Failed to create albaran entry.");

        if (pallets?.length) {
            const palletsToInsert = pallets.map(p => ({ albaran_id: data.id, palletnumber: p.palletNumber, product_name: p.product.name, product_lot: p.product.lot, boxesperpallet: p.boxesPerPallet, bottlesperbox: p.bottlesPerBox, totalbottles: (p.boxesPerPallet || 0) * (p.bottlesPerBox || 0), sscc: p.sscc, eanbottle: p.eanBottle, eanbox: p.eanBox, labelimage: p.labelImage, incident_description: p.incident?.description, incident_images: p.incident?.images }));
            const { error: palletsError } = await supabase!.from('pallets').insert(palletsToInsert);
            if (palletsError) throw palletsError;
        }
    });

    const updateAlbaran = async (albaran: Albaran) => wrapApiCall(async () => {
        const { pallets, ...albaranData } = albaran;
        const albaranToUpdate = { entrydate: albaranData.entryDate, truckplate: albaranData.truckPlate, carrier: albaranData.carrier, driver: albaranData.driver, origin: albaranData.origin, destination: albaranData.destination, status: albaranData.status, incidentdetails: albaranData.incidentDetails, incidentimages: albaranData.incidentImages };
        const { error: albaranError } = await supabase!.from('albaranes').update(albaranToUpdate).eq('id', albaranData.id);
        if (albaranError) throw albaranError;

        const { error: deleteError } = await supabase!.from('pallets').delete().eq('albaran_id', albaranData.id);
        if (deleteError) throw deleteError;

        if (pallets?.length) {
            const palletsToInsert = pallets.map(p => ({ albaran_id: albaranData.id, palletnumber: p.palletNumber, product_name: p.product.name, product_lot: p.product.lot, boxesperpallet: p.boxesPerPallet, bottlesperbox: p.bottlesPerBox, totalbottles: (p.boxesPerPallet || 0) * (p.bottlesPerBox || 0), sscc: p.sscc, eanbottle: p.eanBottle, eanbox: p.eanBox, labelimage: p.labelImage, incident_description: p.incident?.description, incident_images: p.incident?.images }));
            const { error: insertError } = await supabase!.from('pallets').insert(palletsToInsert);
            if (insertError) throw insertError;
        }
    });
    
    const deleteAlbaran = async (albaranId: string) => wrapApiCall(async () => {
        const { error: palletsError } = await supabase!.from('pallets').delete().eq('albaran_id', albaranId);
        if (palletsError) throw palletsError;
        const { error: albaranError } = await supabase!.from('albaranes').delete().eq('id', albaranId);
        if (albaranError) throw albaranError;
    });

    const addPack = (pack: WinePack) => wrapApiCall(() => supabase!.from('wine_packs').insert([pack]));
    const addPackModel = (model: Omit<PackModel, 'id' | 'created_at'>) => wrapApiCall(() => supabase!.from('pack_models').insert([model]));
    const addNewSupply = (supply: Omit<Supply, 'id'|'created_at'|'quantity'>) => wrapApiCall(() => supabase!.from('supplies').insert([{ ...supply, quantity: 0 }]));
    const addSupplyStock = (supplyId: string, quantity: number) => wrapApiCall(async () => {
        const current = supplies.find(s => s.id === supplyId);
        if (!current) throw new Error("Supply not found");
        return supabase!.from('supplies').update({ quantity: current.quantity + quantity }).eq('id', supplyId);
    });
    const addIncident = (incident: Omit<Incident, 'id'|'date'|'resolved'|'created_at'>) => wrapApiCall(() => supabase!.from('incidents').insert([{ ...incident, date: new Date().toISOString(), resolved: false }]));
    const resolveIncident = (incidentId: string) => wrapApiCall(() => supabase!.from('incidents').update({ resolved: true }).eq('id', incidentId));
    const handleDispatch = (note: Omit<DispatchNote, 'id'|'status'|'created_at'>) => wrapApiCall(async () => {
        const newNote = { ...note, id: `disp-${Date.now()}`, status: 'Despachado' };
        await supabase!.from('dispatch_notes').insert([newNote]);
        await supabase!.from('wine_packs').update({ status: 'Despachado' }).in('id', note.packIds);
    });
    // FIX: Changed arrow functions to async to match the expected Promise return type of wrapApiCall.
    const handleAddUser = (user: Omit<User, 'id'>) => wrapApiCall(async () => { console.log("Add user not implemented", user) });
    const handleUpdateUser = (user: User) => wrapApiCall(async () => { console.log("Update user not implemented", user) });
    const handleDeleteUser = (userId: string) => wrapApiCall(async () => { console.log("Delete user not implemented", userId) });
    const handleAddRole = (role: Omit<Role, 'id'|'created_at'>) => wrapApiCall(() => supabase!.from('roles').insert([role]));
    const handleUpdateRole = (role: Role) => wrapApiCall(() => supabase!.from('roles').update(role).eq('id', role.id));
    const handleDeleteRole = (roleId: string) => wrapApiCall(() => supabase!.from('roles').delete().eq('id', roleId));


    const value: DataContextType = {
        currentUser, albaranes, incidents, packs, salidas, supplies, packModels, users, roles, auditLogs, loadingData,
        addAlbaran, updateAlbaran, deleteAlbaran, addPack, addPackModel, addNewSupply, addSupplyStock, addIncident,
        resolveIncident, handleDispatch, handleAddUser, handleUpdateUser, handleDeleteUser, handleAddRole,
        handleUpdateRole, handleDeleteRole,
    };

    if (loadingData || !currentUser) {
        return <div className="min-h-screen bg-brand-light flex justify-center items-center"><Spinner /></div>;
    }

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
