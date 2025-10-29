

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
  | 'reports:view'
  | 'traceability:view'
  | 'audit:view';


export interface Role {
  id: string;
  name: string;
  // FIX: Allow '*' for super admin roles to fix type error on includes check.
  permissions: (Permission | '*')[];
  created_at?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
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
  created_at?: string;
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
  type: 'product' | 'consumable';
  
  // Product-specific fields
  product?: {
    name: string;
    lot: string;
  };
  boxesPerPallet?: number;
  bottlesPerBox?: number;
  totalBottles?: number;
  eanBottle?: string;
  eanBox?: string;

  // Consumable-specific fields
  supplyId?: string;
  supplyName?: string; // Denormalized for display and code
  supplyQuantity?: number;
  supplyLot?: string;

  // Common fields
  sscc?: string;
  labelImage?: string; // base64 image string
  incident?: {
    description: string;
    images: string[]; // array of base64
  }
  created_at?: string;
}


export interface Albaran {
  id: string; // User-provided delivery note number
  entryDate: string;
  truckPlate: string;
  origin?: string;
  carrier: string;
  driver?: string;
  pallets: Pallet[];
  status: 'pending' | 'verified' | 'incident';
  incidentDetails?: string;
  incidentImages?: string[]; // Array of base64 image strings
  created_at?: string;
}

export interface Informacion {
  id: string;
  descripcion: string;
  origen: string;
  albaran: string;
  estado: string;
  incidenciaEtiquetas?: boolean;
  incidenciaImagenes?: string[];
  created_at?: string;
}

export interface Supply {
  id: string;
  name: string;
  type: 'Contable' | 'No Contable';
  unit: 'unidades' | 'cajas' | 'rollos' | 'metros';
  quantity: number;
  minStock?: number;
  created_at?: string;
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
    created_at?: string;
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
    created_at?: string;
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
    created_at?: string;
}

export interface Merma {
  id: string;
  itemName: string;
  itemType: 'product' | 'supply';
  lot?: string;
  quantity: number;
  reason?: string;
  created_at: string;
}

export interface InventoryStockItem {
  name: string;
  type: 'Producto' | 'Consumible';
  lot?: string;
  unit: string;
  total: number;
  inPacks: number;
  inMerma: number;
  available: number;
  minStock?: number;
}
