import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
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
  ProductionReport,
  PriceList
} from '../types';

export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

const DEFAULT_ROLES: Role[] = [
  {
    id: 'super-admin',
    name: 'Super Usuario',
    permissions: ['*'],
    created_at: new Date().toISOString()
  },
  {
    id: 'admin',
    name: 'Administrador',
    permissions: [
      'users:manage',
      'audit:view',
      'inventory:adjust',
      'entries:create',
      'entries:view',
      'entries:edit',
      'entries:delete',
      'stock:view',
      'packs:create',
      'packs:manage_models',
      'production:manage',
      'labels:generate',
      'dispatch:create',
      'incidents:manage',
      'reports:view',
      'traceability:view',
      'billing:manage'
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 'operator',
    name: 'Operario',
    permissions: [
      'entries:create',
      'entries:view',
      'stock:view',
      'packs:create',
      'labels:generate',
      'dispatch:create',
      'incidents:manage',
      'reports:view',
      'traceability:view'
    ],
    created_at: new Date().toISOString()
  }
];

export async function checkAndSeedInitialDatabase(currentUserEmail?: string | null): Promise<void> {
  try {
    const rolesSnap = await getDocs(collection(db, 'roles'));
    if (rolesSnap.empty) {
      console.log('Seeding default roles to Firestore...');
      for (const role of DEFAULT_ROLES) {
        await setDoc(doc(db, 'roles', role.id), role);
      }
    }

    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty) {
      const emailToUse = currentUserEmail || 'reyeduardo0@gmail.com';
      const initialUser: User = {
        id: 'usr-primary-admin',
        name: 'Msc. Ing. Eduardo Rey',
        email: emailToUse,
        roleId: 'super-admin'
      };
      await setDoc(doc(db, 'users', initialUser.id), initialUser);
    }

    const suppliesSnap = await getDocs(collection(db, 'supplies'));
    if (suppliesSnap.empty) {
      const initialSupplies: Supply[] = [
        { id: 'sup-1', name: 'BOTELLA BORGOÑA 75CL', code: 'BOT-BOR-75', type: 'Contable', unit: 'unidades', quantity: 1200, minStock: 200 },
        { id: 'sup-2', name: 'CAJA 6 BOTELLAS SERIGRAFIADA', code: 'CAJ-6-SER', type: 'Contable', unit: 'cajas', quantity: 250, minStock: 50 },
        { id: 'sup-3', name: 'CORCHO NATURAL PREMIUM', code: 'COR-NAT-PRE', type: 'Contable', unit: 'unidades', quantity: 1500, minStock: 300 },
        { id: 'sup-4', name: 'CÁPSULA RETRÁCTIL NEGRA', code: 'CAP-RET-NEG', type: 'Contable', unit: 'unidades', quantity: 1400, minStock: 250 },
        { id: 'sup-5', name: 'CINTA DE EMBALAR IMPRESA', code: 'CIN-EMB-IMP', type: 'No Contable', unit: 'rollos', quantity: 30, minStock: 5 }
      ];
      for (const s of initialSupplies) {
        await setDoc(doc(db, 'supplies', s.id), s);
      }
    }

    const modelsSnap = await getDocs(collection(db, 'pack_models'));
    if (modelsSnap.empty) {
      const initialModel: PackModel = {
        id: 'mod-1',
        name: 'PACK SELECCIÓN RESERVA 6 BOTELLAS',
        description: 'Estuche de 6 botellas de Reserva selección especial',
        productRequirements: [
          { productName: 'VINO TINTO RESERVA 2018', quantity: 6 }
        ],
        supplyRequirements: [
          { supplyId: 'sup-2', name: 'CAJA 6 BOTELLAS SERIGRAFIADA', code: 'CAJ-6-SER', quantity: 1 },
          { supplyId: 'sup-5', name: 'CINTA DE EMBALAR IMPRESA', code: 'CIN-EMB-IMP', quantity: 1 }
        ]
      };
      await setDoc(doc(db, 'pack_models', initialModel.id), initialModel);
    }

    const albaranesSnap = await getDocs(collection(db, 'albaranes'));
    if (albaranesSnap.empty) {
      const initialAlbaran: Albaran = {
        id: 'ALB-2026-001',
        orderId: 'PO-98214',
        entryDate: new Date().toISOString().split('T')[0],
        truckPlate: '4921-HJK',
        carrier: 'Transportes Logística Ibérica',
        driver: 'Manuel Gómez',
        origin: 'Bodegas de Rioja',
        status: 'verified',
        pallets: [
          {
            id: 'pal-001',
            palletNumber: 'PAL-001',
            type: 'product',
            product: { name: 'VINO TINTO RESERVA 2018', lot: 'L-2018-09' },
            productCode: 'VT-RES-18',
            boxesPerPallet: 80,
            bottlesPerBox: 6,
            totalBottles: 480,
            eanBottle: '8437001234567',
            eanBox: '8437001234568',
            sscc: '384370012345678901'
          },
          {
            id: 'pal-002',
            palletNumber: 'PAL-002',
            type: 'product',
            product: { name: 'VINO TINTO CRIANZA 2021', lot: 'L-2021-04' },
            productCode: 'VT-CRI-21',
            boxesPerPallet: 80,
            bottlesPerBox: 6,
            totalBottles: 480,
            eanBottle: '8437009876543',
            eanBox: '8437009876544',
            sscc: '384370012345678902'
          }
        ]
      };
      await setDoc(doc(db, 'albaranes', initialAlbaran.id), initialAlbaran);
    }
  } catch (error) {
    console.warn('Seeding check note:', error);
  }
}

// Subscribe to collection helper
export function subscribeToCollection<T>(
  collectionName: string, 
  onData: (data: T[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, collectionName);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as T);
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
      if (onError) onError(error as Error);
    }
  );
}

// Generic CRUD operations
export async function getCollectionItems<T>(collectionName: string): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, collectionName));
    const list: T[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as T);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, collectionName);
  }
}

export async function setItem<T extends { id: string }>(collectionName: string, item: T): Promise<void> {
  const path = `${collectionName}/${item.id}`;
  try {
    await setDoc(doc(db, collectionName, item.id), item);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateItem(collectionName: string, id: string, updates: Partial<any>): Promise<void> {
  const path = `${collectionName}/${id}`;
  try {
    await updateDoc(doc(db, collectionName, id), updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteItem(collectionName: string, id: string): Promise<void> {
  const path = `${collectionName}/${id}`;
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function logAudit(action: string, userId?: string, username?: string): Promise<void> {
  const logId = `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const path = `audit_logs/${logId}`;
  try {
    await setDoc(doc(db, 'audit_logs', logId), {
      id: logId,
      userid: userId || SYSTEM_USER_ID,
      username: username || 'Sistema',
      action,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
}
