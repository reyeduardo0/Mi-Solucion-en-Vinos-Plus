
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
// FIX: Changed to a type-only import for Session.
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Albaran, User, Role, AuditLog, Incident, Supply, PackModel, WinePack, DispatchNote, Merma, Pallet, InventoryStockItem } from '../types';

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
    products: { name: string }[];
    incidents: Incident[];
    supplies: Supply[];
    packs: WinePack[];
    packModels: PackModel[];
    salidas: DispatchNote[];
    auditLogs: AuditLog[];
    mermas: Merma[];
    inventoryStock: InventoryStockItem[];
    loadingData: boolean;
    // Functions to modify data
    addAlbaran: (albaran: Albaran) => Promise<void>;
    updateAlbaran: (albaran: Albaran) => Promise<void>;
    deleteAlbaran: (albaran: Albaran) => Promise<void>;
    addIncident: (incident: Omit<Incident, 'id' | 'date' | 'resolved' | 'created_at'>) => Promise<void>;
    resolveIncident: (incident: Incident) => Promise<void>;
    addNewSupply: (supplyData: Omit<Supply, 'id' | 'created_at' | 'quantity'>, initialData?: { quantity: number; lot: string }) => Promise<void>;
    updateSupply: (supply: Supply) => Promise<void>;
    deleteSupply: (supplyId: string, nameHint: string) => Promise<void>;
    addSupplyStock: (supplyId: string, quantity: number, lot?: string) => Promise<void>;
    addPackModel: (model: Omit<PackModel, 'id' | 'created_at'>) => Promise<void>;
    addPack: (pack: WinePack) => Promise<void>;
    handleDispatch: (dispatchData: Omit<DispatchNote, 'id' | 'status' | 'created_at'>) => Promise<void>;
    addMerma: (merma: Omit<Merma, 'id' | 'created_at'>) => Promise<void>;
    addUser: (user: Omit<User, 'id'> & { password?: string }) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string, nameHint: string) => Promise<void>;
    addRole: (role: Omit<Role, 'id' | 'created_at'>) => Promise<void>;
    updateRole: (role: Role) => Promise<void>;
    deleteRole: (roleId: string, nameHint: string) => Promise<void>;
    addAuditLog: (action: string, userId: string, userName: string) => Promise<void>;
    updateCurrentUserPassword: (password: string) => Promise<void>;
    updateUserPasswordByAdmin: (userId: string, password: string) => Promise<void>;
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
    const [products, setProducts] = useState<{ name: string }[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [supplies, setSupplies] = useState<Supply[]>([]);
    const [packs, setPacks] = useState<WinePack[]>([]);
    const [packModels, setPackModels] = useState<PackModel[]>([]);
    const [salidas, setSalidas] = useState<DispatchNote[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [mermas, setMermas] = useState<Merma[]>([]);

    const currentUserRef = useRef(currentUser);
    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

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
            const rolesRes = await supabase.from('roles').select('*');
            if (rolesRes.error) throw rolesRes.error;
            
            // ROBUST HYDRATION: Filter out malformed roles from the database.
            let fetchedRoles = (rolesRes.data || []).filter((r: any): r is Role => {
                if (!r || typeof r.id !== 'string' || typeof r.name !== 'string') {
                    console.warn('Filtering out malformed role object from DB:', r);
                    return false;
                }
                return true;
            });

            let superUserRole = fetchedRoles.find(r => r.name === SUPER_USER_ROLE_NAME);
            if (!superUserRole) {
                const superUserRoleId = generateRoleIdFromName(SUPER_USER_ROLE_NAME);
                const { data: newRole, error: newRoleError } = await supabase.from('roles').insert({ id: superUserRoleId, name: SUPER_USER_ROLE_NAME, permissions: ['*'] }).select().single();
                if (newRoleError) throw newRoleError;
                superUserRole = newRole as Role;
                fetchedRoles.push(superUserRole);
            }
            setRoles(fetchedRoles);

            const usersRes = await supabase.from('users').select('*');
            if (usersRes.error) throw usersRes.error;
            
            // Centralized, robust user object creation with data validation
            const toUserObject = (dbUser: any): User | null => {
                if (!dbUser || !dbUser.id || !dbUser.email) {
                    console.warn("Filtering out malformed user record from DB:", dbUser);
                    return null; // Filter out malformed records
                }
                return {
                    id: dbUser.id,
                    name: dbUser.full_name || dbUser.email || 'Usuario sin nombre',
                    email: dbUser.email,
                    roleId: dbUser.role_id,
                };
            };

            let fetchedUsers: User[] = (usersRes.data || []).map(toUserObject).filter((u): u is User => u !== null);

            let currentUserData = fetchedUsers.find(u => u.id === session.user.id);

            // SELF-HEALING: If user is authenticated but has no profile, create one.
            if (!currentUserData && session.user) {
                console.warn(`Authenticated user ${session.user.id} is missing a profile. Attempting to create one.`);
                const defaultRole = fetchedRoles.find(r => r.name.toLowerCase() !== 'admin' && r.name !== SUPER_USER_ROLE_NAME) || fetchedRoles[0];

                if (defaultRole) {
                    const newUserProfile = { id: session.user.id, email: session.user.email!, full_name: session.user.email!.split('@')[0], role_id: defaultRole.id };
                    const { data: createdUser, error: insertError } = await supabase.from('users').insert(newUserProfile).select().single();

                    if (insertError) {
                        console.error("Failed to create missing user profile. Logging out for safety.", insertError);
                        alert('Hubo un problema al inicializar su perfil. Se cerrará la sesión.');
                        await supabase.auth.signOut(); return;
                    } else {
                        console.log("Successfully created missing user profile:", createdUser);
                        const newUserObject = toUserObject(createdUser);
                        if (newUserObject) {
                            currentUserData = newUserObject;
                            fetchedUsers.push(currentUserData);
                        }
                    }
                } else {
                    console.error("Cannot create profile: No roles defined. Logging out.");
                    alert('Error de configuración: No hay roles definidos. Se cerrará la sesión.');
                    await supabase.auth.signOut(); return;
                }
            }

            const isSuperUserSession = session.user.email === SUPER_USER_EMAIL;
            if (isSuperUserSession && (!currentUserData || currentUserData.roleId !== superUserRole.id)) {
                const { data: upsertedSuperUser, error: upsertError } = await supabase.from('users').upsert({ id: session.user.id, email: session.user.email, full_name: 'Rey Eduardo', role_id: superUserRole.id }).select().single();
                if (upsertError) throw upsertError;
                
                const superUserObject = toUserObject(upsertedSuperUser);
                if (superUserObject) {
                    currentUserData = superUserObject;
                    fetchedUsers = fetchedUsers.filter(u => u.id !== session.user.id).concat(currentUserData);
                }
            }
            
            setUsers(fetchedUsers);
            setCurrentUser(currentUserData || null);

            // Fetch remaining data
            const [albaranesRes, incidentsRes, suppliesRes, packsRes, packModelsRes, salidasRes, auditLogsRes, mermasRes] = await Promise.all([
                supabase.from('albaranes').select('*, pallets(*)'),
                supabase.from('incidents').select('*').order('created_at', { ascending: false }),
                supabase.from('supplies').select('*'),
                supabase.from('wine_packs').select('*'),
                supabase.from('pack_models').select('*'),
                supabase.from('dispatch_notes').select('*'),
                supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }),
                supabase.from('mermas').select('*'),
            ]);

            // ROBUST HYDRATION for Supplies (must be before Albaranes)
            if (suppliesRes.error) throw suppliesRes.error;
            const fetchedSupplies = (suppliesRes.data || []).filter((s: any): s is Supply => {
                if (!s || !s.name) { console.warn("Filtering malformed supply:", s); return false; }
                return true;
            });
            setSupplies(fetchedSupplies);
            
            // ROBUST HYDRATION for Albaranes and Pallets
            if (albaranesRes.error) throw albaranesRes.error;
            const fetchedAlbaranes: Albaran[] = (albaranesRes.data || []).map((a: any) => ({
                id: a.id, entryDate: a.entrydate, truckPlate: a.truckplate, origin: a.origin,
                carrier: a.carrier, driver: a.driver, status: a.status, incidentDetails: a.incidentdetails,
                incidentImages: a.incidentimages, created_at: a.created_at,
                pallets: (a.pallets || []).map((p: any): Pallet | null => {
                    const palletType = p.product_lot ? 'product' : 'consumable';
                    const isProduct = palletType === 'product';
            
                    if (!p.product_name) {
                        console.warn("Filtering out malformed pallet (missing product_name):", a.id, p);
                        return null;
                    }

                    const pallet: Pallet = {
                        id: p.id,
                        palletNumber: p.palletnumber,
                        sscc: p.sscc,
                        type: palletType,
                        product: isProduct ? { name: p.product_name, lot: p.product_lot } : undefined,
                        boxesPerPallet: isProduct ? p.boxesperpallet : undefined,
                        bottlesPerBox: isProduct ? p.bottlesperbox : undefined,
                        totalBottles: isProduct ? p.totalbottles : undefined,
                        eanBottle: isProduct ? p.eanbottle : undefined,
                        eanBox: isProduct ? p.eanbox : undefined,
                        supplyName: !isProduct ? p.product_name : undefined,
                        supplyQuantity: !isProduct ? p.totalbottles : undefined,
                        supplyLot: !isProduct ? p.supply_lot : undefined,
                        incident: p.incident_description ? { description: p.incident_description, images: p.incident_images || [] } : undefined,
                        created_at: p.created_at,
                    };

                    if (!isProduct && pallet.supplyName) {
                        const supply = fetchedSupplies.find(s => s.name === pallet.supplyName);
                        if (supply) { pallet.supplyId = supply.id; }
                    }
                    return pallet;
                }).filter((p): p is Pallet => p !== null)
            }));
            setAlbaranes(fetchedAlbaranes);

            // Extract unique products
            const productSet = new Set<string>();
            fetchedAlbaranes.forEach(a => a.pallets.forEach(p => {
                if (p.type === 'product' && p.product?.name) {
                    productSet.add(p.product.name);
                }
            }));
            setProducts(Array.from(productSet).map(name => ({ name })));


            if (incidentsRes.error) throw incidentsRes.error; setIncidents(incidentsRes.data as Incident[]);
            
            if (packsRes.error) throw packsRes.error; setPacks(packsRes.data as WinePack[]);
            
            // ROBUST HYDRATION for Pack Models
            if (packModelsRes.error) throw packModelsRes.error;
            const fetchedPackModels = (packModelsRes.data || []).filter((m: any): m is PackModel => {
                if (!m || !m.name) { console.warn("Filtering malformed pack model:", m); return false; }
                if (m.supplyRequirements && Array.isArray(m.supplyRequirements)) {
                    for (const req of m.supplyRequirements) {
                        if (!req || !req.name) { console.warn("Filtering pack model due to malformed supply requirement:", m); return false; }
                    }
                }
                return true;
            });
            setPackModels(fetchedPackModels as PackModel[]);

            if (salidasRes.error) throw salidasRes.error; setSalidas(salidasRes.data as DispatchNote[]);
            if (mermasRes.error) throw mermasRes.error; 
            const fetchedMermas = (mermasRes.data || []).map((m: any) => ({
                id: m.id, itemName: m.item_name, itemType: m.item_type, lot: m.lot, quantity: m.quantity, reason: m.reason, created_at: m.created_at,
            }));
            setMermas(fetchedMermas as Merma[]);
            if (auditLogsRes.error) throw auditLogsRes.error;
            const fetchedAuditLogs = (auditLogsRes.data || []).map((log: any) => ({ id: log.id, timestamp: log.timestamp, userId: log.userid, userName: log.username || 'Usuario Desconocido', action: log.action }));
            setAuditLogs(fetchedAuditLogs as AuditLog[]);

        } catch (error: any) {
            console.error("Error fetching data:", JSON.stringify(error, null, 2));
            // Add robust sign-out logic for auth errors.
            // Supabase client errors often have a __isAuthError property or specific messages.
            const isAuthError =
                error?.__isAuthError ||
                error?.message?.includes('JWT') ||
                error?.message?.includes('token') ||
                error?.message?.includes('Unauthorized') ||
                error?.code === 'PGRST301' || // JWT expired
                error?.status === 401;

            if (isAuthError) {
                console.warn("Authentication error detected during data fetch. Forcing sign out.", error);
                // Don't await here, just fire and forget. 
                // The onAuthStateChange listener in App.tsx will handle the UI update and redirect.
                supabase?.auth.signOut();
            }
        } finally {
            setLoadingData(false);
        }
    }, [session]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const logAndRefetch = useCallback(async (action: string, operation: () => Promise<any>) => {
        try {
            await operation();
            
            const userForLog = currentUserRef.current;

            // DEFINITIVE FIX: This robust guard prevents the race condition.
            // It checks if the user profile is fully loaded before trying to use its 'name'.
            if (userForLog && typeof userForLog.id === 'string' && typeof userForLog.name === 'string' && userForLog.name.length > 0) {
                await addAuditLog(action, userForLog.id, userForLog.name);
            } else {
                // FALLBACK: If the profile isn't loaded, use session data to ensure the log is still created
                // and the app does NOT crash.
                console.warn("logAndRefetch: currentUser not fully loaded. Falling back to session data for audit log.", { user: userForLog });
                const sessionUser = session.user;
                if (sessionUser) {
                    await addAuditLog(action, sessionUser.id, sessionUser.email || 'Usuario Desconocido');
                } else {
                    console.error("CRITICAL: An audited action was performed without a user session.", { action });
                }
            }
            
            await fetchData();
        } catch (error: any) {
            console.error(`Error during audited action '${action}':`, error);
            const isAuthError =
                error?.__isAuthError ||
                error?.message?.includes('JWT') ||
                error?.message?.includes('token') ||
                error?.message?.includes('Unauthorized') ||
                error?.code === 'PGRST301' ||
                error?.status === 401;

            if (isAuthError) {
                console.warn("Authentication error detected during operation. Forcing sign out.", error);
                supabase?.auth.signOut();
            }
            // Re-throw the error so UI components can still handle it (e.g., show a message in a modal)
            throw error;
        }
    }, [addAuditLog, fetchData, session.user]);

    const inventoryStock = React.useMemo((): InventoryStockItem[] => {
        const stockMap = new Map<string, InventoryStockItem>();

        // 1. Process Products from Albaranes to get Total Stock
        albaranes.forEach(a => {
            a.pallets.forEach(p => {
                if (p.type === 'product' && p.product?.name && p.product?.lot) {
                    const key = `product-${p.product.name}-${p.product.lot}`;
                    const entry = stockMap.get(key) || {
                        name: p.product.name,
                        type: 'Producto',
                        lot: p.product.lot,
                        unit: 'botellas',
                        total: 0, inPacks: 0, inMerma: 0, available: 0,
                    };
                    entry.total += p.totalBottles || 0;
                    stockMap.set(key, entry);
                }
            });
        });

        // 2. Process Consumables from Albaranes to get Total Stock by Lot
        albaranes.forEach(a => {
            a.pallets.forEach(p => {
                if (p.type === 'consumable' && p.supplyName && p.supplyQuantity) {
                    const lot = p.supplyLot || 'SIN LOTE';
                    const key = `supply-${p.supplyName}-${lot}`;
                    const supplyDef = supplies.find(s => s.name === p.supplyName);

                    const entry = stockMap.get(key) || {
                        name: p.supplyName,
                        type: 'Consumible',
                        lot: lot,
                        unit: supplyDef?.unit || 'unidades',
                        total: 0,
                        inPacks: 0,
                        inMerma: 0,
                        available: 0,
                        minStock: supplyDef?.minStock
                    };
                    entry.total += p.supplyQuantity;
                    stockMap.set(key, entry);
                }
            });
        });

        // 3. Calculate "In Packs" quantities (affects only products)
        packs.filter(p => p.status === 'Ensamblado').forEach(p => {
            p.contents.forEach(c => {
                const key = `product-${c.productName}-${c.lot}`;
                const entry = stockMap.get(key);
                if(entry) entry.inPacks += c.quantity;
            });
            // Note: Consumption of supplies is not tracked by lot in packs, so we can't subtract it here.
        });
        
        // 4. Calculate "In Merma" quantities (affects only products)
        mermas.forEach(m => {
            if (m.itemType === 'product' && m.lot) {
                const key = `product-${m.itemName}-${m.lot}`;
                const entry = stockMap.get(key);
                if (entry) entry.inMerma += m.quantity;
            }
             // Note: Merma of supplies is not tracked by lot, so we can't subtract it here.
        });

        // 5. Final calculations for all items
        return Array.from(stockMap.values()).map(item => {
            if (item.type === 'Producto') {
                item.available = item.total - item.inPacks - item.inMerma;
            } else { // Consumible
                // As consumption isn't tracked by lot, available stock per lot cannot be accurately calculated.
                // We will show the total incoming stock per lot as the available amount.
                // This provides visibility into lots, which is the main goal.
                item.available = item.total;
            }
            return item;
        }).sort((a, b) => a.name.localeCompare(b.name) || (a.lot || '').localeCompare(b.lot || ''));
    }, [albaranes, supplies, packs, mermas]);

    // Data modification functions
    const addAlbaran = async (albaran: Albaran) => logAndRefetch(`Creó el albarán ${albaran.id}`, async () => {
        if (!supabase) return;
        const { pallets, ...albaranClientData } = albaran;
        
        const albaranDbData = {
            id: albaranClientData.id,
            entrydate: albaranClientData.entryDate,
            truckplate: albaranClientData.truckPlate,
            origin: albaranClientData.origin,
            carrier: albaranClientData.carrier,
            driver: albaranClientData.driver,
            status: albaranClientData.status,
            incidentdetails: albaranClientData.incidentDetails,
            incidentimages: albaranClientData.incidentImages,
        };

        const { data, error } = await supabase.from('albaranes').insert(albaranDbData).select().single();
        if (error) throw error;
        
        if (pallets && pallets.length > 0) {
            const palletsToInsert = pallets.map(p => ({
                albaran_id: data.id,
                palletnumber: p.palletNumber,
                product_name: p.type === 'product' ? p.product?.name : p.supplyName,
                product_lot: p.type === 'product' ? p.product?.lot : null,
                supply_lot: p.type === 'consumable' ? p.supplyLot : null,
                boxesperpallet: p.type === 'product' ? p.boxesPerPallet : null,
                bottlesperbox: p.type === 'product' ? p.bottlesPerBox : null,
                totalbottles: p.type === 'product' ? p.totalBottles : p.supplyQuantity,
                eanbottle: p.type === 'product' ? p.eanBottle : null,
                eanbox: p.type === 'product' ? p.eanBox : null,
                sscc: p.sscc,
                incident_description: p.incident?.description,
                incident_images: p.incident?.images,
            }));
            const { error: palletError } = await supabase.from('pallets').insert(palletsToInsert);
            if (palletError) throw palletError;
        }

        // After successfully inserting albaran and pallets, update supply stock
        const consumablePallets = pallets.filter(p => p.type === 'consumable' && p.supplyId && p.supplyQuantity);
        for (const p of consumablePallets) {
             const { error: rpcError } = await supabase.rpc('add_supply_stock', { p_supply_id: p.supplyId!, p_quantity: p.supplyQuantity! });
             if (rpcError) {
                console.error(`Failed to update stock for supply ${p.supplyId} on albaran ${albaran.id}:`, rpcError);
                // Optionally throw error to notify user, though albaran is already created.
             }
        }
    });

    const updateAlbaran = async (albaran: Albaran) => logAndRefetch(`Actualizó el albarán ${albaran.id}`, async () => {
        if (!supabase) return;
        const { pallets, ...albaranClientData } = albaran;
        
        const albaranDbData = {
            entrydate: albaranClientData.entryDate,
            truckplate: albaranClientData.truckPlate,
            origin: albaranClientData.origin,
            carrier: albaranClientData.carrier,
            driver: albaranClientData.driver,
            status: albaranClientData.status,
            incidentdetails: albaranClientData.incidentDetails,
            incidentimages: albaranClientData.incidentImages,
        };
        
        const { error } = await supabase.from('albaranes').update(albaranDbData).eq('id', albaran.id);
        if (error) throw error;
        
        if (pallets) {
             const { error: deleteError } = await supabase.from('pallets').delete().eq('albaran_id', albaran.id);
             if (deleteError) throw deleteError;

             const palletsToInsert = pallets.map(p => ({
                albaran_id: albaran.id,
                palletnumber: p.palletNumber,
                product_name: p.type === 'product' ? p.product?.name : p.supplyName,
                product_lot: p.type === 'product' ? p.product?.lot : null,
                supply_lot: p.type === 'consumable' ? p.supplyLot : null,
                boxesperpallet: p.type === 'product' ? p.boxesPerPallet : null,
                bottlesperbox: p.type === 'product' ? p.bottlesPerBox : null,
                totalbottles: p.type === 'product' ? p.totalBottles : p.supplyQuantity,
                eanbottle: p.type === 'product' ? p.eanBottle : null,
                eanbox: p.type === 'product' ? p.eanBox : null,
                sscc: p.sscc,
                incident_description: p.incident?.description,
                incident_images: p.incident?.images,
             }));

             if (palletsToInsert.length > 0) {
                const { error: insertError } = await supabase.from('pallets').insert(palletsToInsert);
                if (insertError) throw insertError;
             }
             // NOTE: Stock adjustments on edit are not handled to avoid complexity.
        }
    });

    const deleteAlbaran = async (albaran: Albaran) => {
        const albaranId = albaran?.id;
        const albaranInState = albaranId ? albaranes.find(a => a.id === albaranId) : undefined;
        const finalCarrier = albaranInState?.carrier || albaran?.carrier || 'desconocido';
        const logDetails = `${albaranId || 'ID desconocido'} del transportista ${finalCarrier}`;

        await logAndRefetch(`Eliminó el albarán ${logDetails}`, async () => {
            if (!supabase || !albaranId) return;
            const { error } = await supabase.from('albaranes').delete().eq('id', albaranId);
            if (error) throw error;
        });
    };
    
    const addIncident = async (incident: Omit<Incident, 'id' | 'date' | 'resolved' | 'created_at'>) => logAndRefetch(`Registró una incidencia para ${incident.relatedId}`, async () => {
        if (!supabase) return;
        const newIncident = { ...incident, date: new Date().toISOString(), resolved: false };
        const { error } = await supabase.from('incidents').insert(newIncident);
        if (error) throw error;
    });
    
    const resolveIncident = async (incident: Incident) => {
        const incidentId = incident?.id;
        const incidentInState = incidentId ? incidents.find(i => i.id === incidentId) : undefined;
        const finalRelatedId = incidentInState?.relatedId || incident?.relatedId || 'desconocido';
        const finalType = incidentInState?.type || incident?.type || 'desconocido';
        const logDetails = `tipo '${finalType}' (${incidentId || 'ID desconocido'}) relacionada con ${finalRelatedId}`;

        await logAndRefetch(`Resolvió la incidencia ${logDetails}`, async () => {
            if (!supabase || !incidentId) return;
            const { error } = await supabase.from('incidents').update({ resolved: true }).eq('id', incidentId);
            if (error) throw error;
        });
    };

    const addNewSupply = async (supplyData: Omit<Supply, 'id' | 'created_at' | 'quantity'>, initialData?: { quantity: number; lot: string }) => {
        let logMessage = `Creó el consumible ${supplyData.name}`;
        if (initialData && initialData.quantity > 0) {
            logMessage += ` con un stock inicial de ${initialData.quantity} unidades`;
            if (initialData.lot) {
                logMessage += ` en el lote ${initialData.lot}`;
            }
        }
    
        await logAndRefetch(logMessage, async () => {
            if (!supabase) return;
            // 1. Insert the master data
            const { data: newSupply, error } = await supabase
                .from('supplies')
                .insert({ ...supplyData, quantity: 0 }) // Master data quantity is not used for lot tracking
                .select()
                .single();
                
            if (error) throw error;
            if (!newSupply) throw new Error("Fallo al crear el consumible, no se devolvieron datos.");
    
            // 2. If there's initial stock, add it via a synthetic albaran
            if (initialData && initialData.quantity > 0) {
                 const syntheticAlbaranId = `MANUAL-INIT-${Date.now()}`;
                 const palletData = {
                    id: `manual-pallet-init-${Date.now()}`,
                    palletNumber: `INIT-${newSupply.id.slice(0, 4)}-${Date.now()}`,
                    type: 'consumable' as const,
                    supplyId: newSupply.id,
                    supplyName: newSupply.name,
                    supplyQuantity: initialData.quantity,
                    supplyLot: initialData.lot || undefined,
                };
                
                const { data: albaranInsertData, error: albaranError } = await supabase.from('albaranes').insert({
                    id: syntheticAlbaranId,
                    entrydate: new Date().toISOString(),
                    truckplate: 'N/A',
                    carrier: 'Stock Inicial',
                    status: 'verified',
                }).select('id').single();

                if (albaranError) throw albaranError;

                const { error: palletError } = await supabase.from('pallets').insert({
                    albaran_id: albaranInsertData.id,
                    palletnumber: palletData.palletNumber,
                    product_name: palletData.supplyName,
                    supply_lot: palletData.supplyLot,
                    totalbottles: palletData.supplyQuantity,
                });
                if (palletError) throw palletError;
                
                 const { error: rpcError } = await supabase.rpc('add_supply_stock', { p_supply_id: newSupply.id, p_quantity: initialData.quantity });
                 if (rpcError) {
                    console.error(`Fallo al actualizar el stock para el nuevo consumible ${newSupply.id}:`, rpcError);
                 }
            }
        });
    };
    
    const updateSupply = async (supply: Supply) => logAndRefetch(`Actualizó el consumible ${supply.name}`, async () => {
        if (!supabase) return;
        const { id, created_at, quantity, ...updateData } = supply;
        const { error } = await supabase.from('supplies').update(updateData).eq('id', id);
        if (error) throw error;
    });
    
    const deleteSupply = async (supplyId: string, nameHint: string) => logAndRefetch(`Eliminó el consumible ${nameHint}`, async () => {
        if (!supabase) return;
        const inUseInPacks = packModels.some(pm => pm.supplyRequirements.some(sr => sr.supplyId === supplyId));
        if (inUseInPacks) throw new Error(`No se puede eliminar "${nameHint}" porque está siendo utilizado en uno o más modelos de pack.`);
        const { error } = await supabase.from('supplies').delete().eq('id', supplyId);
        if (error) throw error;
    });

    const addSupplyStock = async (supplyId: string, quantity: number, lot?: string) => {
        const supplyInState = supplies.find(s => s.id === supplyId);
        if (!supplyInState) {
            throw new Error(`No se pudo encontrar el consumible con ID ${supplyId}.`);
        }

        const syntheticAlbaran: Albaran = {
            id: `MANUAL-${Date.now()}`,
            entryDate: new Date().toISOString(),
            truckPlate: 'N/A',
            carrier: 'Entrada Manual de Stock',
            driver: 'N/A',
            origin: 'Interno',
            status: 'verified',
            pallets: [{
                id: `manual-pallet-${Date.now()}`,
                palletNumber: `MANUAL-${supplyId.slice(0, 4)}-${Date.now()}`,
                type: 'consumable',
                supplyId: supplyId,
                supplyName: supplyInState.name,
                supplyQuantity: quantity,
                supplyLot: lot || undefined,
            }]
        };
        
        // Let addAlbaran handle logging and refetching.
        // The log message inside addAlbaran is generic ("Creó el albarán..."),
        // which is acceptable for this internal action.
        await addAlbaran(syntheticAlbaran);
    };

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
        
        const packsToDispatch = packs.filter(p => dispatchData.packIds.includes(p.id));
        
        const supplyDeductions = new Map<string, number>();
        packsToDispatch.forEach(pack => {
            pack.suppliesUsed?.forEach(supply => {
                supplyDeductions.set(supply.supplyId, (supplyDeductions.get(supply.supplyId) || 0) + supply.quantity);
            });
        });

        const { error: transactionError } = await supabase.rpc('dispatch_transaction', {
            dispatch_note: newDispatch,
            pack_ids_to_update: dispatchData.packIds,
            supply_deductions: Array.from(supplyDeductions.entries()).map(([id, q]) => ({ supply_id: id, quantity: q }))
        });

        if (transactionError) throw transactionError;
    });

    const addMerma = async (merma: Omit<Merma, 'id' | 'created_at'>) => logAndRefetch(`Registró merma de ${merma.quantity}x ${merma.itemName}`, async () => {
        if (!supabase) return;
        
        const mermaToInsert = {
            item_name: merma.itemName,
            item_type: merma.itemType,
            lot: merma.lot,
            quantity: merma.quantity,
            reason: merma.reason,
        };
        
        const { error: insertError } = await supabase.from('mermas').insert(mermaToInsert);
        if (insertError) throw insertError;

        if (merma.itemType === 'supply') {
            if (!merma.itemId) {
                 console.warn(`Merma registrada para un consumible sin ID. Realizando búsqueda por nombre como respaldo: ${merma.itemName}`);
                 const supplyToUpdate = supplies.find(s => s.name === merma.itemName);
                 if (supplyToUpdate) {
                    const { error: rpcError } = await supabase.rpc('decrement_supply_stock', { p_supply_id: supplyToUpdate.id, p_quantity: merma.quantity });
                    if (rpcError) throw rpcError;
                 } else {
                    console.error(`No se pudo encontrar el consumible "${merma.itemName}" para registrar la merma.`);
                 }
            } else {
                const { error: rpcError } = await supabase.rpc('decrement_supply_stock', { p_supply_id: merma.itemId, p_quantity: merma.quantity });
                if (rpcError) throw rpcError;
            }
        }
    });

    const addUser = async (userData: Omit<User, 'id'> & { password?: string }) => {
        await logAndRefetch(`Creó el usuario ${userData.name}`, async () => {
            if (!supabase) throw new Error("Cliente Supabase no inicializado.");
            if (userData.email === SUPER_USER_EMAIL) throw new Error("No se puede crear un usuario con el email del Super Usuario.");
            if (!userData.password) throw new Error("La contraseña es requerida para nuevos usuarios.");

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        full_name: userData.name,
                        role_id: userData.roleId
                    }
                }
            });

            if (authError) {
                console.error("Error creating auth user:", JSON.stringify(authError, null, 2));
                if (authError.message.includes("User already registered")) throw new Error("Este correo electrónico ya está en uso.");
                if (authError.message.includes("Password should be at least 6 characters")) throw new Error("La contraseña debe tener al menos 6 caracteres.");
                throw new Error(`Error al crear usuario: ${authError.message}`);
            }
            
            if (!authData.user) throw new Error("El registro falló, el servicio de autenticación no devolvió un usuario.");

            await new Promise(resolve => setTimeout(resolve, 1000));
        });
    };

    const updateUser = async (user: User) => {
        const userId = user?.id;
        const userInState = userId ? users.find(u => u.id === userId) : undefined;
        const finalName = userInState?.name || user?.name || user?.email || `con ID ${userId || 'desconocido'}`;

        await logAndRefetch(`Actualizó el perfil del usuario "${finalName}"`, async () => {
            if (!user || !user.id) throw new Error("No se pueden actualizar los datos de un usuario inválido.");
            const emailForCheck = userInState?.email || user.email;
            if (emailForCheck === SUPER_USER_EMAIL) throw new Error("El Super Usuario no puede ser modificado.");
            
            if (!supabase) return;
            const { error } = await supabase.from('users').update({ full_name: user.name, role_id: user.roleId }).eq('id', user.id);
            if (error) throw error;
        });
    };
    
    const deleteUser = async (userId: string, nameHint: string) => {
        const userInState = users.find(u => u.id === userId);
        const finalName = userInState?.name || nameHint || `con ID ${userId}`;

        await logAndRefetch(`Eliminó al usuario ${finalName}`, async () => {
            if (!supabase) return;
            if (userInState?.email === SUPER_USER_EMAIL) throw new Error("El Super Usuario no puede ser eliminado.");

            const { error } = await supabase.rpc('delete_user_by_id', { p_user_id: userId });
            
            if (error) {
                 console.error("Error deleting user via RPC:", error);
                 if (error.message.includes("function public.delete_user_by_id")) {
                     throw new Error(`¡ACCIÓN REQUERIDA EN SUPABASE! La función para eliminar usuarios no existe o es incorrecta. Por favor, vaya al 'SQL Editor' de Supabase y ejecute el script SQL que se encuentra en los comentarios de esta misma función ('deleteUser') en el archivo 'context/DataContext.tsx'.`);
                 }
                 throw error;
            }
        });
    };
    
    const addRole = async (role: Omit<Role, 'id' | 'created_at'>) => logAndRefetch(`Creó el rol ${role.name}`, async () => {
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
    });

    const updateRole = async (role: Role) => {
        const roleId = role?.id;
        const roleInState = roleId ? roles.find(r => r.id === roleId) : undefined;
        const finalName = roleInState?.name || role?.name || `con ID ${roleId || 'desconocido'}`;
    
        await logAndRefetch(`Actualizó el rol "${finalName}"`, async () => {
            if (!role || !role.id) throw new Error("No se pueden actualizar los datos de un rol inválido.");
            const nameForCheck = roleInState?.name || role.name;
            if (nameForCheck === SUPER_USER_ROLE_NAME) throw new Error("El rol de Super Usuario no puede ser modificado.");
            if (!supabase) return;
            const { error } = await supabase.from('roles').update({ name: role.name, permissions: role.permissions }).eq('id', role.id);
            if (error) throw error;
        });
    };
    
    const deleteRole = async (roleId: string, nameHint: string) => {
        const roleInState = roles.find(r => r.id === roleId);
        const finalName = roleInState?.name || nameHint || `con ID ${roleId}`;

        return logAndRefetch(`Eliminó el rol ${finalName}`, async () => {
            if (roleInState?.name === SUPER_USER_ROLE_NAME) throw new Error("El rol de Super Usuario no puede ser eliminado.");
            if (!supabase) return;
            const { error } = await supabase.from('roles').delete().eq('id', roleId);
            if (error) throw error;
        });
    };

    const updateCurrentUserPassword = async (password: string) => {
        await logAndRefetch('Actualizó su propia contraseña', async () => {
            if (!supabase) throw new Error("Cliente Supabase no inicializado.");
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                console.error("Error updating current user password:", error);
                throw new Error(`No se pudo actualizar la contraseña: ${error.message}`);
            }
        });
    };

    const updateUserPasswordByAdmin = async (userId: string, password: string) => {
        const userInState = users.find(u => u.id === userId);
        const userNameForLog = userInState?.name || `ID ${userId}`;
        const action = `Cambió la contraseña del usuario ${userNameForLog}`;

        await logAndRefetch(action, async () => {
            if (!supabase) throw new Error("Cliente Supabase no inicializado.");
            const freshUser = users.find(u => u.id === userId);
            if (!freshUser) throw new Error(`No se puede actualizar la contraseña porque el usuario con ID ${userId} no fue encontrado.`);
            
            const { error } = await supabase.rpc('admin_update_user_password', {
                user_id: userId,
                new_password: password
            });

            if (error) {
                console.error("Error updating user password via RPC:", JSON.stringify(error, null, 2));
                if (error.message.includes("gen_salt") && error.message.includes("does not exist")) {
                    const detailedError = `¡ACCIÓN REQUERIDA EN SUPABASE! La función de base de datos para esta operación es incorrecta. Para solucionarlo, por favor, vaya al archivo 'context/DataContext.tsx', copie el bloque de código SQL completo de los comentarios dentro de la función 'updateUserPasswordByAdmin' y ejecútelo en el 'SQL Editor' de su proyecto de Supabase. Esto corregirá el error: "${error.message}"`;
                    throw new Error(detailedError);
                }
                throw new Error(`Error al actualizar la contraseña del usuario: ${error.message}`);
            }
        });
    };

    const value = {
        currentUser, users, roles, albaranes, products, incidents, supplies, packs, packModels, salidas, auditLogs, mermas, loadingData,
        inventoryStock,
        addAlbaran, updateAlbaran, deleteAlbaran,
        addIncident, resolveIncident,
        addNewSupply, updateSupply, deleteSupply,
        addSupplyStock,
        addPackModel, addPack,
        handleDispatch,
        addMerma,
        addUser, updateUser, deleteUser,
        addRole, updateRole, deleteRole,
        addAuditLog,
        updateCurrentUserPassword,
        updateUserPasswordByAdmin
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
