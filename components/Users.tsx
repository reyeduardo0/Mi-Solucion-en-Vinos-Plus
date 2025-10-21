
import React, { useState, useMemo } from 'react';
import { User, Role } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import { getInitials } from '../utils/helpers';
import UserModal from './users/UserModal';
import RoleModal from './users/RoleModal';
import ConfirmationModal from './ui/ConfirmationModal';

// --- Icons ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-5.197-5.975M15 21H3v-1a6 6 0 0112 0v1z" /></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.917l9 3 9-3A12.02 12.02 0 0021 8.958a11.955 11.955 0 01-5.618-4.016z" /></svg>;

const Users: React.FC = () => {
    const { users, roles, handleAddUser, handleUpdateUser, handleDeleteUser, handleAddRole, handleUpdateRole, handleDeleteRole } = useData();
    const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
    
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

    const filteredUsers = useMemo(() => users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())), [users, searchQuery]);

    const handleSaveUser = (data: Omit<User, 'id'> | User) => 'id' in data ? handleUpdateUser(data) : handleAddUser(data);
    const handleSaveRole = (data: Omit<Role, 'id' | 'created_at'> | Role) => 'id' in data ? handleUpdateRole(data) : handleAddRole(data);
    
    const tryDeleteRole = (role: Role) => {
        if (users.some(u => u.roleId === role.id)) {
            alert(`No se puede eliminar el rol "${role.name}" porque está asignado a uno o más usuarios.`);
            return;
        }
        setRoleToDelete(role);
    };

    const confirmDeleteRole = () => {
        if(roleToDelete) {
            handleDeleteRole(roleToDelete.id);
            setRoleToDelete(null);
        }
    };
    
    const confirmDeleteUser = () => {
        if(userToDelete) {
            handleDeleteUser(userToDelete.id);
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
                    {filteredUsers.length > 0 ? filteredUsers.map(user => (
                        <Card key={user.id} className="hover:shadow-lg transition-shadow duration-200">
                            <div className="flex justify-between items-start"><div className="flex items-center space-x-4"><div className="flex-shrink-0 h-12 w-12 rounded-full bg-yellow-400 flex items-center justify-center text-xl font-bold text-brand-dark">{getInitials(user.name)}</div><div><p className="text-md font-bold text-gray-900">{user.name}</p><p className="text-sm text-gray-500">{user.email}</p></div></div><div className="flex-shrink-0 flex space-x-1"><Button variant="secondary" onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }} className="p-2 h-8 w-8 !rounded-full"><PencilIcon /></Button><Button variant="danger" onClick={() => setUserToDelete(user)} className="p-2 h-8 w-8 !rounded-full"><TrashIcon /></Button></div></div>
                            <div className="mt-4 pt-4 border-t border-gray-200"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{roles.find(r => r.id === user.roleId)?.name || 'Sin Rol'}</span></div>
                        </Card>
                    )) : <div className="md:col-span-2 lg:col-span-3"><Card className="text-center py-12 flex flex-col items-center border-2 border-dashed"><UsersIcon /><h3 className="text-xl font-semibold text-gray-700 mt-4">No se encontraron usuarios</h3><p className="text-gray-500 mt-2">{searchQuery ? `No hay usuarios que coincidan con "${searchQuery}".` : 'Aún no se han añadido usuarios.'}</p></Card></div>}
                </div>
            </>}
            
            {activeTab === 'roles' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.length > 0 ? roles.map(role => (
                    <Card key={role.id} className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
                        <div className="flex justify-between items-start"><h3 className="text-lg font-bold text-gray-900 pr-4">{role.name}</h3><div className="flex space-x-1 flex-shrink-0"><Button variant="secondary" onClick={() => { setEditingRole(role); setIsRoleModalOpen(true); }} className="p-2 h-8 w-8 !rounded-full"><PencilIcon /></Button><Button variant="danger" onClick={() => tryDeleteRole(role)} className="p-2 h-8 w-8 !rounded-full"><TrashIcon /></Button></div></div>
                        <div className="mt-4 pt-4 border-t flex-grow space-y-2 text-sm">
                            <p className="text-gray-600"><strong>{role.permissions.length}</strong> permisos activados.</p>
                            <p className="text-gray-600"><strong>{users.filter(u => u.roleId === role.id).length}</strong> usuarios asignados.</p>
                        </div>
                    </Card>
                )) : <div className="md:col-span-2 lg:col-span-3"><Card className="text-center py-12 flex flex-col items-center border-2 border-dashed"><ShieldCheckIcon /><h3 className="text-xl font-semibold text-gray-700 mt-4">No hay roles definidos</h3><p className="text-gray-500 mt-2">Crea tu primer rol para empezar a asignar permisos.</p></Card></div>}
            </div>}
        </div>
    );
};

export default Users;
