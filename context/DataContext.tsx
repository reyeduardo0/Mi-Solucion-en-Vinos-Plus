import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Albaran, User, Role, AuditLog, Incident, Supply, PackModel, WinePack, DispatchNote } from '../types';

const SUPER_USER_EMAIL = 'reyeduardo0@gmail.com';
const SUPER_USER_ROLE_NAME = 'Super Usuario';

// Helper to create a stable, URL-friendly ID from a name
const generateRoleIdFromName = (name: string): string => {
    return name
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/\s+/g, '-') // replace spaces with -
        .replace(/[^\w-]+/g, ''); // remove all non-word chars except -
};


// Define the shape of the context data
interface DataContextType {
    currentUser: User | null;
    users: User[];
    roles: Role[];
    albaranes: Albaran[];
    incidents: Incident[];
    supplies: Supply[];
    packs: WinePack[];
    packModels: PackModel[];
    salidas: DispatchNote[];
    auditLogs: AuditLog[];
    loadingData: boolean;
    // Functions to modify data
    addAlbaran: (albaran: Albaran) => Promise<void>;
    updateAlbaran: (albaran: Albaran) => Promise<void>;
    deleteAlbaran: (albaranId: string) => Promise<void>;
    addIncident: (incident: Omit<Incident, 'id' | 'date' | 'resolved' | 'created_at'>) => Promise<void>;
    resolveIncident: (incidentId: string) => Promise<void>;
    addNewSupply: (supply: Omit<Supply, 'id' | 'created_at' | 'quantity'>) => Promise<void>;
    addSupplyStock: (supplyId: string, quantity: number) => Promise<void>;
    addPackModel: (model: Omit<PackModel, 'id' | 'created_at'>) => Promise<void>;
    addPack: (pack: WinePack) => Promise<void>;
    handleDispatch: (dispatchData: Omit<DispatchNote, 'id' | 'status' | 'created_at'>) => Promise<void>;
    addUser: (user: Omit<User, 'id'> & { password?: string }) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    addRole: (role: Omit<Role, 'id' | 'created_at'>) => Promise<void>;
    updateRole: (role: Role) => Promise<void>;
    deleteRole: (roleId: string) => Promise<void>;
    addAuditLog: (action: string, userId: string, userName: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

interface DataProviderProps {
    children: ReactNode;
    session: Session;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children, session }) => {
    const [loadingData, setLoadingData] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [albaranes, setAlbaranes] = useState<Albaran[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [supplies, setSupplies] = useState<Supply[]>([]);
    const [packs, setPacks] = useState<WinePack[]>([]);
    const [packModels, setPackModels] = useState<PackModel[]>([]);
    const [salidas, setSalidas] = useState<DispatchNote[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

    const addAuditLog = useCallback(async (action: string, userId: string, userName: string) => {
        if (!supabase) return;
        const newLog = { userid: userId, username: userName, action };
        const { error } = await supabase.from('audit_logs').insert(newLog);
        if (error) {
            console.error('Error adding audit log:', JSON.stringify(error, null, 2));
        }
    }, []);

    const fetchData = useCallback(async () => {
        if (!supabase || !session.user) return;
        setLoadingData(true);
        try {
            // First, fetch roles to ensure they are available for user profile creation.
            const rolesRes = await supabase.from('roles').select('*');
            if (rolesRes.error) throw rolesRes.error;
            let fetchedRoles = rolesRes.data as Role[];

            // Ensure Super User role exists
            let superUserRole = fetchedRoles.find(r => r.name === SUPER_USER_ROLE_NAME);
            if (!superUserRole) {
                console.log(`'${SUPER_USER_ROLE_NAME}' role not found. Creating it...`);
                const superUserRoleId = generateRoleIdFromName(SUPER_USER_ROLE_NAME);
                const { data: newRole, error: newRoleError } = await supabase.from('roles').insert({
                    id: superUserRoleId,
                    name: SUPER_USER_ROLE_NAME,
                    permissions: ['*'] // Wildcard for all permissions
                }).select().single();
                if (newRoleError) throw newRoleError;
                superUserRole = newRole as Role;
                fetchedRoles.push(superUserRole);
            }
            setRoles(fetchedRoles);

            const [
                usersRes, albaranesRes, incidentsRes, suppliesRes, packsRes, packModelsRes, salidasRes, auditLogsRes
            ] = await Promise.all([
                supabase.from('users').select('*'),
                supabase.from('albaranes').select('*, pallets(*)'),
                supabase.from('incidents').select('*').order('created_at', { ascending: false }),
                supabase.from('supplies').select('*'),
                supabase.from('wine_packs').select('*'),
                supabase.from('pack_models').select('*'),
                supabase.from('dispatch_notes').select('*'),
                supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }),
            ]);

            if (usersRes.error) throw usersRes.error;
            let fetchedUsers: User[] = (usersRes.data || []).map((u: any) => ({
                id: u.id,
                name: u.full_name,
                email: u.email,
                roleId: u.role_id,
            }));

            // Handle the current user's profile
            let currentUserData = fetchedUsers.find(u => u.id === session.user.id);
            const isSuperUserSession = session.user.email === SUPER_USER_EMAIL;

            // If the super user profile is missing or incorrect, fix it.
            if (isSuperUserSession && (!currentUserData || currentUserData.roleId !== superUserRole.id)) {
                console.log("Ensuring Super User profile integrity...");
                const { data: upsertedSuperUser, error: upsertError } = await supabase.from('users').upsert({
                    id: session.user.id,
                    email: session.user.email,
                    full_name: 'Rey Eduardo',
                    role_id: superUserRole.id
                }).select().single();

                if (upsertError) throw upsertError;
                
                currentUserData = { id: upsertedSuperUser.id, name: upsertedSuperUser.full_name, email: upsertedSuperUser.email, roleId: upsertedSuperUser.role_id };
                // Update the fetched users list with the corrected super user profile
                fetchedUsers = fetchedUsers.filter(u => u.id !== session.user.id).concat(currentUserData);
            }
            
            setUsers(fetchedUsers);
            setCurrentUser(currentUserData || null);

            // Set the rest of the data
            if (albaranesRes.error) throw albaranesRes.error; setAlbaranes(albaranesRes.data as Albaran[]);
            if (incidentsRes.error) throw incidentsRes.error; setIncidents(incidentsRes.data as Incident[]);
            if (suppliesRes.error) throw suppliesRes.error; setSupplies(suppliesRes.data as Supply[]);
            if (packsRes.error) throw packsRes.error; setPacks(packsRes.data as WinePack[]);
            if (packModelsRes.error) throw packModelsRes.error; setPackModels(packModelsRes.data as PackModel[]);
            if (salidasRes.error) throw salidasRes.error; setSalidas(salidasRes.data as DispatchNote[]);
            if (auditLogsRes.error) throw auditLogsRes.error;
            const fetchedAuditLogs = (auditLogsRes.data || []).map((log: any) => ({ id: log.id, timestamp: log.timestamp, userId: log.userid, userName: log.username, action: log.action }));
            setAuditLogs(fetchedAuditLogs as AuditLog[]);

        } catch (error) {
            console.error("Error fetching data:", JSON.stringify(error, null, 2));
        } finally {
            setLoadingData(false);
        }
    }, [session]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

     const logAndRefetch = useCallback(async (action: string, operation: () => Promise<any>) => {
        await operation();
        if (currentUser) {
            await addAuditLog(action, currentUser.id, currentUser.name);
        }
        await fetchData();
    }, [currentUser, addAuditLog, fetchData]);

    // Data modification functions
    const addAlbaran = async (albaran: Albaran) => logAndRefetch(`Creó el albarán ${albaran.id}`, async () => {
        if (!supabase) return;
        const { pallets, ...albaranData } = albaran;
        const { data, error } = await supabase.from('albaranes').insert(albaranData).select().single();
        if (error) throw error;
        if (pallets && pallets.length > 0) {
            const palletsToInsert = pallets.map(p => ({ ...p, albaran_id: data.id }));
            const { error: palletError } = await supabase.from('pallets').insert(palletsToInsert);
            if (palletError) throw palletError;
        }
    });

    const updateAlbaran = async (albaran: Albaran) => logAndRefetch(`Actualizó el albarán ${albaran.id}`, async () => {
        if (!supabase) return;
        const { pallets, ...albaranData } = albaran;
        const { error } = await supabase.from('albaranes').update(albaranData).eq('id', albaran.id);
        if (error) throw error;
        if (pallets) {
             const { error: deleteError } = await supabase.from('pallets').delete().eq('albaran_id', albaran.id);
             if (deleteError) throw deleteError;
             const palletsToInsert = pallets.map(p => ({ ...p, id: undefined, albaran_id: albaran.id }));
             const { error: insertError } = await supabase.from('pallets').insert(palletsToInsert);
             if (insertError) throw insertError;
        }
    });

    const deleteAlbaran = async (albaranId: string) => logAndRefetch(`Eliminó el albarán ${albaranId}`, async () => {
        if (!supabase) return;
        const { error } = await supabase.from('albaranes').delete().eq('id', albaranId);
        if (error) throw error;
    });
    
    const addIncident = async (incident: Omit<Incident, 'id' | 'date' | 'resolved' | 'created_at'>) => logAndRefetch(`Registró una incidencia para ${incident.relatedId}`, async () => {
        if (!supabase) return;
        const newIncident = { ...incident, date: new Date().toISOString(), resolved: false };
        const { error } = await supabase.from('incidents').insert(newIncident);
        if (error) throw error;
    });
    
    const resolveIncident = async (incidentId: string) => logAndRefetch(`Resolvió la incidencia ${incidentId}`, async () => {
        if (!supabase) return;
        const { error } = await supabase.from('incidents').update({ resolved: true }).eq('id', incidentId);
        if (error) throw error;
    });

    const addNewSupply = async (supply: Omit<Supply, 'id' | 'created_at' | 'quantity'>) => logAndRefetch(`Creó el insumo ${supply.name}`, async () => {
        if (!supabase) return;
        const { error } = await supabase.from('supplies').insert({ ...supply, quantity: 0 });
        if (error) throw error;
    });

    const addSupplyStock = async (supplyId: string, quantity: number) => logAndRefetch(`Añadió ${quantity} de stock al insumo ${supplyId}`, async () => {
        if (!supabase) return;
        const { error } = await supabase.rpc('add_supply_stock', { p_supply_id: supplyId, p_quantity: quantity });
        if (error) throw error;
    });

    const addPackModel = async (model: Omit<PackModel, 'id' | 'created_at'>) => logAndRefetch(`Creó el modelo de pack ${model.name}`, async () => {
        if (!supabase) return;
        const { error } = await supabase.from('pack_models').insert(model);
        if (error) throw error;
    });

    const addPack = async (pack: WinePack) => logAndRefetch(`Creó el pack ${pack.id}`, async () => {
        if (!supabase) return;
        const { error } = await supabase.from('wine_packs').insert(pack);
        if (error) throw error;
    });

    const handleDispatch = async (dispatchData: Omit<DispatchNote, 'id' | 'status' | 'created_at'>) => logAndRefetch(`Creó la nota de salida para ${dispatchData.customer}`, async () => {
        if (!supabase) return;
        const newDispatch = { ...dispatchData, id: `SAL-${Date.now()}`, status: 'Despachado' as const };
        const { error } = await supabase.from('dispatch_notes').insert(newDispatch);
        if (error) throw error;
        const { error: packError } = await supabase.from('wine_packs').update({ status: 'Despachado' }).in('id', dispatchData.packIds);
        if (packError) throw packError;
    });

    const addUser = async (userData: Omit<User, 'id'> & { password?: string }) => {
        if (!supabase) throw new Error("Cliente Supabase no inicializado.");
        if (userData.email === SUPER_USER_EMAIL) throw new Error("No se puede crear un usuario con el email del Super Usuario.");
        if (!userData.password) throw new Error("La contraseña es requerida para nuevos usuarios.");

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: { data: { full_name: userData.name, role_id: userData.roleId } }
        });

        if (authError) {
            console.error("Error creating auth user:", JSON.stringify(authError, null, 2));
            if (authError.message.includes("User already registered")) throw new Error("Este correo electrónico ya está en uso.");
            if (authError.message.includes("Password should be at least 6 characters")) throw new Error("La contraseña debe tener al menos 6 caracteres.");
            throw new Error(`Error al crear usuario: ${authError.message}`);
        }
        
        if (!authData.user) throw new Error("El registro falló, el servicio de autenticación no devolvió un usuario.");

        await new Promise(resolve => setTimeout(resolve, 1000)); 
        if (currentUser) await addAuditLog(`Creó el usuario ${userData.name}`, currentUser.id, currentUser.name);
        await fetchData();
    };

    const updateUser = async (user: User) => {
        if (user.email === SUPER_USER_EMAIL) throw new Error("El Super Usuario no puede ser modificado.");
        if (!supabase) return;
        const { error } = await supabase.from('users').update({ full_name: user.name, role_id: user.roleId }).eq('id', user.id);
        if (error) throw error;
        if (currentUser) await addAuditLog(`Actualizó el usuario ${user.name}`, currentUser.id, currentUser.name);
        await fetchData();
    };

    const deleteUser = async (userId: string) => {
        if (!supabase) return;
        const userToDelete = users.find(u => u.id === userId);
        if (userToDelete?.email === SUPER_USER_EMAIL) throw new Error("El Super Usuario no puede ser eliminado.");
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) throw error;
        if (currentUser && userToDelete) await addAuditLog(`Eliminó el usuario ${userToDelete.name}`, currentUser.id, currentUser.name);
        await fetchData();
    };
    
    const addRole = async (role: Omit<Role, 'id' | 'created_at'>) => {
        if (role.name === SUPER_USER_ROLE_NAME) throw new Error("No se puede crear otro rol con el nombre 'Super Usuario'.");
        if (!supabase) return;
        
        const roleId = generateRoleIdFromName(role.name);
        const { error } = await supabase.from('roles').insert({ ...role, id: roleId });

        if (error) {
            if (error.code === '23505') { // unique_violation
               throw new Error(`Ya existe un rol con el nombre "${role.name}" o un ID similar.`);
           }
           throw error;
        }
        if (currentUser) await addAuditLog(`Creó el rol ${role.name}`, currentUser.id, currentUser.name);
        await fetchData();
    };

    const updateRole = async (role: Role) => {
        const originalRole = roles.find(r => r.id === role.id);
        if (originalRole?.name === SUPER_USER_ROLE_NAME) throw new Error("El rol de Super Usuario no puede ser modificado.");
        if (!supabase) return;
        const { error } = await supabase.from('roles').update({ name: role.name, permissions: role.permissions }).eq('id', role.id);
        if (error) throw error;
        if (currentUser) await addAuditLog(`Actualizó el rol ${role.name}`, currentUser.id, currentUser.name);
        await fetchData();
    };

    const deleteRole = async (roleId: string) => {
        if (!supabase) return;
        const roleToDelete = roles.find(r => r.id === roleId);
        if (roleToDelete?.name === SUPER_USER_ROLE_NAME) throw new Error("El rol de Super Usuario no puede ser eliminado.");
        const { error } = await supabase.from('roles').delete().eq('id', roleId);
        if (error) throw error;
        if (currentUser && roleToDelete) await addAuditLog(`Eliminó el rol ${roleToDelete.name}`, currentUser.id, currentUser.name);
        await fetchData();
    };

    const value = {
        currentUser, users, roles, albaranes, incidents, supplies, packs, packModels, salidas, auditLogs, loadingData,
        addAlbaran, updateAlbaran, deleteAlbaran,
        addIncident, resolveIncident,
        addNewSupply, addSupplyStock,
        addPackModel, addPack,
        handleDispatch,
        addUser, updateUser, deleteUser,
        addRole, updateRole, deleteRole,
        addAuditLog
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};