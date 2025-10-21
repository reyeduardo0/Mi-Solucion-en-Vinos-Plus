import React, { useState } from 'react';
import { User, Role } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

interface UserModalProps {
    user: User | null;
    roles: Role[];
    onSave: (user: (Omit<User, 'id'> & { password?: string }) | User) => Promise<void>;
    onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, roles, onSave, onClose }) => {
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [roleId, setRoleId] = useState(user?.roleId || '');
    const [password, setPassword] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleId) {
            setError("Por favor, seleccione un rol.");
            return;
        }
        if (!user && !password) {
            setError("La contraseña es obligatoria para nuevos usuarios.");
            return;
        }

        setIsLoading(true);
        setError(null);
        
        try {
            const userData = { name, email, roleId };
            if (user) {
                await onSave({ ...user, ...userData });
            } else {
                await onSave({ ...userData, password });
            }
            onClose();
        } catch (e: any) {
             setError(e.message || 'Ocurrió un error inesperado.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Modal title={user ? `Editando Usuario: ${user.name}` : 'Crear Nuevo Usuario'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium">Nombre Completo</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>
                <div><label className="block text-sm font-medium">Correo Electrónico</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!user} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100" /></div>
                {!user && (<div><label className="block text-sm font-medium">Contraseña</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required={!user} placeholder="Mínimo 6 caracteres" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" /></div>)}
                <div><label className="block text-sm font-medium">Rol</label><select value={roleId} onChange={e => setRoleId(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value="">Seleccionar un rol...</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Spinner/> : (user ? 'Guardar Cambios' : 'Crear Usuario')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default UserModal;