import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

interface ProfileModalProps {
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
    const { updateCurrentUserPassword } = useData();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }
        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        setIsLoading(true);
        try {
            await updateCurrentUserPassword(password);
            setSuccess("¡Contraseña actualizada correctamente!");
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Modal title="Cambiar mi Contraseña" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Nueva Contraseña</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Confirmar Nueva Contraseña</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                {success && <div className="text-green-600 text-sm">{success}</div>}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Spinner /> : 'Actualizar Contraseña'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default ProfileModal;
