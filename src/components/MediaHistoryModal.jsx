import { useState, useEffect } from 'react';
import { X, Image, Film, FileText, Download, ExternalLink, Calendar, Trash2, FolderOpen } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import MediaModal from './MediaModal';
import { useSocket } from '../context/SocketContext';

export default function MediaHistoryModal({ channel, onClose }) {
    const [activeTab, setActiveTab] = useState('images');
    const [media, setMedia] = useState({ images: [], videos: [], docs: [] });
    const [loading, setLoading] = useState(true);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const { socket } = useSocket();

    useEffect(() => {
        fetchMedia();

        if (socket) {
            const handleMessageDeleted = (deletedMsgId) => {
                setMedia(prev => ({
                    images: prev.images.filter(item => item._id !== deletedMsgId),
                    videos: prev.videos.filter(item => item._id !== deletedMsgId),
                    docs: prev.docs.filter(item => item._id !== deletedMsgId)
                }));
            };

            socket.on('message_deleted', handleMessageDeleted);
            return () => socket.off('message_deleted', handleMessageDeleted);
        }
    }, [channel, socket]);

    const fetchMedia = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/${channel._id}/media`, {
                headers: { 'x-auth-token': token }
            });

            const msgs = res.data;
            const images = [];
            const videos = [];
            const docs = [];

            msgs.forEach(item => {
                // Naive type check if fileType isn't robust
                const lowerUrl = item.url.toLowerCase();
                // Map backend 'type' or infer from URL
                // Backend sends: { _id, url, type, fileName, sender, createdAt }

                if (item.type.startsWith('image/') || lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
                    images.push(item);
                } else if (item.type.startsWith('video/') || lowerUrl.match(/\.(mp4|webm|mov|mkv)$/)) {
                    videos.push(item);
                } else {
                    docs.push(item);
                }
            });

            setMedia({ images, videos, docs });
        } catch (err) {
            console.error("Failed to fetch media", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) return;

        setIsDeleting(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/messages/bulk-delete`, {
                messageIds: Array.from(selectedItems),
                channelId: channel._id
            }, {
                headers: { 'x-auth-token': token }
            });

            // UI update handled by socket listener usually, but we can clear selection now
            setSelectedItems(new Set());
        } catch (err) {
            alert('Failed to delete items: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsDeleting(false);
        }
    };

    const renderMediaGrid = (items, type) => {
        if (items.length === 0) return <div className="text-center text-gray-500 py-10">No {type} found.</div>;

        return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {items.map(item => (
                    <div
                        key={item._id}
                        className={`relative group bg-gray-800 rounded-lg overflow-hidden border cursor-pointer transition-all ${selectedItems.has(item._id) ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-gray-700'}`}
                        onClick={() => {
                            // If in selection mode (at least one selected), toggle. Otherwise preview.
                            if (selectedItems.size > 0) {
                                toggleSelection(item._id);
                            } else {
                                setSelectedMedia({ src: item.url, type: item.type || (type === 'images' ? 'image' : type === 'videos' ? 'video' : 'file'), fileName: item.name });
                            }
                        }}
                    >
                        {/* Checkbox Overlay */}
                        <div className={`absolute top-2 left-2 z-10 ${selectedItems.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                            <input
                                type="checkbox"
                                checked={selectedItems.has(item._id)}
                                onChange={(e) => { e.stopPropagation(); toggleSelection(item._id); }}
                                className="w-5 h-5 rounded border-gray-500 text-purple-600 focus:ring-purple-500 bg-gray-900/80 cursor-pointer"
                            />
                        </div>
                        {type === 'images' && (
                            <img
                                src={item.url}
                                alt="media"
                                className="w-full h-32 object-cover transition-opacity hover:opacity-90"
                            />
                        )}
                        {type === 'videos' && (
                            <div className="relative w-full h-32 bg-black">
                                <video src={item.url} className="w-full h-32 object-cover pointer-events-none" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                                        <Film size={20} className="text-white" />
                                    </div>
                                </div>
                            </div>
                        )}
                        {type === 'docs' && (
                            <div className="h-32 flex flex-col items-center justify-center bg-gray-800 p-2 hover:bg-gray-750 transition-colors">
                                <FileText size={32} className="text-primary-400 mb-2" />
                                <span className="text-xs text-center text-gray-300 truncate w-full px-2">{item.name}</span>
                            </div>
                        )}

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                            <div className="text-xs text-white truncate mb-1 pointer-events-auto">By {item.sender}</div>
                            <div className="text-[10px] text-gray-400 flex items-center mb-2">
                                <Calendar size={10} className="mr-1" />
                                {new Date(item.createdAt).toLocaleDateString()}
                            </div>
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-white py-1 rounded text-xs gap-1 pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Download size={12} /> Download
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700 flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <FolderOpen /> Media History: #{channel.name}
                        {selectedItems.size > 0 && (
                            <span className="text-sm font-normal text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 ml-2">
                                {selectedItems.size} selected
                            </span>
                        )}
                    </h3>
                    <div className="flex items-center gap-2">
                        {selectedItems.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors mr-2 disabled:opacity-50"
                            >
                                <Trash2 size={14} /> {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
                    </div>
                </div>

                <div className="flex border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('images')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'images' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        <Image size={16} /> Images ({media.images.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('videos')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'videos' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        <Film size={16} /> Videos ({media.videos.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('docs')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'docs' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        <FileText size={16} /> Docs ({media.docs.length})
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div>
                    ) : (
                        renderMediaGrid(media[activeTab], activeTab)
                    )}
                </div>
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

const FolderOpenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" /></svg>
);
