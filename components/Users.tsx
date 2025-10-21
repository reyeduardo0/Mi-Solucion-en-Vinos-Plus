import React, { useState } from 'react';
import { User, Role } from '../types';
import { useData } from '../context/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import Card from './ui/Card';
import Button from './ui/Button';
import UserModal from './users/UserModal';
import RoleModal from './users/RoleModal';
import ConfirmationModal from './ui/ConfirmationModal';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;

const Users: React.FC = () => {
    const { users, roles, addUser, updateUser, deleteUser, addRole, updateRole, deleteRole } = useData();
    const { can } = usePermissions();
    const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
    const [isUserModalOpen, setUserModalOpen] = useState(false);
    const [isRoleModalOpen, setRoleModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'user' | 'role', item: User | Role } | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const showSuccessMessage = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setUserModalOpen(true);
    };

    const handleEditRole = (role: Role) => {
        setSelectedRole(role);
        setRoleModalOpen(true);
    };

    const handleSaveUser = async (data: (Omit<User, 'id'> & { password?: string }) | User) => {
        if ('id' in data) {
            await updateUser(data);
            showSuccessMessage(`Usuario "${data.name}" actualizado correctamente.`);
        } else {
            await addUser(data);
            showSuccessMessage(`Usuario "${data.name}" creado correctamente.`);
        }
    };
    
    const handleSaveRole = async (role: Role | Omit<Role, 'id' | 'created_at'>) => {
        if ('id' in role) {
            await updateRole(role);
            showSuccessMessage(`Rol "${role.name}" actualizado correctamente.`);
        } else {
            await addRole(role);
            showSuccessMessage(`Rol "${role.name}" creado correctamente.`);
        }
        setRoleModalOpen(false);
        setSelectedRole(null);
    };
    
    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        const itemName = itemToDelete.item.name;
        if (itemToDelete.type === 'user') {
            await deleteUser(itemToDelete.item.id);
            showSuccessMessage(`Usuario "${itemName}" eliminado.`);
        } else {
            await deleteRole(itemToDelete.item.id);
            showSuccessMessage(`Rol "${itemName}" eliminado.`);
        }
        setItemToDelete(null);
    };

    const TabButton: React.FC<{ label: string; count: number; isActive: boolean; onClick: () => void; }> = ({ label, count, isActive, onClick }) => (
        <button onClick={onClick} className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors duration-200 ${isActive ? 'border-brand-yellow text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{label} ({count})</button>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {isUserModalOpen && <UserModal user={selectedUser} roles={roles} onSave={handleSaveUser} onClose={() => { setUserModalOpen(false); setSelectedUser(null); }} />}
            {isRoleModalOpen && <RoleModal role={selectedRole} onSave={handleSaveRole} onClose={() => { setRoleModalOpen(false); setSelectedRole(null); }} />}
            {itemToDelete && <ConfirmationModal title={`Confirmar Eliminación de ${itemToDelete.type === 'user' ? 'Usuario' : 'Rol'}`} message={`¿Estás seguro de que quieres eliminar a "${itemToDelete.item.name}"?`} onConfirm={handleConfirmDelete} onCancel={() => setItemToDelete(null)} />}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Usuarios y Roles</h1>
                {can('users:manage') && (
                    <Button onClick={() => activeTab === 'users' ? setUserModalOpen(true) : setRoleModalOpen(true)}>
                        <PlusIcon /> <span className="ml-2 hidden sm:inline">Nuevo {activeTab === 'users' ? 'Usuario' : 'Rol'}</span>
                    </Button>
                )}
            </div>
            
            {successMessage && <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">{successMessage}</div>}

            <div className="mb-4 border-b border-gray-200">
                <TabButton label="Usuarios" count={users.length} isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                <TabButton label="Roles" count={roles.length} isActive={activeTab === 'roles'} onClick={() => setActiveTab('roles')} />
            </div>

            <Card>
                {activeTab === 'users' ? (
                     <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium uppercase">Nombre</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Email</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Rol</th><th className="px-6 py-3 text-right text-xs font-medium uppercase">Acciones</th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">{users.map(user => (<tr key={user.id}><td className="px-6 py-4">{user.name}</td><td className="px-6 py-4">{user.email}</td><td className="px-6 py-4">{roles.find(r => r.id === user.roleId)?.name || 'N/A'}</td><td className="px-6 py-4 text-right space-x-2"><Button variant="secondary" className="p-2" onClick={() => handleEditUser(user)}><PencilIcon/></Button><Button variant="danger" className="p-2" onClick={() => setItemToDelete({type: 'user', item: user})}><TrashIcon/></Button></td></tr>))}</tbody>
                    </table>
                ) : (
                     <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium uppercase">Nombre del Rol</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Permisos</th><th className="px-6 py-3 text-right text-xs font-medium uppercase">Acciones</th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {roles.map(role => {
                                const isRoleInUse = users.some(u => u.roleId === role.id);
                                const isAdminRole = role.name.toLowerCase() === 'admin';
                                const isDeletable = !isRoleInUse && !isAdminRole;
                                let tooltipMessage = 'Eliminar Rol';
                                if(isRoleInUse) tooltipMessage = 'No se puede eliminar: Hay usuarios asignados a este rol.';
                                if(isAdminRole) tooltipMessage = 'El rol de Administrador no se puede eliminar.';

                                return (
                                    <tr key={role.id}>
                                        <td className="px-6 py-4">{role.name}</td>
                                        <td className="px-6 py-4">{role.permissions.length}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <Button variant="secondary" className="p-2" onClick={() => handleEditRole(role)}><PencilIcon/></Button>
                                            <Button 
                                                variant="danger" 
                                                className="p-2" 
                                                onClick={() => setItemToDelete({type: 'role', item: role})}
                                                disabled={!isDeletable}
                                                title={tooltipMessage}
                                            >
                                                <TrashIcon/>
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
};

export default Users;