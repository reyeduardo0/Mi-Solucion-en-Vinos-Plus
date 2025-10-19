export type Permission = 
  | 'users:manage'
  | 'entries:create'
  | 'entries:view'
  | 'entries:edit'
  | 'entries:delete'
  | 'stock:view'
  | 'packs:create'
  | 'packs:manage_models'
  | 'labels:generate'
  | 'dispatch:create'
  | 'incidents:manage'
  | 'reports:view';


export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
}

export enum IncidentType {
  Receiving = 'Entrada',
  Packing = 'Elaboración de Pack',
  Dispatch = 'Salida',
}

export interface Incident {
  id: string;
  type: IncidentType;
  description: string;
  images: string[]; // Array of base64 image strings
  date: string;
  resolved: boolean;
  relatedId: string; // ID of the albaran, pack, etc.
}

export interface Product {
  id: string;
  name: string;
  type: 'wine' | 'packaging';
  sku: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  lot: string;
  quantity: number; // e.g., number of bottles, boxes, labels
  unit: 'bottle' | 'box' | 'pallet' | 'unit';
  location: string;
  entryDate: string;
}

export interface Pallet {
  id: string;
  palletNumber: string;
  sscc?: string;
  product: {
    name: string;
    lot: string;
  };
  boxesPerPallet: number;
  bottlesPerBox: number;
  totalBottles: number;
  eanBottle?: string;
  eanBox?: string;
  labelImage?: string; // base64 image string
  incident?: {
    description: string;
    images: string[]; // array of base64
  }
}

export interface Albaran {
  id: string; // User-provided delivery note number
  entryDate: string;
  truckPlate: string;
  origin?: string;
  destination?: string;
  carrier: string;
  driver?: string;
  pallets: Pallet[];
  status: 'pending' | 'verified' | 'incident';
  incidentDetails?: string;
  incidentImages?: string[]; // Array of base64 image strings
}

export interface Supply {
  id: string;
  name: string;
  type: 'Contable' | 'No Contable';
  unit: 'unidades' | 'cajas' | 'rollos' | 'metros';
  quantity: number;
  minStock?: number;
}

export interface PackModel {
    id: string;
    name: string;
    description: string;
    productRequirements: {
        productName: string;
        quantity: number; // e.g., number of bottles
    }[];
    supplyRequirements: {
        supplyId: string;
        name: string;
        quantity: number;
    }[];
}

export interface WinePack {
    id: string; // Unique ID for the pack
    modelId: string; // Link to the PackModel
    modelName: string; // Denormalized for display
    orderId: string; // Customer PO
    creationDate: string;
    // Specific lots assigned to this instance of the pack
    contents: {
        productName: string;
        lot: string;
        quantity: number;
    }[];
    // Supplies are defined by the model, not added ad-hoc
    suppliesUsed?: {
        supplyId: string;
        name: string;
        quantity: number;
    }[];
    additionalComponents?: string; // For non-contable notes
    packImage?: string; // base64
    status: 'Ensamblado' | 'Despachado';
}

export interface DispatchNote {
    id: string;
    dispatchDate: string;
    customer: string;
    destination: string;
    carrier: string;
    truckPlate?: string;
    driver?: string;
    packIds: string[]; // Array of IDs of the WinePacks included
    status: 'Pendiente' | 'Despachado';
}