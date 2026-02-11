import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { Clock, Calendar, ArrowLeft, Download } from 'lucide-react';
import MediaModal from './MediaModal';

export default function SessionView() {
    const { channelId, startMsgId, endMsgId } = useParams();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchSessionMessages();
    }, [channelId, startMsgId, endMsgId]);

    const fetchSessionMessages = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError("Please login to view this session.");
                setLoading(false);
                return;
            }

            const res = await axios.get(`${API_URL}/api/messages/session/${channelId}/${startMsgId}/${endMsgId}`, {
                headers: { 'x-auth-token': token }
            });
            setMessages(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError("Failed to load session. It may not exist or you don't have permission.");
            setLoading(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading Session...</div>;
    if (error) return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4 text-center">
            <div className="text-red-400 mb-4 text-xl font-bold">Error</div>
            <p className="mb-6">{error}</p>
            <Link to="/" className="px-4 py-2 bg-primary-600 rounded hover:bg-primary-500 transition-colors">Go Home</Link>
        </div>
    );

    const startTime = messages.length > 0 ? new Date(messages[0].createdAt) : null;
    const endTime = messages.length > 0 ? new Date(messages[messages.length - 1].createdAt) : null;

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-gray-800 shadow-md z-20">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Back to App">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg flex items-center gap-2">
                            <Clock size={18} className="text-purple-400" />
                            Session Archive
                        </h1>
                        {startTime && (
                            <div className="text-xs text-gray-400 flex items-center gap-2 font-mono">
                                <span>{startTime.toLocaleDateString()} {startTime.toLocaleTimeString()}</span>
                                <span>to</span>
                                <span>{endTime?.toLocaleTimeString()}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-gray-900 to-gray-800">
                {messages.map((msg) => (
                    <div key={msg._id} className={`flex group ${msg.sender?.name === 'You' ? 'justify-end' : 'justify-start'}`}>
                        {/* Simple Bubble Rendering for Read-Only View */}
                        {msg.type === 'session_start' || msg.type === 'session_end' ? (
                            <div className="w-full">
                                <div className="flex items-center gap-4 my-4">
                                    <div className={`h-px flex-1 ${msg.type === 'session_start' ? 'bg-emerald-500/50' : 'bg-red-500/50'}`}></div>
                                    <div className={`px-4 py-1 rounded-full text-xs font-mono border ${msg.type === 'session_start' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {msg.type === 'session_start' ? 'SESSION STARTED' : 'SESSION ENDED'} • {new Date(msg.createdAt).toLocaleString()}
                                    </div>
                                    <div className={`h-px flex-1 ${msg.type === 'session_start' ? 'bg-emerald-500/50' : 'bg-red-500/50'}`}></div>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-[80%]">
                                <div className="flex items-baseline gap-2 mb-1 pl-1">
                                    <span className="text-sm font-bold text-purple-300">{msg.sender?.name || 'Unknown'}</span>
                                    <span className="text-[10px] text-gray-500">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-200 shadow-sm">
                                    {msg.type === 'text' && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                                    {(msg.type?.startsWith('image/') || msg.fileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && (
                                        <img
                                            src={msg.fileUrl}
                                            alt="content"
                                            className="rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90"
                                            onClick={() => setSelectedMedia({ src: msg.fileUrl, type: 'image', fileName: 'Image' })}
                                        />
                                    )}
                                    {msg.fileUrl && !msg.type?.startsWith('image/') && !msg.fileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                                        <div
                                            className="flex items-center gap-3 bg-black/20 p-2 rounded cursor-pointer hover:bg-black/30"
                                            onClick={() => setSelectedMedia({ src: msg.fileUrl, type: msg.type?.startsWith('video/') ? 'video' : 'file', fileName: 'File' })}
                                        >
                                            <div className="p-2 bg-primary-900 rounded"><Download size={16} /></div>
                                            <div className="overflow-hidden">
                                                <div className="truncate text-xs font-medium">Attachment</div>
                                                <div className="text-[10px] text-gray-400">Click to view</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Media Modal */}
            {selectedMedia && (
                <MediaModal
                    src={selectedMedia.src}
                    type={selectedMedia.type}
                    fileName={selectedMedia.fileName}
                    onClose={() => setSelectedMedia(null)}
                />
            )}
        </div>
    );
}
