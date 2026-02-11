import { useState, useEffect, useRef } from 'react';
import { Hash, Lock, LogOut, Plus, X, MoreVertical, User, Briefcase, CornerDownRight, Trash2, UserPlus, UserMinus, GitBranch, ChevronRight, ChevronDown, Clock, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import ProfileModal from './ProfileModal';
import MediaHistoryModal from './MediaHistoryModal';
import UserSelect from './UserSelect';
import { API_URL } from '../config';

import { useSocket } from '../context/SocketContext';

export default function Sidebar({ onSelectChannel, onChannelsLoaded, selectedChannelId }) {
    const { logout, user } = useAuth();
    const { socket } = useSocket();
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');

    // Consolidated Modal States
    const [showBranchActionsModal, setShowBranchActionsModal] = useState(false);
    const [showMemberActionsModal, setShowMemberActionsModal] = useState(false);

    // New Features
    const [showMediaHistory, setShowMediaHistory] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState(new Set()); // IDs of expanded branches

    // Action Context
    const [targetChannel, setTargetChannel] = useState(null);

    // Branch Action Inputs
    const [branchName, setBranchName] = useState('');

    // Member Action Inputs
    const [actionType, setActionType] = useState('add'); // 'add' or 'remove'
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');

    // Global Managers/Users Menu
    const [showGlobalMenu, setShowGlobalMenu] = useState(false);
    const [showGlobalUsersModal, setShowGlobalUsersModal] = useState(false);
    const [inspectUser, setInspectUser] = useState(null);
    const [managerSelectedUser, setManagerSelectedUser] = useState(null);

    // Draggable Modal State
    const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const modalStartPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!showMemberActionsModal) {
            setModalPosition({ x: 0, y: 0 });
        }
    }, [showMemberActionsModal]);

    useEffect(() => {
        const handleDragMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStartPos.current.x;
            const dy = e.clientY - dragStartPos.current.y;
            setModalPosition({
                x: modalStartPos.current.x + dx,
                y: modalStartPos.current.y + dy
            });
        };

        const handleDragEnd = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging]);

    const handleDragStart = (e) => {
        setIsDragging(true);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        modalStartPos.current = { ...modalPosition };
    };

    useEffect(() => {
        fetchChannels();
    }, []);

    // Sync with external selection (e.g. from Notification)
    useEffect(() => {
        if (selectedChannelId && channels.length > 0) {
            console.log('Sidebar: Syncing to selectedChannelId:', selectedChannelId);
            const channel = channels.find(c => c._id === selectedChannelId);
            if (channel) {
                console.log('Sidebar: Found channel:', channel.name);
                if (channel._id !== activeChannel?._id) {
                    setActiveChannel(channel);
                    // Recursively expand all parents to ensure visibility
                    setExpandedNodes(prev => {
                        const next = new Set(prev);
                        let curr = channel;
                        while (curr && curr.parent) {
                            next.add(curr.parent);
                            curr = channels.find(c => c._id === curr.parent);
                        }
                        return next;
                    });
                }
            } else {
                console.warn('Sidebar: Channel not found for ID:', selectedChannelId);
            }
        }
    }, [selectedChannelId, channels]);

    useEffect(() => {
        if (socket && channels.length > 0) {
            channels.forEach(channel => {
                socket.emit('join_channel', channel._id);
            });
        }
    }, [socket, channels]);

    // Shortcut 'n'
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if ((e.key === 'n' || e.key === 'N') && activeChannel && (user.role.includes('Admin') || user.role === 'Manager')) {
                e.preventDefault();
                openBranchActions(activeChannel);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeChannel, user]);

    const fetchChannels = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/channels`, { headers: { 'x-auth-token': token } });
            setChannels(res.data);
            if (onChannelsLoaded) onChannelsLoaded(res.data);

            // Do not expand all by default. Let active channel logic handle necessary expansions.
            // const ids = new Set(res.data.map(c => c._id));
            // setExpandedNodes(ids);
            setExpandedNodes(new Set());

            if (res.data.length > 0 && !activeChannel) {
                setActiveChannel(res.data[0]);
                onSelectChannel(res.data[0]);
            }
        } catch (err) { console.error("Failed to fetch channels", err); }
    };

    const fetchAllUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/auth/users`, { headers: { 'x-auth-token': token } });
            setAllUsers(res.data);
        } catch (err) { console.error("Failed to fetch users", err); }
    };

    // --- Actions ---

    const handleCreateChannel = async (e) => {
        e.preventDefault();
        if (!newChannelName.trim()) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/channels`,
                { name: newChannelName, type: 'Global' },
                { headers: { 'x-auth-token': token } }
            );
            handleChannelUpdate(res.data);
            setNewChannelName('');
            setIsCreating(false);
        } catch (err) { console.error(err); }
    };

    const handleChannelUpdate = (newChannel) => {
        setChannels(prev => {
            const exists = prev.find(c => c._id === newChannel._id);
            const updated = exists ? prev.map(c => c._id === newChannel._id ? newChannel : c) : [...prev, newChannel];
            return updated;
        });
        if (socket) socket.emit('join_channel', newChannel._id);
        setExpandedNodes(prev => new Set(prev).add(newChannel._id).add(newChannel.parent)); // Ensure visibility
        if (onChannelsLoaded) onChannelsLoaded([...channels, newChannel]);
        handleChannelClick(newChannel);
    };

    const handleChannelDelete = async () => {
        if (!targetChannel) return;
        if (!confirm(`Are you sure you want to delete #${targetChannel.name} and ALL sub-branches?`)) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/channels/${targetChannel._id}`, { headers: { 'x-auth-token': token } });

            setChannels(prev => prev.filter(c => c._id !== targetChannel._id && c.parent !== targetChannel._id));
            fetchChannels();
            if (activeChannel?._id === targetChannel._id) setActiveChannel(null);
            setShowBranchActionsModal(false);
        } catch (err) { alert("Failed to delete channel"); }
    };

    const handleCreateBranch = async (e) => {
        e.preventDefault();
        if (!branchName.trim() || !targetChannel) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/channels`,
                { name: branchName, type: 'Global', parentId: targetChannel._id },
                { headers: { 'x-auth-token': token } }
            );
            handleChannelUpdate(res.data);
            setShowBranchActionsModal(false);
        } catch (err) { alert("Failed to create branch"); }
    };

    const handleMemberAction = async () => {
        if (!selectedUser || !targetChannel) return;
        const token = localStorage.getItem('token');
        try {
            if (actionType === 'add') {
                await axios.post(`${API_URL}/api/channels/${targetChannel._id}/members`, { userId: selectedUser }, { headers: { 'x-auth-token': token } });
                alert('Member added!');
            } else {
                await axios.delete(`${API_URL}/api/channels/${targetChannel._id}/members/${selectedUser}`, { headers: { 'x-auth-token': token } });
                alert('Member removed!');
            }
            setShowMemberActionsModal(false);
            fetchChannels(); // Refresh to update member lists
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    // --- Interaction ---

    const toggleNode = (id) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleChannelClick = (channel) => {
        setActiveChannel(channel);
        onSelectChannel(channel);
    };

    const openBranchActions = (channel) => {
        setTargetChannel(channel);
        setBranchName('');
        setShowBranchActionsModal(true);
    };

    const openMemberActions = (channel) => {
        setTargetChannel(channel);
        fetchAllUsers();
        setActionType('add');
        setSelectedUser('');
        setShowMemberActionsModal(true);
    };

    // --- Rendering ---

    const getIcon = (channel) => {
        if (channel.name === 'Offline History') return <Database size={16} className="text-yellow-400" />;
        return channel.type === 'Private' ? <Lock size={16} /> : <Hash size={18} />;
    };

    const getAvailableUsers = () => {
        if (!targetChannel || !allUsers) return [];
        // Filter out any null users (deleted users) before processing
        const safeAllowedUsers = (targetChannel.allowedUsers || []).filter(u => u && u._id);

        const existingIds = safeAllowedUsers.map(u => u._id);

        if (actionType === 'add') {
            return allUsers.filter(u => !existingIds.includes(u._id));
        } else {
            return safeAllowedUsers;
        }
    };

    const renderChannelNode = (channel, level = 0) => {
        const hasChildren = channel.children && channel.children.length > 0;
        const isExpanded = expandedNodes.has(channel._id);

        return (
            <div key={channel._id}>
                <div className="group relative">
                    <div className={`w-full flex items-center px-2 py-1.5 rounded-lg transition-all duration-200 ${activeChannel?._id === channel._id
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'hover:bg-white/10 hover:text-white'
                        } ${level === 0 ? 'mb-1 mt-2 text-sm font-bold tracking-wide text-primary-100 uppercase' : 'text-xs font-medium text-primary-300'}`}
                        style={{ paddingLeft: `${Math.max(4, level * 12)}px` }}
                    >
                        {/* Toggle Arrow */}
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleNode(channel._id); }}
                            className={`p-1 hover:text-white transition-opacity ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        >
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>

                        <button
                            onClick={() => handleChannelClick(channel)}
                            className="flex-1 flex items-center text-left truncate -ml-1"
                        >
                            {/* Branch Indicator for deep levels */}
                            {level > 0 && <CornerDownRight size={14} className="mr-2 opacity-50" />}
                            <span className={`mr-2 ${level === 0 ? 'opacity-100 text-purple-400' : 'opacity-70'}`}>{getIcon(channel)}</span>
                            <span className="truncate">{channel.name}</span>
                        </button>

                        {(user?.designation === 'Tech Lead' || user?.role?.includes('Admin')) && (
                            <div className="hidden group-hover:flex space-x-1 bg-primary-900/90 rounded px-1 ml-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); openBranchActions(channel); }}
                                    className="p-1 hover:text-blue-400 text-primary-400"
                                    title="Branch Actions (+B)"
                                >
                                    <span className="text-[10px] font-bold">+B</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); openMemberActions(channel); }}
                                    className="p-1 hover:text-green-400 text-primary-400"
                                    title="Member Actions (+U)"
                                >
                                    <span className="text-[10px] font-bold">+U</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                {/* Recursively render children */}
                {hasChildren && isExpanded && (
                    <div className="mt-0.5">
                        {channel.children.map(child => renderChannelNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const buildTree = (list) => {
        const map = {}, roots = [];
        const nodes = list.map(c => ({ ...c, children: [] }));
        nodes.forEach(c => map[c._id] = c);
        nodes.forEach(c => {
            if (c.parent && map[c.parent]) {
                map[c.parent].children.push(c);
            } else {
                // If no parent OR parent not accessible, treat as root
                roots.push(c);
            }
        });
        return roots;
    };

    return (
        <div className="w-64 bg-gradient-to-b from-purple-900 via-primary-900 to-primary-950 text-white flex flex-col h-full relative border-r border-white/10">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 font-bold border-b border-white/10 bg-white/5">
                <span>Office Sync</span>
                <div className="flex items-center gap-1">
                    {activeChannel && (
                        <button
                            onClick={() => setShowMediaHistory(true)}
                            className="p-1.5 hover:bg-white/10 rounded text-primary-300 hover:text-white"
                            title="Channel Media History"
                        >
                            <Clock size={16} />
                        </button>
                    )}
                    {(user?.designation === 'Tech Lead' || user?.role?.includes('Admin')) && (
                        <button onClick={() => setShowGlobalMenu(!showGlobalMenu)} className="hover:bg-white/10 rounded p-1">
                            <MoreVertical size={18} />
                        </button>
                    )}
                </div>

                {showGlobalMenu && (
                    <div className="absolute right-2 top-12 bg-white text-black rounded shadow-xl py-2 z-50 w-48 border border-gray-200">
                        <button
                            onClick={() => { setShowGlobalMenu(false); fetchAllUsers(); setShowGlobalUsersModal(true); }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                        >
                            <User size={14} /> Global Members
                        </button>
                    </div>
                )}
            </div>

            {/* User Info */}
            <div className="p-4 bg-primary-950/30 flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-primary-600 flex items-center justify-center font-bold">
                    {user?.name?.[0] || 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-medium truncate">{user?.name}</div>
                    <div className="text-xs text-primary-300 truncate flex items-center gap-1">
                        <Briefcase size={10} /> {user?.designation || (Array.isArray(user?.role) ? user.role[0] : user?.role)}
                    </div>
                </div>
            </div>

            {/* Channels */}
            <div className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
                <div className="px-2 mb-2 flex justify-between text-xs font-semibold text-primary-400 uppercase">
                    <span>Channels</span>
                    {(Array.isArray(user?.role) ? user.role.includes('Admin') : user?.role?.includes('Admin')) && (
                        <button onClick={() => setIsCreating(!isCreating)} className="hover:text-white">
                            <Plus size={14} />
                        </button>
                    )}
                </div>

                {isCreating && (
                    <form onSubmit={handleCreateChannel} className="px-2 mb-2 flex items-center bg-primary-800 rounded px-2 py-1 border border-primary-600">
                        <Hash size={14} className="text-primary-400 mr-2" />
                        <input
                            autoFocus
                            className="w-full bg-transparent border-none text-sm focus:outline-none"
                            placeholder="channel-name"
                            value={newChannelName}
                            onChange={e => setNewChannelName(e.target.value.replace(/\s+/g, '-'))}
                        />
                        <button type="button" onClick={() => setIsCreating(false)}><X size={14} /></button>
                    </form>
                )}

                {/* Pinned Offline History */}
                {channels.find(c => c.name === 'Offline History') && (
                    <div className="mb-2 pb-2 border-b border-white/10">
                        {renderChannelNode(channels.find(c => c.name === 'Offline History'))}
                    </div>
                )}

                {/* Main Channel Tree (Excluding Offline History) */}
                {buildTree(channels.filter(c => c.name !== 'Offline History')).map(node => renderChannelNode(node))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 space-y-2">
                <a
                    href="http://localhost:5173" // Task Manager runs on 5173 by default
                    className="flex items-center text-sm text-primary-300 hover:text-white gap-2 w-full p-2 hover:bg-white/10 rounded transition-colors"
                >
                    <Briefcase size={16} /> Back to Task Manager
                </a>
                <button onClick={logout} className="flex items-center text-sm text-primary-300 hover:text-white gap-2 w-full p-2 hover:bg-white/10 rounded transition-colors">
                    <LogOut size={16} /> Sign Out
                </button>
            </div>

            {/* --- MODALS (Fixed Center) --- */}

            {/* Branch Actions Modal (+B) */}
            {showBranchActionsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-primary-900 rounded-2xl shadow-2xl w-full max-w-md border border-primary-700/50 overflow-hidden ring-1 ring-white/10">
                        <div className="p-5 border-b border-primary-800/50 flex justify-between items-center bg-gradient-to-r from-primary-800 to-primary-900">
                            <h3 className="font-bold flex items-center gap-2 text-lg">
                                <GitBranch size={20} className="text-purple-400" /> Actions: #{targetChannel?.name}
                            </h3>
                            <button onClick={() => setShowBranchActionsModal(false)} className="text-primary-400 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-8">
                            {/* Create Branch Section */}
                            <div>
                                <h4 className="text-sm font-semibold text-primary-300 mb-3 uppercase tracking-wider">Create Sub-Branch</h4>
                                <form onSubmit={handleCreateBranch} className="flex gap-2">
                                    <input
                                        autoFocus
                                        className="flex-1 bg-black/20 border border-primary-700/50 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder-primary-500"
                                        placeholder="Enter branch name..."
                                        value={branchName}
                                        onChange={e => setBranchName(e.target.value.replace(/\s+/g, '-'))}
                                    />
                                    <button type="submit" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-900/20">
                                        Create
                                    </button>
                                </form>
                            </div>

                            <div className="h-px bg-primary-800/50" />

                            {/* Delete Section */}
                            <div>
                                <h4 className="text-sm font-semibold text-red-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                                    Danger Zone
                                </h4>
                                <button
                                    onClick={handleChannelDelete}
                                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-medium group"
                                >
                                    <Trash2 size={16} className="group-hover:scale-110 transition-transform" /> Delete Branch
                                </button>
                                <p className="text-[10px] text-red-400/60 mt-2 text-center">
                                    This will delete this branch and all its sub-branches.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Member Actions Modal (+U) */}
            {showMemberActionsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div
                        className="bg-primary-900 rounded-2xl shadow-2xl w-full max-w-md border border-primary-700/50 overflow-hidden ring-1 ring-white/10 transition-transform duration-75 ease-out"
                        style={{ transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)` }}
                    >
                        <div
                            onMouseDown={handleDragStart}
                            className="p-5 border-b border-primary-800/50 flex justify-between items-center bg-gradient-to-r from-primary-800 to-primary-900 cursor-move select-none"
                        >
                            <h3 className="font-bold flex items-center gap-2 text-lg">
                                <User size={20} className="text-emerald-400" /> Members: #{targetChannel?.name}
                            </h3>
                            <button onClick={() => setShowMemberActionsModal(false)} className="text-primary-400 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Action Toggle */}
                            <div className="flex bg-black/20 rounded-lg p-1">
                                <button
                                    onClick={() => { setActionType('add'); setSelectedUser(''); }}
                                    className={`flex-1 py-2 text-sm rounded-md transition-all flex items-center justify-center gap-2 font-medium ${actionType === 'add' ? 'bg-primary-700 text-white shadow-md' : 'text-primary-400 hover:text-white'}`}
                                >
                                    <UserPlus size={14} /> Add Member
                                </button>
                                <button
                                    onClick={() => { setActionType('remove'); setSelectedUser(''); }}
                                    className={`flex-1 py-2 text-sm rounded-md transition-all flex items-center justify-center gap-2 font-medium ${actionType === 'remove' ? 'bg-red-900/40 text-red-200 shadow-md' : 'text-primary-400 hover:text-white'}`}
                                >
                                    <UserMinus size={14} /> Remove Member
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs uppercase tracking-wider text-primary-400 font-semibold pl-1">
                                    {actionType === 'add' ? 'Available Users' : 'Current Members'}
                                </label>
                                <UserSelect
                                    users={getAvailableUsers()}
                                    value={selectedUser}
                                    onChange={setSelectedUser}
                                    placeholder={actionType === 'add' ? '-- Select user to add --' : '-- Select member to remove --'}
                                />
                                {getAvailableUsers().length === 0 && (
                                    <p className="text-xs text-primary-500/80 italic pl-1 mt-1">
                                        {actionType === 'add' ? 'No new users to add.' : 'No members found.'}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={handleMemberAction}
                                disabled={!selectedUser}
                                className={`w-full py-3 rounded-lg text-sm font-bold transition-all shadow-lg transform active:scale-95 ${!selectedUser
                                    ? 'bg-primary-800 text-primary-600 cursor-not-allowed shadow-none'
                                    : actionType === 'add'
                                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/20'
                                        : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-900/20'
                                    }`}
                            >
                                {actionType === 'add' ? 'Confirm Add' : 'Confirm Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Media History Modal */}
            {showMediaHistory && activeChannel && (
                <MediaHistoryModal channel={activeChannel} onClose={() => setShowMediaHistory(false)} />
            )}

            {/* Global Users Modal (Manager Only) - Kept consistent but simplified for brevity if needed */}
            {showGlobalUsersModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-primary-900 rounded-2xl shadow-2xl w-full max-w-lg border border-primary-700/50 flex flex-col max-h-[85vh] relative">
                        <div className="p-4 border-b border-primary-800 flex justify-between items-center bg-primary-950/50">
                            <h3 className="font-bold text-white flex items-center text-lg">
                                <User size={18} className="mr-2 text-blue-400" /> Global Directory
                            </h3>
                            <button onClick={() => { setShowGlobalUsersModal(false); setManagerSelectedUser(null); }} className="text-primary-400 hover:text-white">
                                <X size={22} />
                            </button>
                        </div>

                        {/* Manager Actions Popup (Moved Out) */}
                        {managerSelectedUser && (
                            <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in rounded-2xl">
                                <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-xs text-center relative animate-in zoom-in-95 duration-200">
                                    <button onClick={() => setManagerSelectedUser(null)} className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors bg-gray-200 hover:bg-gray-400 rounded-full p-1"><X size={14} /></button>
                                    <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold mb-3 shadow-lg">
                                        {managerSelectedUser.name?.[0]}
                                    </div>
                                    <h4 className="font-bold text-gray-800 text-xl mb-1">{managerSelectedUser.name}</h4>
                                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full mb-4 uppercase">
                                        {managerSelectedUser?.role === 'User' && managerSelectedUser?.designation === 'Tech Lead' ? 'Tech Lead' : managerSelectedUser?.role || 'User'}
                                    </span>

                                    <div className="space-y-2 mt-4">
                                        {(
                                            (Array.isArray(user?.role) ? user.role.includes('Admin') : user?.role?.includes('Admin')) ||
                                            user?.designation === 'Tech Lead'
                                        ) && (
                                                <button
                                                    onClick={async () => {
                                                        const isTechLead = managerSelectedUser.designation === 'Tech Lead';
                                                        // Prevent Tech Lead from modifying Admin
                                                        const isAdmin = Array.isArray(managerSelectedUser.role) ? managerSelectedUser.role.includes('Admin') : managerSelectedUser.role?.includes('Admin');
                                                        if (isAdmin) return;

                                                        const newDesignation = isTechLead ? 'Employee' : 'Tech Lead';
                                                        if (confirm(isTechLead ? `Demote ${managerSelectedUser.name} to Employee?` : `Promote ${managerSelectedUser.name} to Tech Lead?`)) {
                                                            await axios.put(`${API_URL}/api/auth/users/${managerSelectedUser._id}/role`, { designation: newDesignation }, { headers: { 'x-auth-token': localStorage.getItem('token') } });
                                                            fetchAllUsers(); setManagerSelectedUser(null);
                                                        }
                                                    }}
                                                    className={`w-full py-2.5 rounded-lg font-bold text-white transition-all shadow-md active:scale-95 ${managerSelectedUser.designation !== 'Tech Lead' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'}`}
                                                >
                                                    {managerSelectedUser.designation === 'Tech Lead' ? 'Demote to Employee' : 'Promote to Tech Lead'}
                                                </button>
                                            )}
                                        <button onClick={() => setInspectUser(managerSelectedUser)} className="w-full py-2.5 border-2 border-gray-100 hover:border-gray-300 text-gray-600 hover:text-gray-800 rounded-lg font-bold transition-all bg-gray-50 hover:bg-gray-100">
                                            View Profile
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Wrapper for list */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar relative">

                            {allUsers.map(u => (
                                <div key={u._id} onClick={() => setManagerSelectedUser(u)} className="flex items-center p-3 rounded-xl border border-primary-700/50 bg-primary-800/20 cursor-pointer hover:bg-primary-800 transition-colors">
                                    <div className="h-9 w-9 rounded-lg bg-primary-700 flex items-center justify-center font-bold mr-3 text-primary-200 border border-primary-600">{u.name?.[0]}</div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-gray-200">{u.name}</div>
                                        <div className="text-xs text-primary-400">{u.email}</div>
                                    </div>
                                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${(Array.isArray(u.role) ? u.role.includes('Admin') : u.role?.includes('Admin'))
                                        ? 'bg-purple-500/20 text-purple-300'
                                        : u.designation === 'Tech Lead'
                                            ? 'bg-blue-500/20 text-blue-300'
                                            : 'bg-gray-800 text-gray-500'
                                        }`}>
                                        {(Array.isArray(u.role) ? u.role.includes('Admin') : u.role?.includes('Admin'))
                                            ? 'Admin'
                                            : u.designation === 'Tech Lead'
                                                ? 'Tech Lead'
                                                : Array.isArray(u.role) ? u.role[0] : (u.role || 'User')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <ProfileModal isOpen={!!inspectUser} onClose={() => setInspectUser(null)} user={inspectUser} isEditable={false} />
        </div>
    );
}
