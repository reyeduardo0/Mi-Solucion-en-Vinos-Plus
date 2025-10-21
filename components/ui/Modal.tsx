
import React from 'react';

interface ModalProps {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ children, title, onClose, maxWidth = 'max-w-2xl' }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" onClick={onClose}>
        <div className={`bg-white rounded-lg shadow-xl w-full ${maxWidth}`} onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                <h3 className="text-xl font-bold">{title}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        </div>
    </div>
);

export default Modal;
