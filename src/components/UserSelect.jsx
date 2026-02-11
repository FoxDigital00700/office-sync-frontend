import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check } from 'lucide-react';

export default function UserSelect({ users, value, onChange, placeholder = "Select a user..." }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownStyle, setDropdownStyle] = useState({});
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null); // Ref for the portal content

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownStyle({
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width,
            });
        }
    };

    // Toggle and calculate position
    const toggleDropdown = () => {
        if (!isOpen) {
            updatePosition();
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    // Close on click outside or scroll/resize
    useEffect(() => {
        const handleInteraction = (event) => {
            if (isOpen) {
                // Check if click is inside portal or trigger
                if (
                    dropdownRef.current && dropdownRef.current.contains(event.target) ||
                    triggerRef.current && triggerRef.current.contains(event.target)
                ) {
                    return;
                }
                setIsOpen(false);
            }
        };

        const handleScrollOrResize = () => {
            if (isOpen) updatePosition(); // Recalculate position on scroll/resize
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleInteraction);
            window.addEventListener('scroll', handleScrollOrResize, true);
            window.addEventListener('resize', handleScrollOrResize);
        }

        return () => {
            document.removeEventListener('mousedown', handleInteraction);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen]);

    // Filter users
    const filteredUsers = users.filter(user =>
        (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedUser = users.find(u => u._id === value);

    const DropdownContent = (
        <div
            ref={dropdownRef}
            style={{
                position: 'fixed',
                top: dropdownStyle.top,
                left: dropdownStyle.left,
                width: dropdownStyle.width,
                maxHeight: '300px', // Explicit max height for portal
            }}
            className="z-[9999] bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top flex flex-col"
        >
            {/* Search Input */}
            <div className="p-2 border-b border-white/5 bg-slate-900/95 backdrop-blur-sm z-10">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        autoFocus
                        type="text"
                        className="w-full bg-white/5 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:bg-white/10 transition-colors"
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>

            {/* User List */}
            <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 p-1 flex-1">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => {
                        const isSelected = user._id === value;
                        return (
                            <div
                                key={user._id}
                                onClick={() => {
                                    onChange(user._id);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group ${isSelected ? 'bg-purple-600/20' : 'hover:bg-white/5'
                                    }`}
                            >
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isSelected
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                                    : 'bg-white/10 text-gray-400 group-hover:bg-white/20 group-hover:text-white'
                                    }`}>
                                    {user.name?.[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className={`text-sm font-medium truncate ${isSelected ? 'text-purple-300' : 'text-gray-300 group-hover:text-white'}`}>
                                        {user.name}
                                    </div>
                                    <div className="text-[10px] text-gray-500 truncate">{user.email}</div>
                                </div>
                                {/* Role Badge */}
                                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold border ${(user.role || '').includes('Admin')
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                    : user.role === 'Manager'
                                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                        : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                    }`}>
                                    {user.role}
                                </span>
                                {isSelected && <Check size={14} className="text-purple-400" />}
                            </div>
                        );
                    })
                ) : (
                    <div className="p-4 text-center text-xs text-gray-500">
                        No users found.
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div className="relative" ref={triggerRef}>
                {/* Trigger Button */}
                <button
                    type="button"
                    onClick={toggleDropdown}
                    className={`w-full flex items-center justify-between bg-black/20 border ${isOpen ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-primary-700/50'} rounded-lg px-4 py-3 text-sm transition-all outline-none text-left`}
                >
                    {selectedUser ? (
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                {selectedUser.name?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex flex-col truncate">
                                <span className="font-medium text-white truncate">{selectedUser.name}</span>
                                <span className="text-[10px] text-primary-400 truncate">{selectedUser.email}</span>
                            </div>
                        </div>
                    ) : (
                        <span className="text-primary-500">{placeholder}</span>
                    )}
                    <ChevronDown size={16} className={`text-primary-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>
            {isOpen && createPortal(DropdownContent, document.body)}
        </>
    );
}
