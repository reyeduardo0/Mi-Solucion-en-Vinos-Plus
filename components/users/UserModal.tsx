
import React, { useState, useEffect } from 'react';
import { User, Role } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface UserModalProps {
    user: User | null;
    roles: Role[];
    onSave: (user: Omit<User, 'id'> | User) => void;
    onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, roles, onSave, onClose }) => {
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

export default UserModal;
