import React, { useState, useRef, useEffect } from 'react';
import { Role, Permission } from '../../types';
import { PERMISSIONS_LIST } from '../../constants';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface RoleModalProps {
    role: Role | null;
    onSave: (role: Omit<Role, 'id' | 'created_at'> | Role) => void;
    onClose: () => void;
}

const SUPER_USER_ROLE_NAME = 'Super Usuario';

const RoleModal: React.FC<RoleModalProps> = ({ role, onSave, onClose }) => {
    const [name, setName] = useState(role?.name || '');
    const [permissions, setPermissions] = useState<Set<Permission | '*'>>(new Set(role?.permissions || []));
    
    const isEditingSuperUserRole = role?.name === SUPER_USER_ROLE_NAME;

    const handlePermissionChange = (permission: Permission, checked: boolean) => {
        const newPermissions = new Set(permissions);
        if (checked) newPermissions.add(permission);
        else newPermissions.delete(permission);
        setPermissions(newPermissions);
    };
    
    const handleCategoryChange = (categoryPermissions: Permission[], checked: boolean) => {
        const newPermissions = new Set(permissions);
        if (checked) {
            categoryPermissions.forEach(p => newPermissions.add(p));
        } else {
            categoryPermissions.forEach(p => newPermissions.delete(p));
        }
        setPermissions(newPermissions);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditingSuperUserRole) return;
        const finalPermissions = Array.from(permissions) as Permission[];
        const roleData = { name, permissions: finalPermissions };
        onSave(role ? { ...role, ...roleData } : roleData);
        onClose();
    };
    
    const permissionsByCategory = PERMISSIONS_LIST.reduce((acc, p) => {
        if (!acc[p.category]) acc[p.category] = [];
        acc[p.category].push(p);
        return acc;
    }, {} as Record<string, typeof PERMISSIONS_LIST>);

    const CategoryPermissions: React.FC<{ category: string; perms: typeof PERMISSIONS_LIST }> = ({ category, perms }) => {
        const categoryPermissionIds = perms.map(p => p.id);
        const selectedCount = categoryPermissionIds.filter(pId => permissions.has(pId)).length;
        const allSelected = selectedCount === categoryPermissionIds.length;
        const someSelected = selectedCount > 0 && !allSelected;
        
        const categoryCheckboxRef = useRef<HTMLInputElement>(null);

        useEffect(() => {
            if (categoryCheckboxRef.current) {
                categoryCheckboxRef.current.indeterminate = someSelected;
            }
        }, [someSelected]);

        return (
            <fieldset className="border rounded-md p-4" disabled={isEditingSuperUserRole}>
                <div className="flex justify-between items-center mb-2 -mt-1">
                    <legend className="font-semibold text-sm px-2">{category}</legend>
                    <label className="flex items-center space-x-2 text-sm text-gray-600 pr-2 cursor-pointer">
                        <input 
                            type="checkbox"
                            ref={categoryCheckboxRef}
                            checked={allSelected}
                            onChange={e => handleCategoryChange(categoryPermissionIds, e.target.checked)}
                            className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                        />
                        <span>Seleccionar Todos</span>
                    </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mt-2">
                    {perms.map(p => (
                        <label key={p.id} className="flex items-center space-x-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={permissions.has(p.id)} 
                                onChange={e => handlePermissionChange(p.id, e.target.checked)} 
                                className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500" 
                            />
                            <span className="text-gray-700">{p.label}</span>
                        </label>
                    ))}
                </div>
            </fieldset>
        );
    };

    return (
        <Modal title={role ? `Editando Rol: ${role.name}` : 'Crear Nuevo Rol'} onClose={onClose} maxWidth="max-w-3xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                {isEditingSuperUserRole && (
                     <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                        <p className="font-bold">Aviso</p>
                        <p>El rol de Super Usuario tiene todos los permisos por defecto y no puede ser modificado.</p>
                    </div>
                )}
                <div><label className="block text-sm font-medium">Nombre del Rol</label><input type="text" value={name} onChange={e => setName(e.target.value)} required disabled={isEditingSuperUserRole} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100" /></div>
                <div>
                    <h4 className="text-sm font-medium mb-3">Permisos</h4>
                    <div className="space-y-4">
                        {Object.entries(permissionsByCategory).map(([category, perms]) => (
                            <CategoryPermissions key={category} category={category} perms={perms} />
                        ))}
                    </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isEditingSuperUserRole}>{role ? 'Guardar Cambios' : 'Crear Rol'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default RoleModal;