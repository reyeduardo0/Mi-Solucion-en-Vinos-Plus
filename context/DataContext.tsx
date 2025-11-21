
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { Session, createClient } from '@supabase/supabase-js';
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
  ProductionReport,
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
    productionReports: ProductionReport[];
    auditLogs: any[]; 
    inventoryStock: InventoryStockItem[];
    loading: boolean;
    error: string | null;

    addAlbaran: (albaran: Albaran) => Promise<void>;
    updateAlbaran: (albaran: Albaran) => Promise<void>;
    deleteAlbaran: (albaran: Albaran) => Promise<void>;

    addNewSupply: (supplyData: Omit<Supply, 'id' | 'created_at' | 'quantity'>, initialData?: { quantity: number; lot: string }) => Promise<string>;
    addSupplyStock: (supplyId: string, quantity: number, lot: string) => Promise<void>;
    updateSupply: (supply: Supply) => Promise<void>;
    deleteSupply: (supplyId: string, supplyName: string) => Promise<void>;
    updateSupplyLot: (supplyName: string, originalLot: string, newLot: string) => Promise<void>;
    
    addPackModel: (model: Omit<PackModel, 'id'|'created_at'>) => Promise<void>;

    addPack: (pack: WinePack) => Promise<void>;
    handleDispatch: (dispatchData: Omit<DispatchNote, 'id' | 'created_at' | 'status'>) => Promise<void>;
    addMerma: (merma: Omit<Merma, 'id' | 'created_at'>) => Promise<void>;
    
    addProductionReport: (report: Omit<ProductionReport, 'created_at'>) => Promise<void>;
    deleteProductionReport: (id: string, packId: string) => Promise<void>;

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
    const [productionReports, setProductionReports] = useState<ProductionReport[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    
    const addAuditLog = useCallback(async (action: string, userId?: string, userName?: string) => {
        const log = {
            userid: userId || currentUser?.id || SYSTEM_USER_ID,
            username: userName || currentUser?.name || 'System',
            action,
        };
        const { error } = await supabase!.from('audit_logs').insert(log);
        if (error) {
            console.error(`Error adding audit log: ${getErrorMessage(error)}`, { failedLog: log });
        }
    }, [currentUser]);

    const fetchData = useCallback(async () => {
        if (!session.user) return;
        setLoading(true);
        setError(null);
        try {
            const [userProfilesResult, rolesResult] = await Promise.all([
                supabase!.from('users').select('id, full_name, email, role_id'),
                supabase!.from('roles').select('*')
            ]);

            if (userProfilesResult.error) throw userProfilesResult.error;
            if (rolesResult.error) throw rolesResult.error;

            const fetchedRoles = (rolesResult.data || []).filter(Boolean);
            setRoles(fetchedRoles);

            const mappedUsers: User[] = (userProfilesResult.data || []).filter(Boolean).map((u: any) => ({
                id: u.id,
                name: u.full_name,
                email: u.email,
                roleId: u.role_id,
            }));

            let finalCurrentUser = mappedUsers.find(u => u.id === session.user.id);

            if (!finalCurrentUser) {
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
                mappedUsers.push(finalCurrentUser);
            }
            
            setUsers(mappedUsers);
            setCurrentUser(finalCurrentUser || null);

            if (!finalCurrentUser) {
                throw new Error("Could not determine current user. Please log out and log back in.");
            }
            
            const albaranesResult = await supabase!.from('albaranes').select(`
                    id, entryDate:entry_date, truckPlate:truck_plate, origin, carrier, driver, status, incidentDetails:incident_details, incidentImages:incident_images, created_at,
                    pallets (id, palletNumber:palletnumber, productName:product_name, productLot:product_lot, boxesPerPallet:boxesperpallet, bottlesPerBox:bottlesperbox, totalBottles:totalbottles, eanBottle:eanbottle, eanBox:eanbox, sscc, labelImage:labelimage, incidentDescription:incident_description, incidentImages:incident_images, created_at)
                `).order('created_at', { ascending: false });
            if (albaranesResult.error) throw albaranesResult.error;

            const [suppliesResult, packModelsResult] = await Promise.all([
                supabase!.from('supplies').select('id, name, type, unit, quantity, minStock:min_stock, created_at').order('name'),
                supabase!.from('pack_models').select('id, name, description, productRequirements:product_requirements, supplyRequirements:supply_requirements, created_at').order('name')
            ]);
            if (suppliesResult.error) throw suppliesResult.error;
            if (packModelsResult.error) throw packModelsResult.error;

            const [packsResult, salidasResult] = await Promise.all([
                supabase!.from('wine_packs').select('id, modelId:model_id, modelName:model_name, orderId:order_id, creationDate:creation_date, contents, suppliesUsed:supplies_used, additionalComponents:additional_components, packImage:pack_image, status, created_at').order('created_at', { ascending: false }),
                supabase!.from('dispatch_notes').select('id, dispatchDate:dispatch_date, customer, destination, carrier, truckPlate:truck_plate, driver, packIds:pack_ids, status, created_at').order('created_at', { ascending: false })
            ]);
            if (packsResult.error) throw packsResult.error;
            if (salidasResult.error) throw salidasResult.error;

            const [incidentsResult, mermasResult, auditLogsResult, prodReportsResult] = await Promise.all([
                supabase!.from('incidents').select('id, type, description, images, date, resolved, relatedId:related_id, created_at').order('created_at', { ascending: false }),
                supabase!.from('mermas').select('id, itemName:item_name, itemType:item_type, lot, quantity, reason, created_at').order('created_at', { ascending: false }),
                supabase!.from('audit_logs').select('id, username, action, timestamp').order('timestamp', { ascending: false }).limit(200),
                supabase!.from('production_reports').select('id, packId:pack_id, reportDate:report_date, producedQuantity:produced_quantity, consumptions, notes, created_at').order('created_at', { ascending: false }),
            ]);
            if (incidentsResult.error) throw incidentsResult.error;
            if (mermasResult.error) throw mermasResult.error;
            if (auditLogsResult.error) throw auditLogsResult.error;
            if (prodReportsResult.error) throw prodReportsResult.error;

            const fetchedAlbaranesRaw = (albaranesResult.data as any[]) || [];
            const fetchedSupplies = (suppliesResult.data || []).filter(Boolean);
            const fetchedPackModels = (packModelsResult.data || []).filter(Boolean);
            const fetchedPacks = (packsResult.data || []).filter(Boolean);
            const fetchedSalidas = (salidasResult.data || []).filter(Boolean);
            const fetchedIncidents = (incidentsResult.data || []).filter(Boolean);
            const fetchedMermas = (mermasResult.data || []).filter(Boolean);
            const fetchedProdReports = (prodReportsResult.data || []).filter(Boolean);
            const fetchedAuditLogsRaw = (auditLogsResult.data as any[]) || [];
            
            const supplyNames = new Set(fetchedSupplies.map(s => s.name));
            
            const fetchedAlbaranes = fetchedAlbaranesRaw.filter(Boolean).map((albaran): Albaran => {
                 const processedPallets = (Array.isArray(albaran.pallets) ? albaran.pallets : []).filter(Boolean).map((p: any): Pallet => {
                    const basePallet = {
                        id: p.id, palletNumber: p.palletNumber, sscc: p.sscc, labelImage: p.labelImage, incident: p.incidentDescription ? { description: p.incidentDescription, images: p.incidentImages || [] } : undefined, created_at: p.created_at,
                    };
                    const hasProductQuantities = (p.boxesPerPallet != null && p.boxesPerPallet > 0) || (p.bottlesPerBox != null && p.bottlesPerBox > 0);
                    const matchesSupplyName = p.productName && supplyNames.has(p.productName);
                    if (hasProductQuantities) {
                        return { ...basePallet, type: 'product', product: { name: p.productName || '', lot: p.productLot || '' }, boxesPerPallet: p.boxesPerPallet, bottlesPerBox: p.bottlesPerBox, totalBottles: p.totalBottles, eanBottle: p.eanBottle, eanBox: p.eanBox };
                    }
                    if (matchesSupplyName) {
                        return { ...basePallet, type: 'consumable', supplyName: p.productName, supplyQuantity: p.totalBottles, supplyLot: p.productLot, eanBox: p.eanBox };
                    }
                    return { ...basePallet, type: 'product', product: { name: p.productName || '', lot: p.productLot || '' }, boxesPerPallet: p.boxesPerPallet, bottlesPerBox: p.bottlesPerBox, totalBottles: p.totalBottles, eanBottle: p.eanBottle, eanBox: p.eanBox };
                });
                return { ...albaran, pallets: processedPallets };
            });

            const fetchedAuditLogs = fetchedAuditLogsRaw.filter(Boolean).map((log: any) => ({ id: log.id, userName: log.username, action: log.action, timestamp: log.timestamp }));

            setAlbaranes(fetchedAlbaranes);
            setSupplies(fetchedSupplies);
            setPackModels(fetchedPackModels);
            setPacks(fetchedPacks);
            setSalidas(fetchedSalidas);
            setIncidents(fetchedIncidents);
            setMermas(fetchedMermas);
            setProductionReports(fetchedProdReports);
            setAuditLogs(fetchedAuditLogs);

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
            (Array.isArray(albaran.pallets) ? albaran.pallets : []).filter(Boolean).forEach(pallet => {
                if (pallet.type === 'product' && pallet.product?.name && pallet.product?.lot) {
                    const key = `product-${pallet.product.name}-${pallet.product.lot}`;
                    if (!stockMap.has(key)) {
                        stockMap.set(key, { name: pallet.product.name, type: 'Producto', lot: pallet.product.lot, unit: 'botellas', total: 0, inPacks: 0, inMerma: 0, available: 0 });
                    }
                    stockMap.get(key)!.total += pallet.totalBottles || 0;
                } else if (pallet.type === 'consumable' && pallet.supplyName) {
                     const supplyInfo = supplies.find(s => s.name === pallet.supplyName);
                     if (supplyInfo) {
                        const lot = pallet.supplyLot || 'SIN LOTE';
                        const key = `supply-${supplyInfo.name}-${lot}`;
                        if (!stockMap.has(key)) {
                            stockMap.set(key, { name: supplyInfo.name, type: 'Consumible', lot: lot, unit: supplyInfo.unit, total: 0, inPacks: 0, inMerma: 0, available: 0, minStock: supplyInfo.minStock });
                        }
                        stockMap.get(key)!.total += pallet.supplyQuantity || 0;
                     }
                }
            });
        });
        
        supplies.forEach(supply => {
            if (supply.quantity > 0) {
                 const key = `supply-${supply.name}-SIN LOTE`;
                 if (!stockMap.has(key)) {
                    stockMap.set(key, { name: supply.name, type: 'Consumible', lot: 'SIN LOTE', unit: supply.unit, total: 0, inPacks: 0, inMerma: 0, available: 0, minStock: supply.minStock });
                }
                stockMap.get(key)!.total += supply.quantity || 0;
            }
        });

        packs.forEach(pack => {
            if (Array.isArray(pack.contents)) {
                pack.contents.forEach(content => {
                    if (!content || !content.productName || !content.lot) return;
                    const key = `product-${content.productName}-${content.lot}`;
                    if (stockMap.has(key)) {
                        stockMap.get(key)!.inPacks += content.quantity || 0;
                    }
                });
            }
            if (Array.isArray(pack.suppliesUsed)) {
                pack.suppliesUsed.forEach(supplyUsed => {
                    if (!supplyUsed) return;
                    const supplyInfo = supplies.find(s => s.id === supplyUsed.supplyId);
                    if (supplyInfo) {
                        const sinLoteKey = `supply-${supplyInfo.name}-SIN LOTE`;
                        let stockItemToUpdate = stockMap.get(sinLoteKey);
                        if (!stockItemToUpdate) {
                            for (const item of stockMap.values()) {
                                if (item.type === 'Consumible' && item.name === supplyInfo.name) {
                                    stockItemToUpdate = item;
                                    break;
                                }
                            }
                        }
                        if (stockItemToUpdate) {
                            stockItemToUpdate.inPacks += supplyUsed.quantity || 0;
                        }
                    }
                });
            }
        });

        mermas.forEach(merma => {
            if (!merma || !merma.itemName) return;
            let key: string | null = null;
            if (merma.itemType === 'product' && merma.lot) {
                key = `product-${merma.itemName}-${merma.lot}`;
            } else if (merma.itemType === 'supply') {
                key = `supply-${merma.itemName}-${merma.lot || 'SIN LOTE'}`;
            }
            if (key && stockMap.has(key)) {
                 stockMap.get(key)!.inMerma += merma.quantity || 0;
            }
        });

        const result = Array.from(stockMap.values());
        result.forEach(item => {
            const total = Number(item.total || 0);
            const inPacks = Number(item.inPacks || 0);
            const inMerma = Number(item.inMerma || 0);
            item.available = total - inPacks - inMerma;
        });
        return result.sort((a, b) => a.name.localeCompare(b.name) || (a.lot || '').localeCompare(b.lot || ''));
    }, [albaranes, supplies, packs, mermas]);

    const addAlbaran = async (albaran: Albaran) => {
        const { pallets, ...albaranData } = albaran;
        const dbAlbaran = { id: albaranData.id, entry_date: albaranData.entryDate, truck_plate: albaranData.truckPlate, origin: albaranData.origin, carrier: albaranData.carrier, driver: albaranData.driver, status: albaranData.status, incident_details: albaranData.incidentDetails, incident_images: albaranData.incidentImages };
        const { error: albaranError } = await supabase!.from('albaranes').insert(dbAlbaran);
        if (albaranError) throw albaranError;
        if (pallets && pallets.length > 0) {
            const dbPallets = pallets.map(p => ({ id: p.id, albaran_id: albaranData.id, palletnumber: p.palletNumber, product_name: p.type === 'product' ? p.product?.name : p.supplyName, product_lot: p.type === 'product' ? p.product?.lot : p.supplyLot, boxesperpallet: p.boxesPerPallet, bottlesperbox: p.bottlesPerBox, totalbottles: p.type === 'consumable' ? p.supplyQuantity : p.totalBottles, eanbottle: p.eanBottle, eanbox: p.eanBox, sscc: p.sscc, labelimage: p.labelImage, incident_description: p.incident?.description, incident_images: p.incident?.images }));
            const { error: palletsError } = await supabase!.from('pallets').insert(dbPallets);
            if (palletsError) throw palletsError;
        }
        await addAuditLog(`Registró la entrada "${albaran.id}"`);
    };
    
    const updateAlbaran = async (albaran: Albaran) => {
        const { pallets, ...albaranData } = albaran;
        const dbAlbaranUpdate = { entry_date: albaranData.entryDate, truck_plate: albaranData.truckPlate, origin: albaranData.origin, carrier: albaranData.carrier, driver: albaranData.driver, status: albaranData.status, incident_details: albaranData.incidentDetails, incident_images: albaranData.incidentImages };
        const { error: updateError } = await supabase!.from('albaranes').update(dbAlbaranUpdate).eq('id', albaranData.id);
        if (updateError) throw updateError;
        const { error: deleteError } = await supabase!.from('pallets').delete().eq('albaran_id', albaranData.id);
        if (deleteError) throw deleteError;
        if (pallets && pallets.length > 0) {
            const dbPallets = pallets.map(p => ({ id: p.id, albaran_id: albaranData.id, palletnumber: p.palletNumber, product_name: p.type === 'product' ? p.product?.name : p.supplyName, product_lot: p.type === 'product' ? p.product?.lot : p.supplyLot, boxesperpallet: p.boxesPerPallet, bottlesperbox: p.bottlesPerBox, totalbottles: p.type === 'consumable' ? p.supplyQuantity : p.totalBottles, eanbottle: p.eanBottle, eanbox: p.eanBox, sscc: p.sscc, labelimage: p.labelImage, incident_description: p.incident?.description, incident_images: p.incident?.images }));
            const { error: insertError } = await supabase!.from('pallets').insert(dbPallets);
            if (insertError) throw insertError;
        }
        await addAuditLog(`Actualizó la entrada "${albaran.id}"`);
    };

    const deleteAlbaran = async (albaran: Albaran) => {
        const { error } = await supabase!.from('albaranes').delete().eq('id', albaran.id);
        if (error) throw error;
        await addAuditLog(`Eliminó la entrada "${albaran.id}"`);
    };
    
    const addNewSupply = async (supplyData: Omit<Supply, 'id' | 'created_at' | 'quantity'>, initialData?: { quantity: number; lot: string }): Promise<string> => {
        const dbData = { name: supplyData.name, type: supplyData.type, unit: supplyData.unit, min_stock: supplyData.minStock, quantity: 0 };
        const { data, error } = await supabase!.from('supplies').insert(dbData).select().single();
        if (error) throw error;
        await addAuditLog(`Creó el consumible "${supplyData.name}"`);
        if (initialData?.quantity && initialData.quantity > 0) {
            await addSupplyStock(data.id, initialData.quantity, initialData.lot);
        }
        await fetchData();
        return data.id;
    };

    const addSupplyStock = async (supplyId: string, quantity: number, lot: string) => {
        const supply = supplies.find(s => s.id === supplyId);
        if (!supply) throw new Error('Consumible no encontrado');
        if (lot) {
            const newAlbaran: Albaran = { id: `CONS-${supply.name.substring(0,4).toUpperCase()}-${Date.now()}`, entryDate: new Date().toISOString(), truckPlate: 'INTERNO', carrier: 'Stock Interno', status: 'verified', pallets: [{ id: `pal-${Date.now()}`, palletNumber: `pal-${Date.now()}`, type: 'consumable', supplyName: supply.name, supplyLot: lot, supplyQuantity: quantity }] };
            await addAlbaran(newAlbaran);
        } else {
             const { error } = await supabase!.from('supplies').update({ quantity: (supply.quantity || 0) + quantity }).eq('id', supplyId);
            if (error) throw error;
        }
        await addAuditLog(`Añadió ${quantity} de stock al consumible "${supply.name}"`);
    };
    const updateSupply = async (supply: Supply) => {
        const { id, name, type, unit, quantity, minStock } = supply;
        const { error } = await supabase!.from('supplies').update({ name, type, unit, quantity, min_stock: minStock }).eq('id', id);
        if (error) throw error;
        await addAuditLog(`Actualizó el consumible "${supply.name}"`);
    };
    const deleteSupply = async (supplyId: string, supplyName: string) => {
        const { error } = await supabase!.from('supplies').delete().eq('id', supplyId);
        if (error) throw error;
        await addAuditLog(`Eliminó el consumible "${supplyName}"`);
    };
     const updateSupplyLot = async (supplyName: string, originalLot: string, newLot: string) => {
        const albaranesToUpdate = albaranes.filter(a => a.pallets?.some(p => p.type === 'consumable' && p.supplyName === supplyName && p.supplyLot === originalLot));
        for (const albaran of albaranesToUpdate) {
            const newPallets: Pallet[] = albaran.pallets.map(p => (p.type === 'consumable' && p.supplyName === supplyName && p.supplyLot === originalLot) ? { ...p, supplyLot: newLot } : p);
            await updateAlbaran({ ...albaran, pallets: newPallets });
        }
        await addAuditLog(`Renombró el lote "${originalLot}" a "${newLot}" para el consumible "${supplyName}"`);
    };
    
    const addPackModel = async (model: Omit<PackModel, 'id'|'created_at'>) => {
        const { name, description, productRequirements, supplyRequirements } = model;
        const dbModel = { name, description, product_requirements: productRequirements, supply_requirements: supplyRequirements };
        const { error } = await supabase!.from('pack_models').insert(dbModel);
        if (error) throw error;
        await addAuditLog(`Creó el modelo de pack "${model.name}"`);
    };

    const addPack = async (pack: WinePack) => {
        const { id, modelId, modelName, orderId, creationDate, contents, suppliesUsed, additionalComponents, packImage, status } = pack;
        const dbPack = { id, model_id: modelId, model_name: modelName, order_id: orderId, creation_date: creationDate, contents, supplies_used: suppliesUsed, additional_components: additionalComponents, pack_image: packImage, status };
        const { error } = await supabase!.from('wine_packs').insert(dbPack);
        if (error) throw error;
        await addAuditLog(`Ensambló el pack "${pack.id}" para la orden "${pack.orderId}"`);
    };
    const handleDispatch = async (dispatchData: Omit<DispatchNote, 'id' | 'created_at' | 'status'>) => {
        const id = `SAL-${Date.now()}`;
        const note: DispatchNote = { ...dispatchData, id, status: 'Despachado' };
        const { dispatchDate, customer, destination, carrier, truckPlate, driver, packIds, status } = note;
        const dbNote = { id, dispatch_date: dispatchDate, customer, destination, carrier, truck_plate: truckPlate, driver, pack_ids: packIds, status };
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

    const addProductionReport = async (report: Omit<ProductionReport, 'created_at'>) => {
        const { id, packId, reportDate, producedQuantity, consumptions, notes } = report;
        const dbReport = { id, pack_id: packId, report_date: reportDate, produced_quantity: producedQuantity, consumptions, notes };
        
        // 1. Save Report
        const { error } = await supabase!.from('production_reports').insert(dbReport);
        if (error) throw error;

        // 2. Process Mermas automatically
        for (const item of consumptions) {
            if (item.quantityWaste > 0) {
                await addMerma({
                    itemName: item.name,
                    itemType: item.type,
                    lot: item.lot,
                    quantity: item.quantityWaste,
                    reason: `Parte de Montaje: ${id}`
                });
            }
        }

        await addAuditLog(`Creó parte de montaje para pack "${packId}"`);
        await fetchData();
    };

    const deleteProductionReport = async (id: string, packId: string) => {
        const { error } = await supabase!.from('production_reports').delete().eq('id', id);
        if (error) throw error;
        await addAuditLog(`Eliminó parte de montaje "${id}"`);
        await fetchData();
    }

    const addIncident = async (incidentData: Omit<Incident, 'id'|'date'|'resolved'|'created_at'>) => {
        const { relatedId, ...rest } = incidentData;
        const newIncident = { ...rest, related_id: relatedId, id: `INC-${Date.now()}`, date: new Date().toISOString(), resolved: false };
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
        const tempSupabase = createClient(window.SUPABASE_CONFIG!.URL, window.SUPABASE_CONFIG!.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
        const { data: authData, error: authError } = await tempSupabase.auth.signUp({ email: userData.email, password: userData.password, options: { data: { full_name: userData.name, role_id: userData.roleId } } });
        if (authError) throw authError;
        if (!authData.user) throw new Error("No se pudo crear el usuario en Supabase Auth.");
        const { error: confirmError } = await supabase!.rpc('confirm_user_by_admin', { target_user_id: authData.user.id });
        if (confirmError) console.error("Error al confirmar usuario automáticamente (RPC):", confirmError);
        const { error: profileError } = await supabase!.from('users').insert({ id: authData.user.id, full_name: userData.name, email: userData.email, role_id: userData.roleId });
        if (profileError) { console.error("Error creando perfil público:", profileError); throw new Error("Usuario creado, pero falló el perfil público: " + profileError.message); }
        await addAuditLog(`Creó el usuario "${userData.name}" (${userData.email})`);
        await fetchData();
    };

    const updateUser = async (user: User) => {
        const { error } = await supabase!.from('users').update({ full_name: user.name, role_id: user.roleId }).eq('id', user.id);
        if (error) throw error;
        await addAuditLog(`Actualizó los datos del usuario "${user.name}"`);
        await fetchData();
    };

    const deleteUser = async (userId: string, userName: string) => {
        const { error } = await supabase!.rpc('delete_user_by_admin', { target_user_id: userId });
        if (error) throw error;
        await addAuditLog(`Eliminó al usuario "${userName}"`);
        await fetchData();
    };

    const updateCurrentUserPassword = async (newPassword: string) => {
        const { error } = await supabase!.auth.updateUser({ password: newPassword });
        if (error) throw error;
        await addAuditLog("Actualizó su propia contraseña");
    };

    const updateUserPasswordByAdmin = async (userId: string, newPassword: string) => {
        const { error } = await supabase!.rpc('update_password_by_admin', { target_user_id: userId, new_password: newPassword });
        if (error) throw error;
        await addAuditLog(`Actualizó la contraseña del usuario ${userId} (Admin Reset)`);
    };
    
    const addRole = async (roleData: Omit<Role, 'id' | 'created_at'>) => {
        const { error } = await supabase!.from('roles').insert(roleData);
        if (error) throw error;
        await addAuditLog(`Creó el rol "${roleData.name}"`);
        await fetchData();
    };
    const updateRole = async (role: Role) => {
        const { error } = await supabase!.from('roles').update({ name: role.name, permissions: role.permissions }).eq('id', role.id);
        if (error) throw error;
        await addAuditLog(`Actualizó el rol "${role.name}"`);
        await fetchData();
    };
    const deleteRole = async (roleId: string, roleName: string) => {
        const { error } = await supabase!.from('roles').delete().eq('id', roleId);
        if (error) throw error;
        await addAuditLog(`Eliminó el rol "${roleName}"`);
        await fetchData();
    };

    const value = {
        currentUser, users, roles, albaranes, supplies, products, packModels, packs, salidas, incidents, mermas, productionReports, auditLogs, inventoryStock, loading, error,
        addAlbaran, updateAlbaran, deleteAlbaran,
        addNewSupply, addSupplyStock, updateSupply, deleteSupply, updateSupplyLot,
        addPackModel,
        addPack, handleDispatch, addMerma, addProductionReport, deleteProductionReport,
        addIncident, resolveIncident,
        addUser, updateUser, deleteUser, updateCurrentUserPassword, updateUserPasswordByAdmin,
        addRole, updateRole, deleteRole
    };
    
    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
