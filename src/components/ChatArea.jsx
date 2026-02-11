import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Trash2, FileText, ExternalLink, Clock, Play, Square, Share2, Download, Search, X } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import ProfileModal from './ProfileModal';
import MediaModal from './MediaModal';
import { API_URL } from '../config';

export default function ChatArea({ activeChannel, onChannelSelect }) {
    const { socket } = useSocket();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState(null);

    const [inspectUser, setInspectUser] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Offline Sync State
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingMessages, setPendingMessages] = useState([]);

    // Scroll ref
    const messageRefs = useRef({});

    // Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchScope, setSearchScope] = useState('channel'); // 'channel' or 'branch'
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim() && activeChannel) {
                setIsSearching(true);
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`${API_URL}/api/messages/search`, {
                        params: {
                            q: searchQuery,
                            channelId: activeChannel._id,
                            scope: searchScope
                        },
                        headers: { 'x-auth-token': token }
                    });
                    setSearchResults(res.data);
                } catch (err) {
                    console.error("Search failed", err);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, searchScope, activeChannel]);

    // Session Logic
    const lastSessionMsg = [...messages].reverse().find(m => m.type === 'session_start' || m.type === 'session_end');
    const isSessionActive = lastSessionMsg?.type === 'session_start';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Offline Detection & Sync
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncPendingMessages();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Load pending on mount
        const savedPending = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
        setPendingMessages(savedPending);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const syncPendingMessages = async () => {
        const savedPending = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
        if (savedPending.length === 0) return;

        const token = localStorage.getItem('token');
        const remainingPending = [];

        for (const msg of savedPending) {
            try {
                // Determine if it's a file or text
                // Simplified: for now only text offline supported fully or stored axios calls?
                // The prompt implies updating "chats", usually text. File upload offline is harder (Blob storage).
                // Let's assume text for now as per "update any chats".

                await axios.post(`${API_URL}/api/messages`, {
                    content: msg.content,
                    channelId: msg.channelId,
                    type: msg.type,
                    localId: msg.localId || msg._id, // Ensure ID is passed
                    isOffline: true // Flag for server logging
                }, {
                    headers: { 'x-auth-token': token }
                });
            } catch (err) {
                console.error("Failed to sync message", err);
                remainingPending.push(msg); // Keep if failed
            }
        }

        localStorage.setItem('pendingMessages', JSON.stringify(remainingPending));
        setPendingMessages(remainingPending);
        if (remainingPending.length === 0 && activeChannel) {
            // Refresh messages to show correct timestamps/IDs
            fetchMessages(activeChannel._id);
        }
    };

    useEffect(() => {
        if (activeChannel) {
            fetchMessages(activeChannel._id);
            if (socket) {
                socket.emit('join_channel', activeChannel._id);
            }
        }
    }, [activeChannel, socket]);

    useEffect(() => {
        if (socket) {
            socket.on('message', (message) => {
                if (activeChannel && message.channel === activeChannel._id) {
                    setMessages((prev) => {
                        // Dedup based on localId
                        if (message.localId) {
                            const existingIndex = prev.findIndex(m => m.localId === message.localId);
                            if (existingIndex !== -1) {
                                const newMessages = [...prev];
                                newMessages[existingIndex] = message; // Replace pending with real
                                return newMessages;
                            }
                        }
                        // Dedup based on _id just in case
                        if (prev.some(m => m._id === message._id)) return prev;

                        return [...prev, message];
                    });
                }
            });

            socket.on('message_deleted', (deletedMsgId) => {
                setMessages((prev) => prev.filter(msg => msg._id !== deletedMsgId));
            });

            return () => {
                socket.off('message');
                socket.off('message_deleted');
            };
        }
    }, [socket, activeChannel]);

    useEffect(() => {
        // Use a small timeout to ensure DOM is ready and images have started layout
        const timeout = setTimeout(() => {
            scrollToBottom();
        }, 100);
        return () => clearTimeout(timeout);
    }, [messages]);

    const scrollToBottom = () => {
        // Use 'auto' behavior for better reliability on dynamic content load
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    };

    const fetchMessages = async (channelId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/${channelId}`, {
                headers: { 'x-auth-token': token }
            });
            setMessages(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSessionAction = async (action) => {
        if (!activeChannel) return;
        try {
            const token = localStorage.getItem('token');
            const messageData = {
                content: action === 'start' ? 'Session Started' : 'Session Ended',
                channelId: activeChannel._id,
                type: action === 'start' ? 'session_start' : 'session_end'
            };
            await axios.post(`${API_URL}/api/messages`, messageData, { headers: { 'x-auth-token': token } });
        } catch (err) { console.error(err); }
    };

    const handleShareSession = (endMsg) => {
        const endIndex = messages.findIndex(m => m._id === endMsg._id);
        if (endIndex === -1) return;

        let startMsg = null;
        for (let i = endIndex - 1; i >= 0; i--) {
            if (messages[i].type === 'session_start') {
                startMsg = messages[i];
                break;
            }
        }

        if (startMsg) {
            const link = `${window.location.origin}/session/${activeChannel._id}/${startMsg._id}/${endMsg._id}`;
            navigator.clipboard.writeText(link);
            alert("Session Link Copied to Clipboard!");
        } else {
            alert("Could not find the start of this session.");
        }
    };

    const handleExportChat = async () => {
        if (!activeChannel) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/${activeChannel._id}/export`, {
                headers: { 'x-auth-token': token }
            });
            const allMessages = res.data;

            let textContent = `Chat Export: #${activeChannel.name}\nExported on: ${new Date().toLocaleString()}\n\n`;

            allMessages.forEach(msg => {
                const date = new Date(msg.createdAt).toLocaleString();
                const sender = msg.sender?.name || 'Unknown';
                const content = msg.content || (msg.fileUrl ? `[File: ${msg.fileName}]` : '[No Content]');
                textContent += `[${date}] ${sender}:\n${content}\n\n`;
            });

            const blob = new Blob([textContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeChannel.name}_chat_export.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed", err);
            alert("Failed to export chat.");
        }
    };

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if ((!newMessage.trim()) || !activeChannel) return;

        if (!isOnline) {
            // Offline Mode
            const tempId = Date.now().toString();
            const tempMsg = {
                _id: tempId, // Temp ID
                localId: tempId, // For dedup
                content: newMessage,
                channelId: activeChannel._id,
                type: 'text',
                sender: user,
                createdAt: new Date().toISOString(),
                status: 'pending'
            };

            setMessages(prev => [...prev, tempMsg]);

            const updatedPending = [...pendingMessages, tempMsg];
            setPendingMessages(updatedPending);
            localStorage.setItem('pendingMessages', JSON.stringify(updatedPending));

            setNewMessage('');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const localId = Date.now().toString(); // Generate ID for online tracking too
            const messageData = {
                content: newMessage,
                channelId: activeChannel._id,
                type: 'text',
                localId: localId
            };

            // Optimistic Update
            const optimMsg = {
                _id: localId, // Temp
                localId: localId,
                content: newMessage,
                channelId: activeChannel._id,
                type: 'text',
                sender: user,
                createdAt: new Date().toISOString(),
                status: 'sending'
            };
            setMessages(prev => [...prev, optimMsg]);

            await axios.post(`${API_URL}/api/messages`, messageData, {
                headers: { 'x-auth-token': token }
            });

            setNewMessage('');
        } catch (err) {
            console.error(err);
            // Remove optimistic on failure or mark failed? 
            setMessages(prev => prev.filter(m => m.localId !== localId));
            alert("Failed to send message");
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Use FormData for Multipart Upload
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            // 1. Upload File
            const uploadRes = await axios.post(`${API_URL}/api/upload`, formData, {
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'multipart/form-data'
                }
            });

            const { fileUrl, fileName, fileType } = uploadRes.data;

            // 2. Send Message with Link
            const messageData = {
                content: 'Attachment',
                channelId: activeChannel._id,
                type: fileType || file.type || 'unknown',
                fileUrl: fileUrl, // Now a path like /uploads/filename.ext
                fileName: fileName || file.name
            };

            await axios.post(`${API_URL}/api/messages`, messageData, {
                headers: { 'x-auth-token': token }
            });

        } catch (err) {
            console.error("Upload failed", err);
            const errMsg = err.response?.data?.message || err.message || "Unknown error";
            alert(`Upload Error: ${errMsg}`);
        }
        e.target.value = null; // Reset
    };

    const handleMouseMove = (e) => {
        const { currentTarget, clientX, clientY } = e;
        const { left, top } = currentTarget.getBoundingClientRect();
        currentTarget.style.setProperty('--x', `${clientX - left}px`);
        currentTarget.style.setProperty('--y', `${clientY - top}px`);
    };

    const handleScrollToMessage = (messageId, channelId) => {
        setIsSearchOpen(false);
        setSearchQuery('');

        // If message is in another channel, switch first
        if (channelId && activeChannel && channelId !== activeChannel._id) {
            onChannelSelect(channelId);
            // We need to wait for the channel to switch and messages to load.
            // This is a bit tricky. For now, let's just switch.
            // Ideally, we'd pass the messageId to the parent or store in 'pendingScroll' state.
            // Simple approach: Store 'pendingScrollTo' in session/local storage or state? 
            // Let's use a specialized effect or just a simple timeout for now assuming fast load?
            // Better: Set a temporary state "pendingMessageId" and check it in the main message useEffect.
            setPendingScrollMsgId(messageId); // Need to add this state
            return;
        }

        scrollToMsgId(messageId);
    };

    const [pendingScrollMsgId, setPendingScrollMsgId] = useState(null);

    // Effect to handle pending scroll after channel switch
    useEffect(() => {
        if (pendingScrollMsgId && messages.length > 0) {
            const found = messages.some(m => m._id === pendingScrollMsgId);
            if (found) {
                scrollToMsgId(pendingScrollMsgId);
                setPendingScrollMsgId(null);
            }
        }
    }, [messages, pendingScrollMsgId]);

    const scrollToMsgId = (id) => {
        const element = messageRefs.current[id];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.transition = 'background-color 0.5s';
            element.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            setTimeout(() => {
                element.style.backgroundColor = 'transparent';
            }, 2000);
        }
    };

    return (
        <div
            className="flex-1 flex flex-col h-full relative overflow-hidden transition-colors duration-500"
            onMouseMove={handleMouseMove}
            style={{
                background: 'linear-gradient(to bottom, #0f172a, #1e1b4b)', // Dark slate to deep indigo
                color: '#e2e8f0'
            }}
        >
            {/* Cursor Glow Overlay */}
            <div
                className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
                style={{
                    background: 'radial-gradient(600px circle at var(--x) var(--y), rgba(139, 92, 246, 0.15), transparent 40%)',
                }}
            />

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                user={user}
                isEditable={true}
            />

            {/* Media Modal */}
            {selectedMedia && (
                <MediaModal
                    src={selectedMedia.src}
                    type={selectedMedia.type}
                    fileName={selectedMedia.fileName}
                    onClose={() => setSelectedMedia(null)}
                />
            )}

            {/* Inspect User Profile Modal */}
            <ProfileModal
                isOpen={!!inspectUser}
                onClose={() => setInspectUser(null)}
                user={inspectUser}
                isEditable={false}
            />

            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center px-6 justify-between shadow-sm bg-white/5 backdrop-blur-md z-20">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">
                        {activeChannel ? `# ${activeChannel.name}` : 'Select a channel'}
                    </h3>
                    <p className="text-xs text-gray-300">Team discussion and updates</p>
                </div>

                {/* Export Button (Only in sub-branches) & Restricted to Admin/Tech Lead */}
                {activeChannel?.parent && (user?.role?.includes('Admin') || user?.designation === 'Tech Lead') && (
                    <button
                        onClick={handleExportChat}
                        className="h-10 w-10 mr-3 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-500 transition-colors shadow-md"
                        title="Export Chat"
                    >
                        <Download size={20} />
                    </button>
                )}

                {/* Search Button */}
                <button
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className={`h-10 w-10 mr-3 rounded-lg flex items-center justify-center transition-colors shadow-md ${isSearchOpen ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    title="Search in Chat"
                >
                    <Search size={20} />
                </button>

                {/* Profile Icon (Top Right) */}
                <button
                    onClick={() => setIsProfileOpen(true)}
                    className="h-10 w-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold hover:bg-primary-700 transition-colors shadow-md hover:scale-105"
                    title="Edit Profile"
                >
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                </button>
            </div>

            {/* Search Popup */}
            {isSearchOpen && (
                <div className="absolute top-20 right-6 w-80 bg-slate-900/95 border border-white/10 rounded-xl shadow-2xl z-30 flex flex-col max-h-[60%] overflow-hidden backdrop-blur-md animate-fade-in-up">
                    <div className="p-3 border-b border-white/10 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Search size={16} className="text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search in chat..."
                                className="bg-transparent border-none text-white text-sm focus:ring-0 flex-1 outline-none placeholder-gray-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button
                                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={16} className="text-gray-400 hover:text-white" />
                            </button>
                        </div>
                        {/* Scope Toggle */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSearchScope('channel')}
                                className={`flex-1 text-[10px] py-1 rounded transition-colors ${searchScope === 'channel' ? 'bg-primary-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                            >
                                Channel Chat
                            </button>
                            <button
                                onClick={() => setSearchScope('branch')}
                                className={`flex-1 text-[10px] py-1 rounded transition-colors ${searchScope === 'branch' ? 'bg-primary-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                            >
                                All Chats (Branch)
                            </button>
                        </div>
                    </div>
                    <div className="overflow-y-auto p-2 scrollbar-thin max-h-64">
                        {isSearching ? (
                            <div className="text-center text-gray-500 text-xs py-4">Searching...</div>
                        ) : searchQuery === '' ? (
                            <div className="text-center text-gray-500 text-xs py-4">Type to search...</div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map(msg => (
                                <div
                                    key={msg._id || msg.id}
                                    className="p-3 hover:bg-white/5 rounded-lg cursor-pointer border-b border-white/5 last:border-0 transition-colors group"
                                    onClick={() => handleScrollToMessage(msg._id || msg.id, msg.channel?._id || msg.channel)}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-primary-300 group-hover:text-primary-200">{msg.sender?.name || 'Unknown'}</span>
                                        <span className="text-[10px] text-gray-500">{new Date(msg.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mb-1">
                                        in <span className="text-purple-300">#{msg.channel?.name || 'Current Channel'}</span>
                                    </div>
                                    <div className="text-xs text-gray-300 line-clamp-2">{msg.content}</div>
                                    <div className="text-[10px] text-gray-600 mt-1 text-right">{new Date(msg.createdAt).toLocaleTimeString()}</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-500 text-xs py-4">No results found</div>
                        )}
                    </div>
                </div>
            )}

            {/* Session Bar (Only for sub-branches) */}
            {activeChannel?.parent && (
                <div className="h-12 bg-gray-900 border-b border-white/10 flex items-center justify-between px-6 z-20">
                    <div className="flex items-center gap-4 text-sm font-mono text-primary-300">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-purple-400" />
                            <span>{currentTime.toLocaleDateString()}</span>
                            <span className="w-px h-4 bg-white/10 mx-1"></span>
                            <span>{currentTime.toLocaleTimeString([], { hour12: false })}</span>
                        </div>
                    </div>

                    {/* Session Buttons for All Users */}
                    {(true) && (
                        <div>
                            {!isSessionActive ? (
                                <button
                                    onClick={() => handleSessionAction('start')}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/20 hover:scale-105"
                                >
                                    <Play size={12} fill="currentColor" /> Start Session
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSessionAction('stop')}
                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-900/20 hover:scale-105"
                                >
                                    <Square size={12} fill="currentColor" /> Stop Session
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                )}
                {messages.map((msg) => (
                    msg.type === 'offline_log' ? (
                        <div key={msg._id || msg.id} className="mb-4 flex justify-center w-full animate-fade-in-up">
                            <div className="bg-primary-900/80 backdrop-blur border border-purple-500/30 rounded-lg p-3 max-w-[85%] shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>

                                {/* Metadata Header */}
                                <div className="flex items-center gap-2 mb-2 text-xs text-primary-300 border-b border-white/5 pb-1">
                                    <Clock size={12} className="text-purple-400" />
                                    <span>{new Date(msg.createdAt).toLocaleString()}</span>
                                    <span className="mx-1">•</span>
                                    <span className="font-bold text-purple-300">
                                        {msg.content.split('||')[0]} {/* User Name */}
                                    </span>
                                    <span className="text-gray-400">sent in</span>
                                    <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
                                        #{msg.content.split('||')[1]} {/* Channel Name */}
                                    </span>
                                </div>

                                {/* Highlighted Message Content */}
                                <div className="pl-2">
                                    <p className="text-sm font-semibold text-white leading-relaxed bg-black/20 p-2 rounded border-l-2 border-yellow-500">
                                        {msg.content.split('||')[2]}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            key={msg._id || msg.id}
                            ref={(el) => (messageRefs.current[msg._id || msg.id] = el)}
                            className={`flex group px-2 py-1 rounded-lg transition-colors duration-500 ${msg.sender?.name === user?.name || msg.sender?._id === user?.id || msg.sender === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`relative max-w-[70%] rounded-3xl px-6 py-3 shadow-lg backdrop-blur-sm transition-all duration-300 animate-fade-in-up border border-white/5 ${(msg.sender?.name === user?.name || msg.sender?._id === user?.id || msg.sender === user?.id)
                                ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-br-sm'
                                : 'bg-white/10 text-white rounded-bl-sm hover:bg-white/15'
                                } ${msg.status === 'pending' ? 'opacity-70 border-dashed border-yellow-500/50' : ''}`}>

                                {/* Delete Message Button */}
                                {(user?.designation === 'Tech Lead' || user?.role?.includes('Admin')) && (
                                    <button
                                        onClick={async () => {
                                            if (confirm('Delete message?')) {
                                                try {
                                                    const token = localStorage.getItem('token');
                                                    await axios.delete(`${API_URL}/api/messages/${msg._id}`, { headers: { 'x-auth-token': token } });
                                                    // Optimistic remove
                                                    setMessages(current => current.filter(m => m._id !== msg._id));
                                                } catch (err) { console.error(err); }
                                            }
                                        }}
                                        className="absolute -top-2 -right-2 hidden group-hover:flex bg-red-500 text-white rounded-full p-1 shadow-sm"
                                        title="Delete Message"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}

                                {(msg.sender?.name !== user?.name && msg.sender?._id !== user?.id && msg.sender !== user?.id) && (
                                    <div
                                        className="text-xs font-bold text-purple-300 mb-1 cursor-pointer hover:text-purple-200"
                                        onClick={() => setInspectUser(msg.sender)}
                                        title="View Profile"
                                    >
                                        {msg.sender?.name || 'Unknown User'}
                                    </div>
                                )}

                                {/* --- Media Rendering Logic --- */}
                                {msg.type === 'session_start' ? (
                                    <div className="w-full">
                                        <div className="flex items-center gap-4 my-4">
                                            <div className="h-px bg-emerald-500/50 flex-1"></div>
                                            <div className="bg-emerald-500/10 text-emerald-400 px-4 py-1 rounded-full text-xs font-mono border border-emerald-500/20">
                                                SESSION STARTED • {new Date(msg.createdAt).toLocaleString()}
                                            </div>
                                            <div className="h-px bg-emerald-500/50 flex-1"></div>
                                        </div>
                                        <div className="text-center text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-bold">
                                            Started by {msg.sender?.name || 'Super Admin'}
                                        </div>
                                    </div>
                                ) : msg.type === 'session_end' ? (
                                    <div className="w-full">
                                        <div className="flex items-center gap-4 my-4">
                                            <div className="h-px bg-red-500/50 flex-1"></div>
                                            <div className="bg-red-500/10 text-red-400 px-4 py-1 rounded-full text-xs font-mono border border-red-500/20 flex items-center gap-2">
                                                <span>SESSION ENDED • {new Date(msg.createdAt).toLocaleString()}</span>
                                                <button
                                                    onClick={() => handleShareSession(msg)}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full transition-all shadow-lg hover:scale-110 ml-2"
                                                    title="Share Session Link"
                                                >
                                                    <Share2 size={16} />
                                                </button>
                                            </div>
                                            <div className="h-px bg-red-500/50 flex-1"></div>
                                        </div>
                                        <div className="text-center text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-bold">
                                            Ended by {msg.sender?.name || 'Super Admin'}
                                        </div>
                                    </div>
                                ) : (msg.type?.startsWith('image/') || msg.fileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                                    <div className="relative group">
                                        <img
                                            src={msg.fileUrl}
                                            alt="Shared image"
                                            className="rounded-lg max-w-full h-auto mb-1 border border-white/20 max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                            loading="lazy"
                                            onClick={() => setSelectedMedia({ src: msg.fileUrl, type: 'image', fileName: msg.fileName })}
                                        />
                                    </div>
                                ) : msg.fileUrl && (msg.type?.startsWith('video/') || msg.fileUrl?.match(/\.(mp4|webm|mov|mkv)$/i)) ? (
                                    <div className="relative group cursor-pointer" onClick={() => setSelectedMedia({ src: msg.fileUrl, type: 'video', fileName: msg.fileName })}>
                                        <video className="rounded-lg max-w-full mb-1 border border-white/20 max-h-64 pointer-events-none">
                                            <source src={msg.fileUrl} />
                                        </video>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                                                <ExternalLink size={24} className="text-white" />
                                            </div>
                                        </div>
                                    </div>
                                ) : msg.fileUrl ? (
                                    <div
                                        className="flex items-center gap-3 bg-white/10 p-3 rounded-lg border border-white/10 mb-1 backdrop-blur-md cursor-pointer hover:bg-white/20 transition-colors"
                                        onClick={() => setSelectedMedia({ src: msg.fileUrl, type: msg.type || 'file', fileName: msg.fileName })}
                                    >
                                        <div className="h-10 w-10 bg-primary-900 rounded flex items-center justify-center text-primary-300">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex-1 overflow-hidden min-w-[200px]">
                                            <div className="text-sm font-medium truncate text-purple-200 mb-1">{msg.fileName || 'Attachment'}</div>
                                            <span className="text-xs text-primary-400">Click to view/download</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                )}

                                <div className="text-[10px] text-purple-200 mt-1 flex justify-end items-center gap-1">
                                    {msg.status === 'pending' && <Clock size={10} className="animate-pulse text-yellow-300" />}
                                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {msg.status === 'pending' && <span className="text-yellow-300 font-bold italic">Pending</span>}
                                </div>
                            </div>
                        </div>
                    )
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md z-20">
                <form onSubmit={handleSend} className="flex items-center space-x-2 bg-white/10 rounded-full px-3 py-3 border border-white/10 focus-within:border-primary-500/50 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all shadow-lg hover:shadow-xl hover:bg-white/15">
                    {/* Hidden File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        // Accept all files
                        onChange={handleFileSelect}
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-primary-400 transition-colors rounded-full hover:bg-white/10"
                        title="Upload File"
                    >
                        <Paperclip size={20} />
                    </button>

                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm text-white placeholder-gray-400 px-2"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />

                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className={`p-3 rounded-full transition-all duration-300 ${newMessage.trim()
                            ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg shadow-purple-900/40 hover:scale-110 hover:shadow-purple-900/60'
                            : 'bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}
