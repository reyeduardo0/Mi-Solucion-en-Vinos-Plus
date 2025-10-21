
import React from 'react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel, confirmText = 'Sí, eliminar', cancelText = 'Cancelar' }) => (
    <Modal title={title} onClose={onCancel} maxWidth="max-w-md">
        <p className="text-gray-600">{message}</p>
        <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={onCancel}>{cancelText}</Button>
            <Button variant="danger" onClick={onConfirm}>{confirmText}</Button>
        </div>
    </Modal>
);

export default ConfirmationModal;
