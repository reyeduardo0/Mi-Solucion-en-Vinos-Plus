import React, { useState } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/Dashboard';
import GoodsReceipt from './components/GoodsReceipt';
import GoodsReceiptList from './components/GoodsReceiptList';
import Stock from './components/Stock';
import CreatePack from './components/CreatePack';
import PackModels from './components/PackModels'; 
import Dispatch from './components/Dispatch'; 
import GenerateLabels from './components/GenerateLabels'; 
import Incidents from './components/Incidents';
import Reports from './components/Reports';
import Users from './components/Users';
import Audit from './components/Audit';
import Traceability from './components/Traceability'; // New Component
import { Albaran, Incident, WinePack, User, Supply, PackModel, DispatchNote, IncidentType, Role, AuditLog } from './types';
import Card from './components/ui/Card';
import { WifiIcon, LogoutIcon } from './constants';

const mockAlbaranes: Albaran[] = [
    { id: 'alb-001', entryDate: '2023-10-26T10:00:00Z', truckPlate: '1234ABC', origin: 'Bodega Central', destination: 'Almacén Principal', carrier: 'Transportes Rápidos', driver: 'Juan Pérez', status: 'verified', pallets: [
        { id: 'p-001', palletNumber: 'PN-101', product: { name: 'Vino Tinto Reserva', lot: 'LOTE-A1' }, boxesPerPallet: 95, bottlesPerBox: 6, totalBottles: 570, incident: { description: 'Etiqueta rota', images: [] } },
        { id: 'p-002', palletNumber: 'PN-102', product: { name: 'Vino Tinto Reserva', lot: 'LOTE-A1' }, boxesPerPallet: 95, bottlesPerBox: 6, totalBottles: 570 },
    ] },
    { id: 'alb-002', entryDate: '2023-10-27T11:00:00Z', truckPlate: '5678DEF', origin: 'Bodega Norte', destination: 'Almacén Principal', carrier: 'Logística Segura', driver: 'Ana Gómez', status: 'verified', pallets: [
        { id: 'p-003', palletNumber: 'PN-103', product: { name: 'Vino Blanco', lot: 'LOTE-B2' }, boxesPerPallet: 95, bottlesPerBox: 6, totalBottles: 570 },
    ] },
     { id: 'alb-003', entryDate: '2023-10-28T09:00:00Z', truckPlate: '9012GHI', origin: 'Bodega Central', destination: 'Almacén Principal', carrier: 'Transportes Rápidos', driver: 'Luis Martín', status: 'incident', incidentDetails: "Faltan documentos de transporte", pallets: [
        { id: 'p-004', palletNumber: 'PN-104', product: { name: 'Vino Rosado', lot: 'LOTE-C3' }, boxesPerPallet: 85, bottlesPerBox: 6, totalBottles: 510 },
    ] }
];
const mockIncidents: Incident[] = [
    { id: 'inc-001', type: IncidentType.Receiving, description: 'Caja dañada en pallet PN-101. El cartón presenta humedad y una esquina está aplastada, afectando a 2 botellas.', images: [], date: '2023-10-26T10:05:00Z', resolved: false, relatedId: 'alb-001' },
    { id: 'inc-002', type: IncidentType.Packing, description: 'Falta de insumos: no quedan etiquetas para el Pack Mixto.', images: [], date: '2023-10-27T15:30:00Z', resolved: true, relatedId: 'pack-001' },
    { id: 'inc-003', type: IncidentType.Receiving, description: 'El precinto del camión no coincide con el del albarán.', images: [], date: '2023-10-27T11:02:00Z', resolved: false, relatedId: 'alb-002' },
];
const mockPacks: WinePack[] = [
    { id: 'pack-001', modelId: 'pm-001', modelName: 'Pack 2 Tintos', orderId: 'PED-C-088', creationDate: '2023-10-27T15:00:00Z', status: 'Despachado', contents: [{ productName: 'Vino Tinto Reserva', lot: 'LOTE-A1', quantity: 2 }], additionalComponents: 'Caja especial de Navidad' }
];
const mockSalidas: DispatchNote[] = [{ id: 'sal-001', dispatchDate: '2023-10-28T10:00:00Z', customer: 'Cliente Principal', destination: 'Madrid', carrier: 'Distribución Express', truckPlate: 'XYZ789', driver: 'Carlos Ruiz', packIds: ['pack-001'], status: 'Despachado' }];
const mockSupplies: Supply[] = [
    { id: 'sup-001', name: 'Caja Cartón Modelo A', type: 'Contable', unit: 'unidades', quantity: 500, minStock: 50 },
    { id: 'sup-002', name: 'Etiqueta Adhesiva Pack', type: 'Contable', unit: 'unidades', quantity: 2000, minStock: 200 },
    { id: 'sup-003', name: 'Film extensible', type: 'No Contable', unit: 'rollos', quantity: 10 },
    { id: 'sup-004', name: 'Pallet Plástico', type: 'Contable', unit: 'unidades', quantity: 40, minStock: 10 },
];
const mockPackModels: PackModel[] = [
    { id: 'pm-001', name: 'Pack 2 Tintos', description: 'Caja con 2 botellas de Vino Tinto Reserva.',
        productRequirements: [{ productName: 'Vino Tinto Reserva', quantity: 2 }],
        supplyRequirements: [
            { supplyId: 'sup-001', name: 'Caja Cartón Modelo A', quantity: 1 },
            { supplyId: 'sup-002', name: 'Etiqueta Adhesiva Pack', quantity: 1 }
        ]
    },
    { id: 'pm-002', name: 'Pack Mixto', description: 'Caja con 1 Tinto y 1 Blanco.',
        productRequirements: [
            { productName: 'Vino Tinto Reserva', quantity: 1 },
            { productName: 'Vino Blanco', quantity: 1 }
        ],
        supplyRequirements: [
            { supplyId: 'sup-001', name: 'Caja Cartón Modelo A', quantity: 1 },
            { supplyId: 'sup-002', name: 'Etiqueta Adhesiva Pack', quantity: 2 }
        ]
    }
];
const mockRoles: Role[] = [
    { id: 'role-admin', name: 'Super Administrador', permissions: ['users:manage', 'entries:create', 'entries:view', 'entries:edit', 'entries:delete', 'stock:view', 'packs:create', 'packs:manage_models', 'labels:generate', 'dispatch:create', 'incidents:manage', 'reports:view']},
    { id: 'role-operator', name: 'Operario de Bodega', permissions: ['entries:create', 'entries:view', 'stock:view', 'packs:create', 'labels:generate', 'incidents:manage']},
    { id: 'role-viewer', name: 'Logística', permissions: ['stock:view', 'dispatch:create', 'reports:view']},
];

const mockUsers: User[] = [
    { id: 'user-admin-01', name: 'Admin User', email: 'admin@misolucionvinos.com', roleId: 'role-admin' },
    { id: 'user-staff-01', name: 'Eduardo Rey', email: 'eduardo.rey@misolucionvinos.com', roleId: 'role-operator' },
    { id: 'user-staff-02', name: 'Jane Doe', email: 'jane.doe@misolucionvinos.com', roleId: 'role-viewer' },
];

const mockAuditLogs: AuditLog[] = [
  { id: 'log-1', timestamp: '2023-11-01T10:05:00Z', userId: 'user-admin-01', userName: 'Admin User', action: "Inició sesión en el sistema." },
  { id: 'log-2', timestamp: '2023-11-01T10:15:22Z', userId: 'user-staff-01', userName: 'Eduardo Rey', action: "Registró la nueva entrada de albarán 'alb-003'." },
  { id: 'log-3', timestamp: '2023-11-01T11:30:00Z', userId: 'user-admin-01', userName: 'Admin User', action: "Actualizó los permisos del rol 'Logística'." },
  { id: 'log-4', timestamp: '2023-11-01T14:02:15Z', userId: 'user-staff-02', userName: 'Jane Doe', action: "Creó la nota de salida 'sal-001'." },
  { id: 'log-5', timestamp: '2023-11-02T09:00:45Z', userId: 'user-admin-01', userName: 'Admin User', action: "Eliminó el usuario 'temp.user@misolucionvinos.com'." },
  { id: 'log-6', timestamp: '2023-11-02T09:10:00Z', userId: 'user-staff-01', userName: 'Eduardo Rey', action: "Resolvió la incidencia 'inc-002'." },
];


const AppContent: React.FC = () => {
    const navigate = useNavigate();
    const [albaranes, setAlbaranes] = useState<Albaran[]>(mockAlbaranes);
    const [incidents, setIncidents] = useState<Incident[]>(mockIncidents);
    const [packs, setPacks] = useState<WinePack[]>(mockPacks);
    const [salidas, setSalidas] = useState<DispatchNote[]>(mockSalidas);
    const [supplies, setSupplies] = useState<Supply[]>(mockSupplies);
    const [packModels, setPackModels] = useState<PackModel[]>(mockPackModels);
    const [users, setUsers] = useState<User[]>(mockUsers);
    const [roles, setRoles] = useState<Role[]>(mockRoles);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>(mockAuditLogs);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [currentUser] = useState<User>(mockUsers[0]);

    const handleAddAlbaran = (newAlbaran: Albaran) => {
        setAlbaranes(prev => [...prev, newAlbaran]);
        // In a real app, you would also create an audit log here
        // e.g., addAuditLog({ userId: currentUser.id, userName: currentUser.name, action: `Registró la nueva entrada ${newAlbaran.id}`})
        navigate('/entradas');
    };

    const handleAddPack = (newPack: WinePack) => {
        setPacks(prev => [...prev, newPack]);
        navigate('/inventory'); // Navigate to stock to see the result
    };
    
    const handleAddSupplyStock = (supplyId: string, quantityToAdd: number) => {
        setSupplies(currentSupplies => 
            currentSupplies.map(s => 
                s.id === supplyId ? { ...s, quantity: s.quantity + quantityToAdd } : s
            )
        );
    };

    const handleAddNewSupply = (newSupplyData: Omit<Supply, 'id' | 'quantity'>) => {
        const newSupply: Supply = {
            id: `sup-${Date.now()}`,
            quantity: 0,
            ...newSupplyData,
        };
        setSupplies(prev => [...prev, newSupply]);
    };
    
    const handleAddPackModel = (newModel: Omit<PackModel, 'id'>) => {
        const model: PackModel = { ...newModel, id: `pm-${Date.now()}` };
        setPackModels(prev => [...prev, model]);
    };
    
    const handleDispatch = (dispatchNote: Omit<DispatchNote, 'id' | 'status'>) => {
        const newDispatch: DispatchNote = {
            ...dispatchNote,
            id: `sal-${Date.now()}`,
            status: 'Despachado'
        };

        const packsToDispatch = packs.filter(p => newDispatch.packIds.includes(p.id));

        // 1. Deduct Supplies
        const supplyDeductions = new Map<string, number>();
        packsToDispatch.forEach(pack => {
            const model = packModels.find(m => m.id === pack.modelId);
            if (model) {
                model.supplyRequirements.forEach(req => {
                    supplyDeductions.set(req.supplyId, (supplyDeductions.get(req.supplyId) || 0) + req.quantity);
                });
            }
        });

        setSupplies(current => {
            const updated = [...current];
            supplyDeductions.forEach((quantity, supplyId) => {
                const index = updated.findIndex(s => s.id === supplyId);
                if (index > -1) {
                    updated[index].quantity -= quantity;
                }
            });
            return updated;
        });

        // 2. Deduct Products (for simplicity, we'll remove pallets if they are fully used, a more complex logic would reduce quantity)
        // This part needs a more robust inventory model in a real app. For now, we'll just mark packs as dispatched.
        
        // 3. Update pack status
        setPacks(current => current.map(p => newDispatch.packIds.includes(p.id) ? { ...p, status: 'Despachado' } : p));
        
        // 4. Add dispatch note
        setSalidas(prev => [...prev, newDispatch]);
        
        alert(`Salida ${newDispatch.id} confirmada. El stock ha sido actualizado.`);
        navigate('/'); // Go to dashboard
    };

    const handleAddIncident = (newIncidentData: Omit<Incident, 'id' | 'date' | 'resolved'>) => {
        const newIncident: Incident = {
            id: `inc-${Date.now()}`,
            date: new Date().toISOString(),
            resolved: false,
            ...newIncidentData
        };
        setIncidents(prev => [newIncident, ...prev]);
    };

    const handleResolveIncident = (incidentId: string) => {
        setIncidents(current => 
            current.map(inc => 
                inc.id === incidentId ? { ...inc, resolved: true } : inc
            )
        );
    };
    
    const handleAddUser = (newUserData: Omit<User, 'id'>) => {
        const newUser: User = {
            id: `user-${Date.now()}`,
            ...newUserData
        };
        setUsers(prev => [...prev, newUser]);
    };

    const handleUpdateUser = (updatedUser: User) => {
        setUsers(prev => prev.map(user => user.id === updatedUser.id ? updatedUser : user));
    };
    
    const handleDeleteUser = (userId: string) => {
        setUsers(prev => prev.filter(user => user.id !== userId));
    };
    
    const handleAddRole = (newRoleData: Omit<Role, 'id'>) => {
        const newRole: Role = {
            id: `role-${Date.now()}`,
            ...newRoleData
        };
        setRoles(prev => [...prev, newRole]);
    };

    const handleUpdateRole = (updatedRole: Role) => {
        setRoles(prev => prev.map(role => role.id === updatedRole.id ? updatedRole : role));
    };

    const handleDeleteRole = (roleId: string) => {
        setRoles(prev => prev.filter(role => role.id !== roleId));
    };


    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
    
    const currentUserRole = roles.find(r => r.id === currentUser.roleId);

    return (
        <div className="relative min-h-screen md:flex">
            <Sidebar isSidebarOpen={isSidebarOpen} />
            <div className="flex-1 flex flex-col">
                <Header toggleSidebar={toggleSidebar} />
                <div className="hidden md:flex bg-white shadow-sm p-4 justify-between items-center">
                    <div className="flex items-center space-x-2 text-green-600">
                        <WifiIcon />
                        <span className="text-sm font-medium">Conectado</span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-gray-800">{currentUser.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{currentUserRole?.name || 'Usuario'}</p>
                        </div>
                        <button className="text-gray-500 hover:text-gray-800">
                            <LogoutIcon />
                        </button>
                    </div>
                </div>
                <main className="flex-1 overflow-y-auto">
                    <Routes>
                        <Route path="/" element={<Dashboard albaranes={albaranes} incidents={incidents} packs={packs} salidas={salidas} navigateTo={navigate} />} />
                        <Route path="/entradas" element={<GoodsReceiptList albaranes={albaranes} navigateTo={navigate} currentUser={currentUser} />} />
                        <Route path="/entradas/nueva" element={<GoodsReceipt onAddAlbaran={handleAddAlbaran} />} />
                        <Route path="/inventory" element={<Stock albaranes={albaranes} supplies={supplies} packs={packs} onAddNewSupply={handleAddNewSupply} onAddSupplyStock={handleAddSupplyStock} />} />
                        <Route path="/pack-models" element={<PackModels models={packModels} supplies={supplies} onAddModel={handleAddPackModel}/>} />
                        <Route path="/packing" element={<CreatePack albaranes={albaranes} packModels={packModels} onAddPack={handleAddPack} />} />
                        <Route path="/labels" element={<GenerateLabels />} />
                        <Route path="/salidas" element={<Dispatch packs={packs} onDispatch={handleDispatch} />} />
                        <Route path="/trazabilidad" element={<Traceability packs={packs} albaranes={albaranes} salidas={salidas} />} />
                        <Route path="/incidents" element={<Incidents incidents={incidents} onAddIncident={handleAddIncident} onResolveIncident={handleResolveIncident} />} />
                        <Route path="/reportes" element={<Reports albaranes={albaranes} incidents={incidents} packs={packs} salidas={salidas} supplies={supplies} />} />
                        <Route path="/usuarios" element={<Users users={users} roles={roles} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} onAddRole={handleAddRole} onUpdateRole={handleUpdateRole} onDeleteRole={handleDeleteRole} />} />
                        <Route path="/auditoria" element={<Audit logs={auditLogs} users={users} />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  return (
    <HashRouter>
        <AppContent />
    </HashRouter>
  );
};

export default App;