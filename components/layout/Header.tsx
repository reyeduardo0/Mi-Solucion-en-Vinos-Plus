
import React from 'react';
import { User } from '../../types';
import { LogoutIcon } from '../../constants';

interface HeaderProps {
    user: User;
    roleName: string;
    onLogout: () => void;
    toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, roleName, onLogout, toggleSidebar }) => {
    return (
        <header className="bg-white shadow-sm p-4 flex justify-between items-center w-full z-10">
            {/* Mobile menu button */}
            <button onClick={toggleSidebar} className="text-gray-500 focus:outline-none md:hidden">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
            </button>
            
            {/* Spacer to push user profile to the right */}
            <div className="flex-grow"></div>
            
            {/* User profile section */}
            <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                    <p className="font-semibold text-sm text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500">{roleName}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogoutIcon />
                </button>
            </div>
        </header>
    );
};

export default Header;