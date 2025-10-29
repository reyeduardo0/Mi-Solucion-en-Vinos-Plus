import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import {
  User,
  Role,
  Albaran,
  Supply,
  PackModel,
  WinePack,
  Incident,
  DispatchNote,
  Merma,
  InventoryStockItem,
  Product,
  IncidentType,
  Pallet,
} from '../types';
import { getErrorMessage } from '../utils/helpers';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

interface DataContextType {
    currentUser: User | null;
    users: User[];
    roles: Role[];
    albaranes: Albaran[];
    supplies: Supply[];
    products: Product[];
    packModels: PackModel[];
    packs: WinePack[];
    salidas: DispatchNote[];
    incidents: Incident[];
    mermas: Merma[];
    auditLogs: any[]; // Changed to any[] as AuditLog type is removed
    inventoryStock: InventoryStockItem[];
    loading: boolean;
    error: string | null;

    addAlbaran: (albaran: Albaran) => Promise<void>;
    updateAlbaran: (albaran: Albaran) => Promise<void>;
    deleteAlbaran: (albaran: Albaran) => Promise<void>;

    addNewSupply: (supplyData: Omit<Supply, 'id' | 'created_at' | 'quantity'>, initialData?: { quantity: number; lot: string }) => Promise<void>;
    addSupplyStock: (supplyId: string, quantity: number, lot: string) => Promise<void>;
    updateSupply: (supply: Supply) => Promise<void>;
    deleteSupply: (supplyId: string, supplyName: string) => Promise<void>;
    updateSupplyLot: (supplyName: string, originalLot: string, newLot: string) => Promise<void>;
    
    addPackModel: (model: Omit<PackModel, 'id'|'created_at'>) => Promise<void>;

    addPack: (pack: WinePack) => Promise<void>;
    handleDispatch: (dispatchData: Omit<DispatchNote, 'id' | 'created_at' | 'status'>) => Promise<void>;
    addMerma: (merma: Omit<Merma, 'id' | 'created_at'>) => Promise<void>;
    
    addIncident: (incidentData: Omit<Incident, 'id'|'date'|'resolved'|'created_at'>) => Promise<void>;
    resolveIncident: (incident: Incident) => Promise<void>;
    
    addUser: (userData: Omit<User, 'id'> & { password?: string }) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string, userName: string) => Promise<void>;
    updateCurrentUserPassword: (newPassword: string) => Promise<void>;
    updateUserPasswordByAdmin: (userId: string, newPassword: string) => Promise<void>;
    
    addRole: (roleData: Omit<Role, 'id' | 'created_at'>) => Promise<void>;
    updateRole: (role: Role) => Promise<void>;
    deleteRole: (roleId: string, roleName: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = (): DataContextType => {
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

const SUPER_USER_ROLE_NAME = 'Super Usuario';

export const DataProvider: React.FC<DataProviderProps> = ({ children, session }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [albaranes, setAlbaranes] = useState<Albaran[]>([]);
    const [supplies, setSupplies] = useState<Supply[]>([]);
    const [packModels, setPackModels] = useState<PackModel[]>([]);
    const [packs, setPacks] = useState<WinePack[]>([]);
    const [salidas, setSalidas] = useState<DispatchNote[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [mermas, setMermas] = useState<Merma[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    
    const addAuditLog = useCallback(async (action: string, userId?: string, userName?: string) => {
        const log = {
            userid: userId || currentUser?.id || SYSTEM_USER_ID,
            username: userName || currentUser?.name || 'System',
            action,
        };
        const { error } = await supabase!.from('audit_logs').insert(log);
        if (error) {
            console.error(`Error adding audit log: ${error.message}`, { details: error.details, failedLog: log });
        }
    }, [currentUser]);

    const fetchData = useCallback(async () => {
        if (!session.user) return;
        setLoading(true);
        setError(null);
        try {
            // Step 1: Fetch critical user and role data first
            const [userProfilesResult, rolesResult] = await Promise.all([
                supabase!.from('users').select('id, full_name, email, role_id'),
                supabase!.from('roles').select('*')
            ]);

            if (userProfilesResult.error) throw userProfilesResult.error;
            if (rolesResult.error) throw rolesResult.error;

            const fetchedRoles = rolesResult.data || [];
            setRoles(fetchedRoles);

            const mappedUsers: User[] = (userProfilesResult.data || []).map((u: any) => ({
                id: u.id,
                name: u.full_name,
                email: u.email,
                roleId: u.role_id,
            }));

            let finalCurrentUser = mappedUsers.find(u => u.id === session.user.id);

            // Step 2: If user profile is missing from the public table, construct it from auth metadata.
            // This makes the app resilient to DB trigger delays or failures.
            if (!finalCurrentUser) {
                console.warn("User profile not found in 'users' table. Constructing from auth metadata.");
                const authUser = session.user;
                const userRoleId = authUser.user_metadata.role_id;
                const defaultRole = fetchedRoles.find(r => r.name.toLowerCase() !== 'admin' && r.name.toLowerCase() !== SUPER_USER_ROLE_NAME.toLowerCase()) || fetchedRoles[0];
                const roleIdToUse = userRoleId || defaultRole?.id;

                if (!roleIdToUse) throw new Error("User profile is missing and no suitable role could be found.");

                finalCurrentUser = {
                    id: authUser.id,
                    email: authUser.email!,
                    name: authUser.user_metadata.full_name || authUser.email!.split('@')[0],
                    roleId: roleIdToUse,
                };
                mappedUsers.push(finalCurrentUser); // Add the constructed user to the list
            }
            
            setUsers(mappedUsers);
            setCurrentUser(finalCurrentUser || null);

            if (!finalCurrentUser) {
                throw new Error("Could not determine current user. Please log out and log back in.");
            }

            // Step 3: Fetch the rest of the application data in parallel
            const remainingDataResults = await Promise.all([
                supabase!.from('albaranes').select(`
                    id, 
                    entryDate:entrydate, 
                    truckPlate:truckplate, 
                    origin, carrier, driver, status, 
                    incidentDetails:incidentdetails, 
                    incidentImages:incidentimages, 
                    created_at,
                    pallets (
                        id,
                        palletNumber:palletnumber,
                        productName:product_name,
                        productLot:product_lot,
                        boxesPerPallet:boxesperpallet,
                        bottlesPerBox:bottlesperbox,
                        totalBottles:totalbottles,
                        eanBottle:eanbottle,
                        eanBox:eanbox,
                        sscc,
                        labelImage:labelimage,
                        incidentDescription:incident_description,
                        incidentImages:incident_images,
                        created_at
                    )
                `).order('created_at', { ascending: false }),
                supabase!.from('supplies').select('id, name, type, unit, quantity, minStock:minstock, created_at').order('name'),
                supabase!.from('pack_models').select('id, name, description, productRequirements:productrequirements, supplyRequirements:supplyrequirements, created_at').order('name'),
                supabase!.from('wine_packs').select('id, modelId:modelid, modelName:modelname, orderId:orderid, creationDate:creationdate, contents, suppliesUsed:suppliesused, additionalComponents:additionalcomponents, packImage:packimage, status, created_at').order('created_at', { ascending: false }),
                supabase!.from('dispatch_notes').select('id, dispatchDate:dispatchdate, customer, destination, carrier, truckPlate:truckplate, driver, packIds:packids, status, created_at').order('created_at', { ascending: false }),
                supabase!.from('incidents').select('id, type, description, images, date, resolved, relatedId:relatedid, created_at').order('created_at', { ascending: false }),
                supabase!.from('mermas').select('id, itemName:item_name, itemType:item_type, lot, quantity, reason, created_at').order('created_at', { ascending: false }),
                supabase!.from('audit_logs').select('id, username, action, timestamp').order('timestamp', { ascending: false }).limit(200),
            ]);
            
            const errors = remainingDataResults.map(r => r.error).filter(Boolean);
            if (errors.length > 0) throw errors[0];

            const fetchedAlbaranesRaw = (remainingDataResults[0].data as any[]) || [];
            const fetchedSupplies = remainingDataResults[1].data || [];
            const fetchedPackModels = remainingDataResults[2].data || [];
            const fetchedPacks = remainingDataResults[3].data || [];
            const fetchedSalidas = remainingDataResults[4].data || [];
            const fetchedIncidents = remainingDataResults[5].data || [];
            const fetchedMermas = remainingDataResults[6].data || [];
            const fetchedAuditLogsRaw = remainingDataResults[7].data || [];
            
            const supplyNames = new Set(fetchedSupplies.map(s => s.name));

            const fetchedAlbaranes = fetchedAlbaranesRaw.map(albaran => {
                const processedPallets = (albaran.pallets || []).map((p: any): Pallet => {
                    const isConsumable = p.productName && supplyNames.has(p.productName);
                    return {
                        id: p.id,
                        palletNumber: p.palletNumber,
                        type: isConsumable ? 'consumable' : 'product',
                        product: p.productName || p.productLot ? { name: p.productName, lot: p.productLot } : undefined,
                        boxesPerPallet: p.boxesPerPallet,
                        bottlesPerBox: p.bottlesPerBox,
                        totalBottles: p.totalBottles,
                        eanBottle: p.eanBottle,
                        eanBox: p.eanBox,
                        supplyName: isConsumable ? p.productName : undefined,
                        supplyQuantity: isConsumable ? p.totalBottles : undefined,
                        supplyLot: isConsumable ? p.productLot : undefined,
                        sscc: p.sscc,
                        labelImage: p.labelImage,
                        incident: p.incidentDescription ? { description: p.incidentDescription, images: p.incidentImages || [] } : undefined,
                        created_at: p.created_at,
                    }
                });
                return { ...albaran, pallets: processedPallets };
            });

            const fetchedAuditLogs = fetchedAuditLogsRaw.map((log: any) => ({
                id: log.id,
                userName: log.username,
                action: log.action,
                timestamp: log.timestamp,
            }));

            setAlbaranes(fetchedAlbaranes);
            setSupplies(fetchedSupplies);
            setPackModels(fetchedPackModels);
            setPacks(fetchedPacks);
            setSalidas(fetchedSalidas);
            setIncidents(fetchedIncidents);
            setMermas(fetchedMermas);
            setAuditLogs(fetchedAuditLogs);

            // Check for potential RLS issue: data fetch is successful but returns no items.
            const hasAnyCoreData = fetchedAlbaranes.length > 0 || fetchedSupplies.length > 0 || fetchedPacks.length > 0;
            // Avoid false positives on a completely new DB. Roles should always exist for the app to function.
            if (fetchedRoles.length > 0 && !hasAnyCoreData && error === null) {
                 setError("No se han cargado datos. Si has añadido datos directamente en Supabase, asegúrate de haber configurado las políticas de Seguridad a Nivel de Fila (RLS) para permitir el acceso de lectura (SELECT) a los usuarios autenticados.");
            }

        } catch (e: any) {
            setError(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [session.user]);
    
    useEffect(() => {
        if (session.user) {
            fetchData();
        } else {
            setLoading(false);
        }

        const channel = supabase!
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase!.removeChannel(channel);
        };
    }, [session.user, fetchData]);

    const products = useMemo(() => {
        const productSet = new Set<string>();
        albaranes.forEach(albaran => {
            albaran.pallets?.forEach(pallet => {
                if (pallet.type === 'product' && pallet.product?.name) {
                    productSet.add(pallet.product.name);
                }
            });
        });
        return Array.from(productSet).map(name => ({ id: name, name, type: 'wine' as const, sku: '' }));
    }, [albaranes]);
    
    const inventoryStock = useMemo((): InventoryStockItem[] => {
        const stockMap = new Map<string, InventoryStockItem>();

        albaranes.forEach(albaran => {
            albaran.pallets?.forEach(pallet => {
                if (pallet.type === 'product' && pallet.product?.name && pallet.product?.lot) {
                    const key = `product-${pallet.product.name}-${pallet.product.lot}`;
                    if (!stockMap.has(key)) {
                        stockMap.set(key, { name: pallet.product.name, type: 'Producto', lot: pallet.product.lot, unit: 'botellas', total: 0, inPacks: 0, inMerma: 0, available: 0 });
                    }
                    const item = stockMap.get(key)!;
                    item.total += pallet.totalBottles || 0;
                } else if (pallet.type === 'consumable' && pallet.product?.name) {
                     const supplyInfo = supplies.find(s => s.name === pallet.product?.name);
                     if (supplyInfo) {
                        const lot = pallet.product?.lot || 'SIN LOTE';
                        const key = `supply-${supplyInfo.name}-${lot}`;
                        if (!stockMap.has(key)) {
                            stockMap.set(key, { name: supplyInfo.name, type: 'Consumible', lot: lot, unit: supplyInfo.unit, total: 0, inPacks: 0, inMerma: 0, available: 0, minStock: supplyInfo.minStock });
                        }
                        stockMap.get(key)!.total += pallet.totalBottles || 0; // Use totalBottles as quantity
                     }
                }
            });
        });
        
        supplies.forEach(supply => {
            const hasLotEntries = Array.from(stockMap.keys()).some(k => k.startsWith(`supply-${supply.name}-`) && !k.endsWith('SIN LOTE'));
            if (supply.quantity > 0 && !hasLotEntries) {
                 const key = `supply-${supply.name}-SIN LOTE`;
                 if (!stockMap.has(key)) {
                    stockMap.set(key, { name: supply.name, type: 'Consumible', lot: 'SIN LOTE', unit: supply.unit, total: 0, inPacks: 0, inMerma: 0, available: 0, minStock: supply.minStock });
                }
                stockMap.get(key)!.total += supply.quantity;
            }
        });

        packs.forEach(pack => {
            pack.contents?.forEach(content => {
                const key = `product-${content.productName}-${content.lot}`;
                if (stockMap.has(key)) stockMap.get(key)!.inPacks += content.quantity;
            });
            pack.suppliesUsed?.forEach(supplyUsed => {
                 const supplyInfo = supplies.find(s => s.id === supplyUsed.supplyId);
                if(supplyInfo){
                    const key = `supply-${supplyInfo.name}-SIN LOTE`;
                    if (stockMap.has(key)) stockMap.get(key)!.inPacks += supplyUsed.quantity;
                }
            });
        });

        mermas.forEach(merma => {
            const key = merma.itemType === 'product' ? `product-${merma.itemName}-${merma.lot}` : `supply-${merma.itemName}-${merma.lot || 'SIN LOTE'}`;
            if (stockMap.has(key)) stockMap.get(key)!.inMerma += merma.quantity;
        });

        const result = Array.from(stockMap.values());
        result.forEach(item => { item.available = item.total - item.inPacks - item.inMerma; });

        return result.sort((a, b) => a.name.localeCompare(b.name) || (a.lot || '').localeCompare(b.lot || ''));
    }, [albaranes, supplies, packs, mermas]);

    // Data modification functions
    const addAlbaran = async (albaran: Albaran) => {
        const { pallets, ...albaranData } = albaran;
        const dbAlbaran = {
            id: albaranData.id,
            entrydate: albaranData.entryDate,
            truckplate: albaranData.truckPlate,
            origin: albaranData.origin,
            carrier: albaranData.carrier,
            driver: albaranData.driver,
            status: albaranData.status,
            incidentdetails: albaranData.incidentDetails,
            incidentimages: albaranData.incidentImages,
        };
        const { error: albaranError } = await supabase!.from('albaranes').insert(dbAlbaran);
        if (albaranError) throw albaranError;
    
        if (pallets && pallets.length > 0) {
            const dbPallets = pallets.map(p => ({
                id: p.id,
                albaran_id: albaranData.id,
                palletnumber: p.palletNumber,
                product_name: p.product?.name,
                product_lot: p.product?.lot,
                // For consumables, these will be null, which is fine
                boxesperpallet: p.boxesPerPallet,
                bottlesperbox: p.bottlesPerBox,
                // Use totalBottles for product quantity and supplyQuantity for consumable quantity
                totalbottles: p.type === 'consumable' ? p.supplyQuantity : p.totalBottles,
                eanbottle: p.eanBottle,
                eanbox: p.eanBox,
                sscc: p.sscc,
                labelimage: p.labelImage,
                incident_description: p.incident?.description,
                incident_images: p.incident?.images,
            }));
            const { error: palletsError } = await supabase!.from('pallets').insert(dbPallets);
            if (palletsError) {
                console.error("Error inserting pallets for new albaran:", palletsError);
                throw palletsError;
            }
        }
        await addAuditLog(`Registró la entrada "${albaran.id}"`);
    };
    
    const updateAlbaran = async (albaran: Albaran) => {
        const { pallets, ...albaranData } = albaran;
        const { id, entryDate, truckPlate, origin, carrier, driver, status, incidentDetails, incidentImages } = albaranData;
        
        const dbAlbaranUpdate = {
            entrydate: entryDate,
            truckplate: truckPlate,
            origin: origin,
            carrier: carrier,
            driver: driver,
            status: status,
            incidentdetails: incidentDetails,
            incidentimages: incidentImages,
        };
        const { error: updateError } = await supabase!.from('albaranes').update(dbAlbaranUpdate).eq('id', id);
        if (updateError) throw updateError;
    
        const { error: deleteError } = await supabase!.from('pallets').delete().eq('albaran_id', id);
        if (deleteError) throw deleteError;
    
        if (pallets && pallets.length > 0) {
            const dbPallets = pallets.map(p => ({
                id: p.id,
                albaran_id: id,
                palletnumber: p.palletNumber,
                product_name: p.product?.name,
                product_lot: p.product?.lot,
                boxesperpallet: p.boxesPerPallet,
                bottlesperbox: p.bottlesPerBox,
                totalbottles: p.type === 'consumable' ? p.supplyQuantity : p.totalBottles,
                eanbottle: p.eanBottle,
                eanbox: p.eanBox,
                sscc: p.sscc,
                labelimage: p.labelImage,
                incident_description: p.incident?.description,
                incident_images: p.incident?.images,
            }));
            const { error: insertError } = await supabase!.from('pallets').insert(dbPallets);
            if (insertError) throw insertError;
        }
    
        await addAuditLog(`Actualizó la entrada "${albaran.id}"`);
    };

    const deleteAlbaran = async (albaran: Albaran) => {
        // Assuming ON DELETE CASCADE is set for pallets.albaran_id -> albaranes.id
        const { error } = await supabase!.from('albaranes').delete().eq('id', albaran.id);
        if (error) throw error;
        await addAuditLog(`Eliminó la entrada "${albaran.id}"`);
    };
    
    const addNewSupply = async (supplyData: Omit<Supply, 'id' | 'created_at' | 'quantity'>, initialData?: { quantity: number; lot: string }) => {
        const { name, type, unit, minStock } = supplyData;
        const dbData = { name, type, unit, minstock: minStock, quantity: 0 };
        const { data, error } = await supabase!.from('supplies').insert(dbData).select().single();
        if (error) throw error;
        await addAuditLog(`Creó el consumible "${supplyData.name}"`);
        if (initialData?.quantity && initialData.quantity > 0) {
            await addSupplyStock(data.id, initialData.quantity, initialData.lot);
        }
    };
    const addSupplyStock = async (supplyId: string, quantity: number, lot: string) => {
        const supply = supplies.find(s => s.id === supplyId);
        if (!supply) throw new Error('Consumible no encontrado');
        if (lot) {
            const newAlbaran: Albaran = {
                id: `CONS-${supply.name.substring(0,4).toUpperCase()}-${Date.now()}`,
                entryDate: new Date().toISOString(),
                truckPlate: 'INTERNO',
                carrier: 'Stock Interno',
                status: 'verified',
                pallets: [{
                    id: `pal-${Date.now()}`,
                    palletNumber: `pal-${Date.now()}`,
                    type: 'consumable',
                    product: { name: supply.name, lot: lot },
                    supplyQuantity: quantity, // Use this for client-side logic
                }]
            };
            await addAlbaran(newAlbaran);
        } else {
             const { error } = await supabase!.from('supplies').update({ quantity: (supply.quantity || 0) + quantity }).eq('id', supplyId);
            if (error) throw error;
        }
        await addAuditLog(`Añadió ${quantity} de stock al consumible "${supply.name}"`);
    };
    const updateSupply = async (supply: Supply) => {
        const { id, name, type, unit, quantity, minStock } = supply;
        const dbData = { name, type, unit, quantity, minstock: minStock };
        const { error } = await supabase!.from('supplies').update(dbData).eq('id', id);
        if (error) throw error;
        await addAuditLog(`Actualizó el consumible "${supply.name}"`);
    };
    const deleteSupply = async (supplyId: string, supplyName: string) => {
        const { error } = await supabase!.from('supplies').delete().eq('id', supplyId);
        if (error) throw error;
        await addAuditLog(`Eliminó el consumible "${supplyName}"`);
    };
     const updateSupplyLot = async (supplyName: string, originalLot: string, newLot: string) => {
        const albaranesToUpdate = albaranes.filter(a => a.pallets?.some(p => p.type === 'consumable' && p.product?.name === supplyName && p.product?.lot === originalLot));
        for (const albaran of albaranesToUpdate) {
            const newPallets: Pallet[] = albaran.pallets.map(p => (p.type === 'consumable' && p.product?.name === supplyName && p.product?.lot === originalLot) ? { ...p, product: { ...p.product, lot: newLot } } as Pallet : p);
            await updateAlbaran({ ...albaran, pallets: newPallets });
        }
        await addAuditLog(`Renombró el lote "${originalLot}" a "${newLot}" para el consumible "${supplyName}"`);
    };
    
    const addPackModel = async (model: Omit<PackModel, 'id'|'created_at'>) => {
        const { name, description, productRequirements, supplyRequirements } = model;
        const dbModel = { name, description, productrequirements: productRequirements, supplyrequirements: supplyRequirements };
        const { error } = await supabase!.from('pack_models').insert(dbModel);
        if (error) throw error;
        await addAuditLog(`Creó el modelo de pack "${model.name}"`);
    };

    const addPack = async (pack: WinePack) => {
        const { id, modelId, modelName, orderId, creationDate, contents, suppliesUsed, additionalComponents, packImage, status } = pack;
        const dbPack = { id, modelid: modelId, modelname: modelName, orderid: orderId, creationdate: creationDate, contents, suppliesused: suppliesUsed, additionalcomponents: additionalComponents, packimage: packImage, status };
        const { error } = await supabase!.from('wine_packs').insert(dbPack);
        if (error) throw error;
        await addAuditLog(`Ensambló el pack "${pack.id}" para la orden "${pack.orderId}"`);
    };
    const handleDispatch = async (dispatchData: Omit<DispatchNote, 'id' | 'created_at' | 'status'>) => {
        const id = `SAL-${Date.now()}`;
        const note: DispatchNote = { ...dispatchData, id, status: 'Despachado' };
        const { dispatchDate, customer, destination, carrier, truckPlate, driver, packIds, status } = note;
        const dbNote = { id, dispatchdate: dispatchDate, customer, destination, carrier, truckplate: truckPlate, driver, packids: packIds, status };

        const { error } = await supabase!.from('dispatch_notes').insert(dbNote);
        if (error) throw error;
        for (const packId of dispatchData.packIds) {
            await supabase!.from('wine_packs').update({ status: 'Despachado' }).eq('id', packId);
        }
        await addAuditLog(`Creó la salida "${id}" para el cliente "${dispatchData.customer}"`);
    };
    const addMerma = async (merma: Omit<Merma, 'id' | 'created_at'>) => {
        const { itemName, itemType, lot, quantity, reason } = merma;
        const dbMerma = { item_name: itemName, item_type: itemType, lot, quantity, reason };
        const { error } = await supabase!.from('mermas').insert(dbMerma);
        if (error) throw error;
        await addAuditLog(`Registró una merma de ${merma.quantity} para "${merma.itemName}"`);
    };

    const addIncident = async (incidentData: Omit<Incident, 'id'|'date'|'resolved'|'created_at'>) => {
        const { relatedId, ...rest } = incidentData;
        const newIncident = { ...rest, relatedid: relatedId, id: `INC-${Date.now()}`, date: new Date().toISOString(), resolved: false };
        const { error } = await supabase!.from('incidents').insert(newIncident);
        if (error) throw error;
        await addAuditLog(`Registró una incidencia para "${incidentData.relatedId}"`);
    };
    const resolveIncident = async (incident: Incident) => {
        const { error } = await supabase!.from('incidents').update({ resolved: true }).eq('id', incident.id);
        if (error) throw error;
        await addAuditLog(`Resolvió la incidencia "${incident.id}"`);
    };
    
    const addUser = async (userData: Omit<User, 'id'> & { password?: string }) => {
        if (!userData.password) throw new Error("La contraseña es obligatoria para nuevos usuarios.");
        const { data: authData, error: authError } = await supabase!.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: { data: { full_name: userData.name, role_id: userData.roleId } }
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("No se pudo crear el usuario en Supabase Auth.");
        await addAuditLog(`Creó el usuario "${userData.name}" (${userData.email})`);
    };
    const updateUser = async (user: User) => {
        const { error } = await supabase!.from('users').update({ full_name: user.name, role_id: user.roleId }).eq('id', user.id);
        if (error) throw error;
        await addAuditLog(`Actualizó los datos del usuario "${user.name}"`);
    };
    const deleteUser = async (userId: string, userName: string) => {
        const { error } = await supabase!.rpc('delete_user_by_id', { user_id_to_delete: userId });
        if (error) throw error;
        await addAuditLog(`Eliminó al usuario "${userName}"`);
    };
    const updateCurrentUserPassword = async (newPassword: string) => {
        const { error } = await supabase!.auth.updateUser({ password: newPassword });
        if (error) throw error;
        await addAuditLog("Actualizó su propia contraseña");
    };
    const updateUserPasswordByAdmin = async (userId: string, newPassword: string) => {
        const { error } = await supabase!.auth.admin.updateUserById(userId, { password: newPassword });
        if (error) throw error;
    };
    
    const addRole = async (roleData: Omit<Role, 'id' | 'created_at'>) => {
        const { error } = await supabase!.from('roles').insert(roleData);
        if (error) throw error;
        await addAuditLog(`Creó el rol "${roleData.name}"`);
    };
    const updateRole = async (role: Role) => {
        const { error } = await supabase!.from('roles').update({ name: role.name, permissions: role.permissions }).eq('id', role.id);
        if (error) throw error;
        await addAuditLog(`Actualizó el rol "${role.name}"`);
    };
    const deleteRole = async (roleId: string, roleName: string) => {
        const { error } = await supabase!.from('roles').delete().eq('id', roleId);
        if (error) throw error;
        await addAuditLog(`Eliminó el rol "${roleName}"`);
    };

    const value = {
        currentUser, users, roles, albaranes, supplies, products, packModels, packs, salidas, incidents, mermas, auditLogs, inventoryStock, loading, error,
        addAlbaran, updateAlbaran, deleteAlbaran,
        addNewSupply, addSupplyStock, updateSupply, deleteSupply, updateSupplyLot,
        addPackModel,
        addPack, handleDispatch, addMerma,
        addIncident, resolveIncident,
        addUser, updateUser, deleteUser, updateCurrentUserPassword, updateUserPasswordByAdmin,
        addRole, updateRole, deleteRole
    };
    
    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};