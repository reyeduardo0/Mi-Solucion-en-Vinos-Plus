import React, { useState, useMemo, useEffect } from 'react';
import { User, Role, Permission } from '../types';
import { PERMISSIONS_LIST } from '../constants';
import Card from './ui/Card';
import Button from './ui/Button';

// --- Icons ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-5.197-5.975M15 21H3v-1a6 6 0 0112 0v1z" /></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.917l9 3 9-3A12.02 12.02 0 0021 8.958a11.955 11.955 0 01-5.618-4.016z" /></svg>;


// --- Helper Functions & Child Components ---
const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; maxWidth?: string }> = ({ children, title, onClose, maxWidth = 'max-w-lg' }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" onClick={onClose}>
        <div className={`bg-white rounded-lg shadow-xl w-full ${maxWidth}`} onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-xl font-bold">{title}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        </div>
    </div>
);

const UserModal: React.FC<{ user: User | null; roles: Role[]; onSave: (user: Omit<User, 'id'> | User) => void; onClose: () => void; }> = ({ user, roles, onSave, onClose }) => {
    const [formData, setFormData] = useState({ name: '', email: '', roleId: '', password: '' });

    useEffect(() => {
        if (user) {
            setFormData({ name: user.name, email: user.email, roleId: user.roleId, password: '' });
        } else {
            setFormData({ name: '', email: '', roleId: roles[0]?.id || '', password: '' });
        }
    }, [user, roles]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(user ? { ...user, ...formData } : formData);
        onClose();
    };

    const isEditing = user !== null;
    return (
        <Modal title={isEditing ? `Editando a ${user.name}` : 'Añadir Nuevo Usuario'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium">Nombre Completo</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div><label className="block text-sm font-medium">Correo Electrónico</label><input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div><label className="block text-sm font-medium">Rol</label><select name="roleId" value={formData.roleId} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2">{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium">Contraseña</label><input type="password" name="password" value={formData.password} onChange={handleChange} required={!isEditing} placeholder={isEditing ? 'Dejar en blanco para no cambiar' : ''} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div className="flex justify-end space-x-3 pt-4 border-t"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Guardar Cambios</Button></div>
            </form>
        </Modal>
    );
};

const RoleModal: React.FC<{ role: Role | null; onSave: (role: Omit<Role, 'id'> | Role) => void; onClose: () => void; }> = ({ role, onSave, onClose }) => {
    const [name, setName] = useState(role?.name || '');
    const [permissions, setPermissions] = useState<Set<Permission>>(new Set(role?.permissions || []));
    
    const handlePermissionChange = (permission: Permission, checked: boolean) => {
        const newPermissions = new Set(permissions);
        if (checked) newPermissions.add(permission);
        else newPermissions.delete(permission);
        setPermissions(newPermissions);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const roleData = { name, permissions: Array.from(permissions) };
        onSave(role ? { ...role, ...roleData } : roleData);
        onClose();
    };
    
    const permissionsByCategory = PERMISSIONS_LIST.reduce((acc, p) => {
        if (!acc[p.category]) acc[p.category] = [];
        acc[p.category].push(p);
        return acc;
    }, {} as Record<string, typeof PERMISSIONS_LIST>);

    return (
        <Modal title={role ? `Editando Rol: ${role.name}` : 'Crear Nuevo Rol'} onClose={onClose} maxWidth="max-w-3xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div><label className="block text-sm font-medium">Nombre del Rol</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div>
                    <h4 className="text-sm font-medium mb-3">Permisos</h4>
                    <div className="space-y-4">
                        {Object.entries(permissionsByCategory).map(([category, perms]) => (
                            <fieldset key={category} className="border rounded-md p-4">
                                <legend className="font-semibold text-sm px-2">{category}</legend>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mt-2">
                                    {perms.map(p => (
                                        <label key={p.id} className="flex items-center space-x-2"><input type="checkbox" checked={permissions.has(p.id)} onChange={e => handlePermissionChange(p.id, e.target.checked)} className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500" /><span>{p.label}</span></label>
                                    ))}
                                </div>
                            </fieldset>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Guardar Rol</Button></div>
            </form>
        </Modal>
    );
};


const ConfirmationModal: React.FC<{ title: string, message: string; onConfirm: () => void; onCancel: () => void; }> = ({ title, message, onConfirm, onCancel }) => (
    <Modal title={title} onClose={onCancel} maxWidth="max-w-md">
        <p className="text-gray-600">{message}</p>
        <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
            <Button variant="danger" onClick={onConfirm}>Sí, eliminar</Button>
        </div>
    </Modal>
);

// --- Main Component ---
interface UsersProps {
    users: User[];
    roles: Role[];
    onAddUser: (user: Omit<User, 'id'>) => void;
    onUpdateUser: (user: User) => void;
    onDeleteUser: (userId: string) => void;
    onAddRole: (role: Omit<Role, 'id'>) => void;
    onUpdateRole: (role: Role) => void;
    onDeleteRole: (roleId: string) => void;
}

const Users: React.FC<UsersProps> = (props) => {
    const { users, roles, onAddUser, onUpdateUser, onDeleteUser, onAddRole, onUpdateRole, onDeleteRole } = props;
    const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
    
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

    const filteredUsers = useMemo(() => users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())), [users, searchQuery]);

    const handleSaveUser = (data: Omit<User, 'id'> | User) => 'id' in data ? onUpdateUser(data) : onAddUser(data);
    const handleSaveRole = (data: Omit<Role, 'id'> | Role) => 'id' in data ? onUpdateRole(data) : onAddRole(data);
    
    const handleDeleteRole = (role: Role) => {
        const isRoleInUse = users.some(u => u.roleId === role.id);
        if (isRoleInUse) {
            alert(`No se puede eliminar el rol "${role.name}" porque está asignado a uno o más usuarios.`);
            return;
        }
        setRoleToDelete(role);
    };

    const confirmDeleteRole = () => {
        if(roleToDelete) {
            onDeleteRole(roleToDelete.id);
            setRoleToDelete(null);
        }
    };
    
    const confirmDeleteUser = () => {
        if(userToDelete) {
            onDeleteUser(userToDelete.id);
            setUserToDelete(null);
        }
    }

    const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
        <button onClick={onClick} className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors duration-200 ${isActive ? 'border-brand-yellow text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{label}</button>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {isUserModalOpen && <UserModal user={editingUser} roles={roles} onSave={handleSaveUser} onClose={() => { setIsUserModalOpen(false); setEditingUser(null); }} />}
            {isRoleModalOpen && <RoleModal role={editingRole} onSave={handleSaveRole} onClose={() => { setIsRoleModalOpen(false); setEditingRole(null); }} />}
            {userToDelete && <ConfirmationModal title="Confirmar Eliminación" message={`¿Seguro que quieres eliminar a ${userToDelete.name}?`} onConfirm={confirmDeleteUser} onCancel={() => setUserToDelete(null)} />}
            {roleToDelete && <ConfirmationModal title="Confirmar Eliminación" message={`¿Seguro que quieres eliminar el rol "${roleToDelete.name}"?`} onConfirm={confirmDeleteRole} onCancel={() => setRoleToDelete(null)} />}

            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Usuarios y Roles</h1>
                <Button onClick={activeTab === 'users' ? () => setIsUserModalOpen(true) : () => setIsRoleModalOpen(true)}>
                    <PlusIcon /> <span className="ml-2">{activeTab === 'users' ? 'Añadir Usuario' : 'Crear Rol'}</span>
                </Button>
            </div>
            
            <div className="mb-4 border-b border-gray-200"><TabButton label="Usuarios" isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} /><TabButton label="Roles" isActive={activeTab === 'roles'} onClick={() => setActiveTab('roles')} /></div>

            {activeTab === 'users' && <>
                <Card className="mb-6"><input type="text" placeholder="Buscar por nombre o email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" /></Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.length > 0 ? filteredUsers.map(user => {
                        const role = roles.find(r => r.id === user.roleId);
                        return (
                            <Card key={user.id} className="hover:shadow-lg transition-shadow duration-200">
                                <div className="flex justify-between items-start"><div className="flex items-center space-x-4"><div className="flex-shrink-0 h-12 w-12 rounded-full bg-yellow-400 flex items-center justify-center text-xl font-bold text-brand-dark">{getInitials(user.name)}</div><div><p className="text-md font-bold text-gray-900">{user.name}</p><p className="text-sm text-gray-500">{user.email}</p></div></div><div className="flex-shrink-0 flex space-x-1"><Button variant="secondary" onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }} className="p-2 h-8 w-8 !rounded-full"><PencilIcon /></Button><Button variant="danger" onClick={() => setUserToDelete(user)} className="p-2 h-8 w-8 !rounded-full"><TrashIcon /></Button></div></div>
                                <div className="mt-4 pt-4 border-t border-gray-200"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{role?.name || 'Sin Rol'}</span></div>
                            </Card>
                        )
                    }) : <div className="md:col-span-2 lg:col-span-3"><Card className="text-center py-12 flex flex-col items-center border-2 border-dashed"><UsersIcon /><h3 className="text-xl font-semibold text-gray-700 mt-4">No se encontraron usuarios</h3><p className="text-gray-500 mt-2">{searchQuery ? `No hay usuarios que coincidan con "${searchQuery}".` : 'Aún no se han añadido usuarios.'}</p></Card></div>}
                </div>
            </>}
            
            {activeTab === 'roles' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.length > 0 ? roles.map(role => {
                    const userCount = users.filter(u => u.roleId === role.id).length;
                    return (
                        <Card key={role.id} className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
                            <div className="flex justify-between items-start"><h3 className="text-lg font-bold text-gray-900 pr-4">{role.name}</h3><div className="flex space-x-1 flex-shrink-0"><Button variant="secondary" onClick={() => { setEditingRole(role); setIsRoleModalOpen(true); }} className="p-2 h-8 w-8 !rounded-full"><PencilIcon /></Button><Button variant="danger" onClick={() => handleDeleteRole(role)} className="p-2 h-8 w-8 !rounded-full"><TrashIcon /></Button></div></div>
                            <div className="mt-4 pt-4 border-t flex-grow space-y-2 text-sm">
                                <p className="text-gray-600"><strong>{role.permissions.length}</strong> permisos activados.</p>
                                <p className="text-gray-600"><strong>{userCount}</strong> usuarios asignados.</p>
                            </div>
                        </Card>
                    )
                }) : <div className="md:col-span-2 lg:col-span-3"><Card className="text-center py-12 flex flex-col items-center border-2 border-dashed"><ShieldCheckIcon /><h3 className="text-xl font-semibold text-gray-700 mt-4">No hay roles definidos</h3><p className="text-gray-500 mt-2">Crea tu primer rol para empezar a asignar permisos.</p></Card></div>}
            </div>}
        </div>
    );
};

export default Users;