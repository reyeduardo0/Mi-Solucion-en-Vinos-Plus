
import React, { useState } from 'react';
import { Role, Permission } from '../../types';
import { PERMISSIONS_LIST } from '../../constants';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface RoleModalProps {
    role: Role | null;
    onSave: (role: Omit<Role, 'id' | 'created_at'> | Role) => void;
    onClose: () => void;
}

const RoleModal: React.FC<RoleModalProps> = ({ role, onSave, onClose }) => {
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

export default RoleModal;
