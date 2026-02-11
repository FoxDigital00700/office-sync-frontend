import { X, ZoomIn, ZoomOut, Download, FileText, Music, Video, ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function MediaModal({ src, type = 'image', fileName = 'Media', onClose }) {
    const [scale, setScale] = useState(1);
    const videoRef = useRef(null);
    const audioRef = useRef(null);

    // Reset scale on open
    useEffect(() => {
        setScale(1);
    }, [src]);

    const handleZoomIn = (e) => {
        e.stopPropagation();
        setScale(prev => Math.min(prev + 0.5, 3));
    };

    const handleZoomOut = (e) => {
        e.stopPropagation();
        setScale(prev => Math.max(prev - 0.5, 1));
    };

    if (!src) return null;

    const isImage = type.startsWith('image/') || src.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isVideo = type.startsWith('video/') || src.match(/\.(mp4|webm|mov|mkv)$/i);
    const isAudio = type.startsWith('audio/') || src.match(/\.(mp3|wav|ogg|m4a)$/i);
    const isPDF = type === 'application/pdf' || src.match(/\.pdf$/i);

    const renderContent = () => {
        if (isImage) {
            return (
                <img
                    src={src}
                    alt={fileName}
                    className="max-w-full max-h-full object-contain transition-transform duration-300"
                    style={{ transform: `scale(${scale})` }}
                    onClick={(e) => e.stopPropagation()}
                />
            );
        }
        if (isVideo) {
            return (
                <video
                    ref={videoRef}
                    src={src}
                    controls
                    autoPlay
                    className="max-w-full max-h-full object-contain"
                    onClick={(e) => e.stopPropagation()}
                />
            );
        }
        if (isAudio) {
            return (
                <div className="bg-gray-800 p-8 rounded-xl flex flex-col items-center gap-4 text-white min-w-[300px]" onClick={(e) => e.stopPropagation()}>
                    <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center animate-pulse">
                        <Music size={40} />
                    </div>
                    <h3 className="text-lg font-medium text-center break-all">{fileName}</h3>
                    <audio
                        ref={audioRef}
                        src={src}
                        controls
                        autoPlay
                        className="w-full"
                    />
                </div>
            );
        }
        if (isPDF) {
            return (
                <iframe
                    src={src}
                    className="w-full h-full bg-white rounded-lg"
                    title={fileName}
                    onClick={(e) => e.stopPropagation()}
                />
            );
        }

        // Default / Unknown
        return (
            <div className="bg-gray-800 p-8 rounded-xl flex flex-col items-center gap-4 text-white" onClick={(e) => e.stopPropagation()}>
                <FileText size={64} className="text-gray-400" />
                <h3 className="text-lg font-medium text-center break-all">{fileName}</h3>
                <p className="text-sm text-gray-400">Preview not available</p>
                <a
                    href={src}
                    download={fileName}
                    className="mt-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Download size={18} /> Download File
                </a>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in p-4 md:p-8"
            onClick={onClose}
        >
            {/* Toolbar */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-[210]">
                <a
                    href={src}
                    download={fileName}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    title="Download"
                >
                    <Download size={20} />
                </a>

                {isImage && (
                    <>
                        <button
                            onClick={handleZoomOut}
                            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut size={20} />
                        </button>
                        <button
                            onClick={handleZoomIn}
                            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn size={20} />
                        </button>
                    </>
                )}

                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                    title="Close"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content Container */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {renderContent()}
            </div>
        </div>
    );
}
