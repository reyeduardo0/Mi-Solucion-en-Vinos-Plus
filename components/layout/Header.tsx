
import React from 'react';

interface HeaderProps {
    toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
    return (
        <header className="bg-brand-dark shadow-md p-4 flex justify-between items-center text-white md:hidden">
            <button onClick={toggleSidebar} className="text-gray-300 focus:outline-none">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
            </button>
            <div className="text-lg font-bold">Mi Solución en Vinos</div>
            <div></div>
        </header>
    );
};

export default Header;
