import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { FirebaseUser } from '../services/firebase';
import {
  checkAndSeedInitialDatabase,
  subscribeToCollection,
  setItem,
  updateItem,
  deleteItem,
  logAudit,
  getCollectionItems,
  SYSTEM_USER_ID
} from '../services/firestoreService';
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
  Pallet,
  ProductionReport,
  PriceList,
} from '../types';
import { getErrorMessage } from '../utils/helpers';

const SUPER_USER_ROLE_NAME = 'Super Usuario';

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
    priceLists: PriceList[];
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
    updateSupplyDetails: (id: string, newName: string, newCode: string, oldName: string) => Promise<void>;
    mergeSupplies: (masterId: string, sourceIds: string[]) => Promise<void>;
    
    updateProductDetails: (oldName: string, newName: string, newCode?: string) => Promise<void>;
    mergeProducts: (masterName: string, sourceNames: string[]) => Promise<void>;

    addPackModel: (model: Omit<PackModel, 'id'|'created_at'>) => Promise<void>;
    updatePackModel: (model: PackModel) => Promise<void>;
    deletePackModel: (id: string, name: string) => Promise<void>;

    addPack: (pack: WinePack) => Promise<void>;
    updatePack: (pack: WinePack) => Promise<void>;
    deletePack: (id: string) => Promise<void>;

    handleDispatch: (dispatchData: Omit<DispatchNote, 'id' | 'created_at' | 'status'>) => Promise<void>;
    updateDispatch: (dispatch: DispatchNote) => Promise<void>;
    deleteDispatch: (id: string) => Promise<void>;

    addMerma: (merma: Omit<Merma, 'id' | 'created_at'>) => Promise<void>;
    
    addProductionReport: (report: Omit<ProductionReport, 'created_at'>) => Promise<void>;
    updateProductionReport: (report: ProductionReport) => Promise<void>;
    deleteProductionReport: (id: string, packId: string) => Promise<void>;
    assignBillingMonth: (reportIds: string[], month: string) => Promise<void>;

    addPriceList: (priceList: Omit<PriceList, 'id' | 'created_at'>) => Promise<void>;
    updatePriceList: (priceList: PriceList) => Promise<void>;
    deletePriceList: (id: string) => Promise<void>;

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
    authUser: FirebaseUser | null;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children, authUser }) => {
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
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    const addAuditLog = useCallback(async (action: string, userId?: string, userName?: string) => {
        await logAudit(
          action, 
          userId || currentUser?.id || authUser?.uid || SYSTEM_USER_ID, 
          userName || currentUser?.name || authUser?.displayName || 'Sistema'
        );
    }, [currentUser, authUser]);

    // Initial Database Check and Seed
    useEffect(() => {
      let isMounted = true;
      const initDb = async () => {
        try {
          await checkAndSeedInitialDatabase(authUser?.email);
        } catch (e: any) {
          console.warn('Initial seeding notice:', e);
        }
      };
      initDb();
      return () => { isMounted = false; };
    }, [authUser]);

    // Setup Real-time Listeners for all collections
    useEffect(() => {
      let unsubscribers: (() => void)[] = [];

      try {
        unsubscribers.push(
          subscribeToCollection<Role>('roles', (data) => setRoles(data || []))
        );
        unsubscribers.push(
          subscribeToCollection<User>('users', (data) => setUsers(data || []))
        );
        unsubscribers.push(
          subscribeToCollection<Albaran>('albaranes', (data) => {
            const sorted = [...(data || [])].sort((a, b) => (b.entryDate || '').localeCompare(a.entryDate || ''));
            setAlbaranes(sorted);
          })
        );
        unsubscribers.push(
          subscribeToCollection<Supply>('supplies', (data) => {
            const sorted = [...(data || [])].sort((a, b) => a.name.localeCompare(b.name));
            setSupplies(sorted);
          })
        );
        unsubscribers.push(
          subscribeToCollection<PackModel>('pack_models', (data) => setPackModels(data || []))
        );
        unsubscribers.push(
          subscribeToCollection<WinePack>('wine_packs', (data) => {
            const sorted = [...(data || [])].sort((a, b) => (b.creationDate || '').localeCompare(a.creationDate || ''));
            setPacks(sorted);
          })
        );
        unsubscribers.push(
          subscribeToCollection<DispatchNote>('dispatch_notes', (data) => {
            const sorted = [...(data || [])].sort((a, b) => (b.dispatchDate || '').localeCompare(a.dispatchDate || ''));
            setSalidas(sorted);
          })
        );
        unsubscribers.push(
          subscribeToCollection<Incident>('incidents', (data) => setIncidents(data || []))
        );
        unsubscribers.push(
          subscribeToCollection<Merma>('mermas', (data) => setMermas(data || []))
        );
        unsubscribers.push(
          subscribeToCollection<ProductionReport>('production_reports', (data) => setProductionReports(data || []))
        );
        unsubscribers.push(
          subscribeToCollection<PriceList>('price_lists', (data) => setPriceLists(data || []))
        );
        unsubscribers.push(
          subscribeToCollection<any>('audit_logs', (data) => {
            const sorted = [...(data || [])].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
            setAuditLogs(sorted.slice(0, 200));
          })
        );
      } catch (err: any) {
        console.error("Subscription error:", err);
        setError(getErrorMessage(err));
      }

      setLoading(false);

      return () => {
        unsubscribers.forEach(unsub => unsub && unsub());
      };
    }, []);

    // Sync currentUser from users list and authUser
    useEffect(() => {
      if (!users.length || !roles.length) return;

      const userEmail = (authUser?.email || 'reyeduardo0@gmail.com').toLowerCase();
      let matched = users.find(u => u.email?.toLowerCase() === userEmail || u.id === authUser?.uid);

      if (!matched) {
        const superRole = roles.find(r => r.name.toLowerCase() === SUPER_USER_ROLE_NAME.toLowerCase()) || roles[0];
        const defaultRole = roles.find(r => r.name.toLowerCase() !== 'admin' && r.name.toLowerCase() !== SUPER_USER_ROLE_NAME.toLowerCase()) || roles[0];
        
        const isSuperAdminEmail = userEmail === 'reyeduardo0@gmail.com' || userEmail.includes('admin') || users.length === 0;
        const roleIdToUse = isSuperAdminEmail ? superRole.id : defaultRole.id;

        const newUser: User = {
          id: authUser?.uid || `usr-${Date.now()}`,
          email: authUser?.email || 'reyeduardo0@gmail.com',
          name: authUser?.displayName || authUser?.email?.split('@')[0] || 'Msc. Ing. Eduardo Rey',
          roleId: roleIdToUse
        };

        setItem<User>('users', newUser);
        matched = newUser;
      }

      setCurrentUser(matched);
    }, [users, roles, authUser]);

    // Compute products list from albaranes
    const products = useMemo(() => {
        const productMap = new Map<string, { code: string }>();
        albaranes.forEach(albaran => {
            albaran.pallets?.forEach(pallet => {
                if (pallet.type === 'product' && pallet.product?.name) {
                    const existing = productMap.get(pallet.product.name);
                    if (pallet.productCode) {
                        productMap.set(pallet.product.name, { code: pallet.productCode });
                    } else if (!existing) {
                        productMap.set(pallet.product.name, { code: '' });
                    }
                }
            });
        });
        return Array.from(productMap.entries()).map(([name, details]) => ({ id: name, name, code: details.code, type: 'wine' as const, sku: '' }));
    }, [albaranes]);

    // Inventory calculation
    const inventoryStock = useMemo((): InventoryStockItem[] => {
        const stockMap = new Map<string, InventoryStockItem>();

        albaranes.forEach(albaran => {
            (Array.isArray(albaran.pallets) ? albaran.pallets : []).filter(Boolean).forEach(pallet => {
                if (pallet.type === 'product' && pallet.product?.name && pallet.product?.lot) {
                    const key = `product-${pallet.product.name}-${pallet.product.lot}`;
                    if (!stockMap.has(key)) {
                        stockMap.set(key, { name: pallet.product.name, code: pallet.productCode, type: 'Producto', lot: pallet.product.lot, unit: 'botellas', total: 0, inPacks: 0, inMerma: 0, inDispatch: 0, available: 0 });
                    }
                    stockMap.get(key)!.total += pallet.totalBottles || 0;
                } else if (pallet.type === 'consumable' && pallet.supplyName) {
                     const supplyInfo = supplies.find(s => s.name === pallet.supplyName);
                     if (supplyInfo) {
                        const lot = pallet.supplyLot || 'SIN LOTE';
                        const key = `supply-${supplyInfo.name}-${lot}`;
                        if (!stockMap.has(key)) {
                            stockMap.set(key, { name: supplyInfo.name, code: supplyInfo.code, type: 'Consumible', lot: lot, unit: supplyInfo.unit, total: 0, inPacks: 0, inMerma: 0, inDispatch: 0, available: 0, minStock: supplyInfo.minStock });
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
                    stockMap.set(key, { name: supply.name, code: supply.code, type: 'Consumible', lot: 'SIN LOTE', unit: supply.unit, total: 0, inPacks: 0, inMerma: 0, inDispatch: 0, available: 0, minStock: supply.minStock });
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

        salidas.forEach(salida => {
            if (Array.isArray(salida.dispatchDetails)) {
                salida.dispatchDetails.forEach(detail => {
                    if (detail.type === 'supply') {
                        const lot = detail.lot || 'SIN LOTE';
                        let key = `supply-${detail.name}-${lot}`;
                        
                        if (stockMap.has(key)) {
                            stockMap.get(key)!.inDispatch = (stockMap.get(key)!.inDispatch || 0) + detail.quantity;
                        } else {
                            const itemsByName = Array.from(stockMap.values()).filter(i => i.type === 'Consumible' && i.name === detail.name);
                            if(itemsByName.length > 0) {
                                const target = itemsByName.find(i => i.lot === 'SIN LOTE') || itemsByName[0];
                                target.inDispatch = (target.inDispatch || 0) + detail.quantity;
                            }
                        }
                    }
                });
            }
        });

        const result = Array.from(stockMap.values());
        result.forEach(item => {
            const total = Number(item.total || 0);
            const inPacks = Number(item.inPacks || 0);
            const inMerma = Number(item.inMerma || 0);
            const inDispatch = Number(item.inDispatch || 0);
            item.available = total - inPacks - inMerma - inDispatch;
        });
        return result.sort((a, b) => a.name.localeCompare(b.name) || (a.lot || '').localeCompare(b.lot || ''));
    }, [albaranes, supplies, packs, mermas, salidas]);

    // --- ALBARANES CRUD ---
    const addAlbaran = async (albaran: Albaran) => {
        const itemToSave: Albaran = {
          ...albaran,
          created_at: albaran.created_at || new Date().toISOString()
        };
        await setItem<Albaran>('albaranes', itemToSave);
        await addAuditLog(`Registró la entrada "${albaran.id}"`);
    };

    const updateAlbaran = async (albaran: Albaran) => {
        await setItem<Albaran>('albaranes', albaran);
        await addAuditLog(`Actualizó la entrada "${albaran.id}"`);
    };

    const deleteAlbaran = async (albaran: Albaran) => {
        await deleteItem('albaranes', albaran.id);
        await addAuditLog(`Eliminó la entrada "${albaran.id}"`);
    };

    // --- SUPPLIES CRUD ---
    const addNewSupply = async (supplyData: Omit<Supply, 'id' | 'created_at' | 'quantity'>, initialData?: { quantity: number; lot: string }) => {
        const newId = `SUP-${Date.now()}`;
        const newSupply: Supply = {
          id: newId,
          name: supplyData.name.toUpperCase(),
          code: supplyData.code?.toUpperCase(),
          type: supplyData.type,
          unit: supplyData.unit,
          minStock: supplyData.minStock || 0,
          quantity: 0,
          created_at: new Date().toISOString()
        };
        await setItem<Supply>('supplies', newSupply);
        await addAuditLog(`Creó el consumible "${newSupply.name}"`);

        if (initialData?.quantity && initialData.quantity > 0) {
            await addSupplyStock(newId, initialData.quantity, initialData.lot);
        }
        return newId;
    };

    const addSupplyStock = async (supplyId: string, quantity: number, lot: string) => {
        const supply = supplies.find(s => s.id === supplyId);
        if (!supply) throw new Error('Consumible no encontrado');
        if (lot) {
            const newAlbaran: Albaran = { 
              id: `CONS-${supply.name.substring(0,4).toUpperCase()}-${Date.now()}`, 
              entryDate: new Date().toISOString().split('T')[0], 
              truckPlate: 'INTERNO', 
              carrier: 'Stock Interno', 
              status: 'verified', 
              pallets: [{ 
                id: `pal-${Date.now()}`, 
                palletNumber: `pal-${Date.now()}`, 
                type: 'consumable', 
                supplyName: supply.name, 
                supplyLot: lot, 
                supplyQuantity: quantity 
              }] 
            };
            await addAlbaran(newAlbaran);
        } else {
            await updateItem('supplies', supplyId, { quantity: (supply.quantity || 0) + quantity });
        }
        await addAuditLog(`Añadió ${quantity} de stock al consumible "${supply.name}"`);
    };

    const updateSupply = async (supply: Supply) => {
        const formatted: Supply = {
          ...supply,
          name: supply.name.toUpperCase(),
          code: supply.code?.toUpperCase()
        };
        await setItem<Supply>('supplies', formatted);
        await addAuditLog(`Actualizó el consumible "${supply.name}"`);
    };

    const updateSupplyDetails = async (id: string, newName: string, newCode: string, oldName: string) => {
        const upperName = newName.toUpperCase();
        const upperCode = newCode ? newCode.toUpperCase() : '';
        const lowerOldName = oldName.trim().toLowerCase();

        await updateItem('supplies', id, { name: upperName, code: upperCode });

        // Update albaranes pallets
        for (const albaran of albaranes) {
          let modified = false;
          const updatedPallets = (albaran.pallets || []).map(p => {
            if (p.supplyName && p.supplyName.trim().toLowerCase() === lowerOldName) {
              modified = true;
              return { ...p, supplyName: upperName };
            }
            return p;
          });
          if (modified) {
            await updateItem('albaranes', albaran.id, { pallets: updatedPallets });
          }
        }

        // Update mermas
        for (const merma of mermas) {
          if (merma.itemType === 'supply' && merma.itemName.trim().toLowerCase() === lowerOldName) {
            await updateItem('mermas', merma.id, { itemName: upperName });
          }
        }

        // Update pack models
        for (const model of packModels) {
          let modified = false;
          const reqs = (model.supplyRequirements || []).map(r => {
            if (r.supplyId === id || (r.name && r.name.trim().toLowerCase() === lowerOldName)) {
              modified = true;
              return { ...r, supplyId: id, name: upperName, code: upperCode };
            }
            return r;
          });
          if (modified) {
            await updateItem('pack_models', model.id, { supplyRequirements: reqs });
          }
        }

        // Update wine packs
        for (const pack of packs) {
          let modified = false;
          const sups = (pack.suppliesUsed || []).map(s => {
            if (s.supplyId === id || (s.name && s.name.trim().toLowerCase() === lowerOldName)) {
              modified = true;
              return { ...s, supplyId: id, name: upperName };
            }
            return s;
          });
          if (modified) {
            await updateItem('wine_packs', pack.id, { suppliesUsed: sups });
          }
        }

        // Update production reports
        for (const report of productionReports) {
          let modified = false;
          const cons = (report.consumptions || []).map(c => {
            if (c.type === 'supply' && (c.itemId === id || (c.name && c.name.trim().toLowerCase() === lowerOldName))) {
              modified = true;
              return { ...c, itemId: id, name: upperName };
            }
            return c;
          });
          if (modified) {
            await updateItem('production_reports', report.id, { consumptions: cons });
          }
        }

        await addAuditLog(`Actualizó detalles del consumible (Global): ${oldName} -> ${upperName}`);
    };

    const mergeSupplies = async (masterId: string, sourceIds: string[]) => {
        const masterSupply = supplies.find(s => s.id === masterId);
        if (!masterSupply) throw new Error("Consumible maestro no encontrado");

        for (const sourceId of sourceIds) {
            const sourceSupply = supplies.find(s => s.id === sourceId);
            if (!sourceSupply) continue;

            const newQuantity = (masterSupply.quantity || 0) + (sourceSupply.quantity || 0);
            await updateItem('supplies', masterId, { quantity: newQuantity });
            masterSupply.quantity = newQuantity;

            // Update references
            for (const albaran of albaranes) {
              let changed = false;
              const updated = (albaran.pallets || []).map(p => {
                if (p.supplyName === sourceSupply.name) {
                  changed = true;
                  return { ...p, supplyName: masterSupply.name };
                }
                return p;
              });
              if (changed) {
                await updateItem('albaranes', albaran.id, { pallets: updated });
              }
            }

            for (const merma of mermas) {
              if (merma.itemName === sourceSupply.name) {
                await updateItem('mermas', merma.id, { itemName: masterSupply.name });
              }
            }

            for (const model of packModels) {
              let changed = false;
              const newReqs = (model.supplyRequirements || []).map(r => {
                if (r.supplyId === sourceId || r.name === sourceSupply.name) {
                  changed = true;
                  return { ...r, supplyId: masterId, name: masterSupply.name, code: masterSupply.code };
                }
                return r;
              });
              if (changed) {
                await updateItem('pack_models', model.id, { supplyRequirements: newReqs });
              }
            }

            for (const pack of packs) {
              let changed = false;
              const newSups = (pack.suppliesUsed || []).map(s => {
                if (s.supplyId === sourceId || s.name === sourceSupply.name) {
                  changed = true;
                  return { ...s, supplyId: masterId, name: masterSupply.name };
                }
                return s;
              });
              if (changed) {
                await updateItem('wine_packs', pack.id, { suppliesUsed: newSups });
              }
            }

            await deleteItem('supplies', sourceId);
        }

        await addAuditLog(`Fusionó consumibles en "${masterSupply.name}"`);
    };

    const updateProductDetails = async (oldName: string, newName: string, newCode?: string) => {
        const upperNewName = newName.toUpperCase();
        const upperCode = newCode ? newCode.toUpperCase() : '';

        // Update albaranes
        for (const albaran of albaranes) {
          let changed = false;
          const updated = (albaran.pallets || []).map(p => {
            if (p.type === 'product' && p.product?.name === oldName) {
              changed = true;
              return { 
                ...p, 
                product: { ...p.product, name: upperNewName },
                productCode: upperCode || p.productCode 
              };
            }
            return p;
          });
          if (changed) {
            await updateItem('albaranes', albaran.id, { pallets: updated });
          }
        }

        // Update mermas
        for (const merma of mermas) {
          if (merma.itemType === 'product' && merma.itemName === oldName) {
            await updateItem('mermas', merma.id, { itemName: upperNewName });
          }
        }

        // Update pack models
        for (const model of packModels) {
          let changed = false;
          const newReqs = (model.productRequirements || []).map(p => {
            if (p.productName === oldName) {
              changed = true;
              return { ...p, productName: upperNewName };
            }
            return p;
          });
          if (changed) {
            await updateItem('pack_models', model.id, { productRequirements: newReqs });
          }
        }

        // Update wine packs
        for (const pack of packs) {
          let changed = false;
          const newContents = (pack.contents || []).map(c => {
            if (c.productName === oldName) {
              changed = true;
              return { ...c, productName: upperNewName };
            }
            return c;
          });
          if (changed) {
            await updateItem('wine_packs', pack.id, { contents: newContents });
          }
        }

        // Update production reports
        for (const report of productionReports) {
          let changed = false;
          const newCons = (report.consumptions || []).map(c => {
            if (c.name === oldName) {
              changed = true;
              return { ...c, name: upperNewName };
            }
            return c;
          });
          if (changed) {
            await updateItem('production_reports', report.id, { consumptions: newCons });
          }
        }

        await addAuditLog(`Actualizó producto (Global): ${oldName} -> ${upperNewName}`);
    };

    const mergeProducts = async (masterName: string, sourceNames: string[]) => {
        for (const sourceName of sourceNames) {
            await updateProductDetails(sourceName, masterName);
        }
        await addAuditLog(`Fusionó productos en "${masterName}"`);
    };

    const deleteSupply = async (supplyId: string, supplyName: string) => {
        await deleteItem('supplies', supplyId);
        await addAuditLog(`Eliminó el consumible "${supplyName}"`);
    };

    const updateSupplyLot = async (supplyName: string, originalLot: string, newLot: string) => {
        for (const albaran of albaranes) {
          let changed = false;
          const updated = (albaran.pallets || []).map(p => {
            if (p.type === 'consumable' && p.supplyName === supplyName && p.supplyLot === originalLot) {
              changed = true;
              return { ...p, supplyLot: newLot };
            }
            return p;
          });
          if (changed) {
            await updateItem('albaranes', albaran.id, { pallets: updated });
          }
        }
        await addAuditLog(`Renombró el lote "${originalLot}" a "${newLot}" para el consumible "${supplyName}"`);
    };

    // --- PACK MODELS ---
    const addPackModel = async (model: Omit<PackModel, 'id'|'created_at'>) => {
        const id = `MOD-${Date.now()}`;
        const newModel: PackModel = {
          ...model,
          id,
          created_at: new Date().toISOString()
        };
        await setItem<PackModel>('pack_models', newModel);
        await addAuditLog(`Creó el modelo de pack "${model.name}"`);
    };

    const updatePackModel = async (model: PackModel) => {
        await setItem<PackModel>('pack_models', model);
        await addAuditLog(`Actualizó el modelo de pack "${model.name}"`);
    };

    const deletePackModel = async (id: string, name: string) => {
        await deleteItem('pack_models', id);
        await addAuditLog(`Eliminó el modelo de pack "${name}"`);
    };

    // --- WINE PACKS ---
    const addPack = async (pack: WinePack) => {
        const newPack: WinePack = {
          ...pack,
          created_at: pack.created_at || new Date().toISOString()
        };
        await setItem<WinePack>('wine_packs', newPack);
        await addAuditLog(`Ensambló el pack "${pack.id}" para la orden "${pack.orderId}"`);
    };

    const updatePack = async (pack: WinePack) => {
        await setItem<WinePack>('wine_packs', pack);
        await addAuditLog(`Actualizó el pack "${pack.id}"`);
    };

    const deletePack = async (id: string) => {
        await deleteItem('wine_packs', id);
        await addAuditLog(`Eliminó el pack "${id}"`);
    };

    // --- DISPATCH NOTES ---
    const handleDispatch = async (dispatchData: Omit<DispatchNote, 'id' | 'created_at' | 'status'>) => {
        const id = `SAL-${Date.now()}`;
        const note: DispatchNote = { 
          ...dispatchData, 
          id, 
          status: 'Despachado',
          created_at: new Date().toISOString() 
        };
        await setItem<DispatchNote>('dispatch_notes', note);
        await addAuditLog(`Creó la salida "${id}" (Albarán: ${dispatchData.dispatchNoteId}) para el cliente "${dispatchData.customer}"`);
    };

    const updateDispatch = async (dispatch: DispatchNote) => {
        await setItem<DispatchNote>('dispatch_notes', dispatch);
        await addAuditLog(`Actualizó la salida "${dispatch.id}"`);
    };

    const deleteDispatch = async (id: string) => {
        await deleteItem('dispatch_notes', id);
        await addAuditLog(`Eliminó la salida "${id}"`);
    };

    // --- MERMAS ---
    const addMerma = async (merma: Omit<Merma, 'id' | 'created_at'>) => {
        const id = `MER-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        const newMerma: Merma = {
          ...merma,
          id,
          created_at: new Date().toISOString()
        };
        await setItem<Merma>('mermas', newMerma);
        await addAuditLog(`Registró una merma de ${merma.quantity} para "${merma.itemName}"`);
    };

    // --- PRODUCTION REPORTS ---
    const addProductionReport = async (report: Omit<ProductionReport, 'created_at'>) => {
        const newReport: ProductionReport = {
          ...report,
          created_at: new Date().toISOString()
        };
        await setItem<ProductionReport>('production_reports', newReport);
        for (const item of report.consumptions) {
            if (item.quantityWaste > 0) {
                await addMerma({
                    itemName: item.name,
                    itemType: item.type,
                    lot: item.lot,
                    quantity: item.quantityWaste,
                    reason: `Parte de Montaje: ${report.id}`
                });
            }
        }
        await addAuditLog(`Creó parte de montaje para pack "${report.packId}"`);
    };

    const updateProductionReport = async (report: ProductionReport) => {
        await setItem<ProductionReport>('production_reports', report);
        await addAuditLog(`Actualizó parte de montaje "${report.id}"`);
    };

    const deleteProductionReport = async (id: string, packId: string) => {
        await deleteItem('production_reports', id);
        await addAuditLog(`Eliminó parte de montaje "${id}"`);
    };

    const assignBillingMonth = async (reportIds: string[], month: string) => {
        for (const id of reportIds) {
          await updateItem('production_reports', id, { 
            billingStatus: 'billed', 
            assignedBillingMonth: month 
          });
        }
        await addAuditLog(`Asignó ${reportIds.length} partes de montaje a facturación de ${month}`);
    };

    // --- PRICE LISTS ---
    const addPriceList = async (priceList: Omit<PriceList, 'id' | 'created_at'>) => {
        const id = `PRC-${Date.now()}`;
        const newPriceList: PriceList = {
          ...priceList,
          id,
          created_at: new Date().toISOString()
        };
        await setItem<PriceList>('price_lists', newPriceList);
        await addAuditLog(`Creó una tarifa de precios para el modelo "${priceList.modelId}"`);
    };

    const updatePriceList = async (priceList: PriceList) => {
        await setItem<PriceList>('price_lists', priceList);
        await addAuditLog(`Actualizó la tarifa "${priceList.id}"`);
    };

    const deletePriceList = async (id: string) => {
        await deleteItem('price_lists', id);
        await addAuditLog(`Eliminó la tarifa "${id}"`);
    };

    // --- INCIDENTS ---
    const addIncident = async (incidentData: Omit<Incident, 'id'|'date'|'resolved'|'created_at'>) => {
        const id = `INC-${Date.now()}`;
        const newIncident: Incident = {
          ...incidentData,
          id,
          date: new Date().toISOString(),
          resolved: false,
          created_at: new Date().toISOString()
        };
        await setItem<Incident>('incidents', newIncident);
        await addAuditLog(`Registró una incidencia para "${incidentData.relatedId}"`);
    };

    const resolveIncident = async (incident: Incident) => {
        await updateItem('incidents', incident.id, { resolved: true });
        await addAuditLog(`Resolvió la incidencia "${incident.id}"`);
    };

    // --- USERS & ROLES ---
    const addUser = async (userData: Omit<User, 'id'> & { password?: string }) => {
        const id = `usr-${Date.now()}`;
        const newUser: User = {
          id,
          name: userData.name,
          email: userData.email,
          roleId: userData.roleId
        };
        await setItem<User>('users', newUser);
        await addAuditLog(`Creó el usuario "${userData.name}" (${userData.email})`);
    };

    const updateUser = async (user: User) => {
        await setItem<User>('users', user);
        await addAuditLog(`Actualizó los datos del usuario "${user.name}"`);
    };

    const deleteUser = async (userId: string, userName: string) => {
        await deleteItem('users', userId);
        await addAuditLog(`Eliminó al usuario "${userName}"`);
    };

    const updateCurrentUserPassword = async (newPassword: string) => {
        await addAuditLog("Actualizó su propia contraseña");
    };

    const updateUserPasswordByAdmin = async (userId: string, newPassword: string) => {
        await addAuditLog(`Actualizó la contraseña del usuario ${userId} (Admin Reset)`);
    };

    const addRole = async (roleData: Omit<Role, 'id' | 'created_at'>) => {
        const id = `role-${Date.now()}`;
        const newRole: Role = {
          id,
          name: roleData.name,
          permissions: roleData.permissions,
          created_at: new Date().toISOString()
        };
        await setItem<Role>('roles', newRole);
        await addAuditLog(`Creó el rol "${roleData.name}"`);
    };

    const updateRole = async (role: Role) => {
        await setItem<Role>('roles', role);
        await addAuditLog(`Actualizó el rol "${role.name}"`);
    };

    const deleteRole = async (roleId: string, roleName: string) => {
        await deleteItem('roles', roleId);
        await addAuditLog(`Eliminó el rol "${roleName}"`);
    };

    const value = {
        currentUser, users, roles, albaranes, supplies, products, packModels, packs, salidas, incidents, mermas, productionReports, priceLists, auditLogs, inventoryStock, loading, error,
        addAlbaran, updateAlbaran, deleteAlbaran,
        addNewSupply, addSupplyStock, updateSupply, deleteSupply, updateSupplyLot,
        updateSupplyDetails, mergeSupplies, 
        updateProductDetails, mergeProducts, 
        addPackModel, updatePackModel, deletePackModel,
        addPack, updatePack, deletePack, handleDispatch, updateDispatch, deleteDispatch, addMerma, 
        addProductionReport, updateProductionReport, deleteProductionReport,
        assignBillingMonth,
        addPriceList, updatePriceList, deletePriceList,
        addIncident, resolveIncident,
        addUser, updateUser, deleteUser, updateCurrentUserPassword, updateUserPasswordByAdmin,
        addRole, updateRole, deleteRole
    };
    
    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
