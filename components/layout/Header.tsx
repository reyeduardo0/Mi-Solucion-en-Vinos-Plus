import React, { useState, useRef, useEffect } from 'react';
import { User } from '../../types';

interface HeaderProps {
    user: User;
    roleName: string;
    onLogout: () => void;
    toggleSidebar: () => void;
    onOpenProfile: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, roleName, onLogout, toggleSidebar, onOpenProfile }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);
    
    return (
        <header className="bg-white shadow-sm p-4 flex justify-between items-center w-full z-10">
            {/* Mobile menu button */}
            <button onClick={toggleSidebar} className="text-gray-500 focus:outline-none md:hidden">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
            </button>
            
            <div className="flex-grow"></div>
            
            <div className="flex items-center space-x-3">
                <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors focus:outline-none">
                        <div className="text-right hidden sm:block">
                            <p className="font-semibold text-sm text-gray-800">{user.name}</p>
                            <p className="text-xs text-gray-500">{roleName}</p>
                        </div>
                        <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>

                    {dropdownOpen && (
                        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="menu-button">
                                <div className="px-4 py-3 border-b">
                                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                </div>
                                <a href="#" onClick={(e) => { e.preventDefault(); onOpenProfile(); setDropdownOpen(false); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Cambiar Contraseña</a>
                                <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Cerrar Sesión</a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
