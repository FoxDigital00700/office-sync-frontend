import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { useState } from 'react';

export default function ImageModal({ src, alt, onClose }) {
    const [scale, setScale] = useState(1);

    const handleZoomIn = (e) => {
        e.stopPropagation();
        setScale(prev => Math.min(prev + 0.5, 3));
    };

    const handleZoomOut = (e) => {
        e.stopPropagation();
        setScale(prev => Math.max(prev - 0.5, 1));
    };

    if (!src) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in"
            onClick={onClose}
        >
            {/* Toolbar */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-[210]">
                <a
                    href={src}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    title="Download"
                >
                    <Download size={20} />
                </a>
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
                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                    title="Close"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Image Container */}
            <div
                className="relative w-full h-full flex items-center justify-center p-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()} // Prevent close on image click (unless checking for backdrop)
            >
                <img
                    src={src}
                    alt={alt || "Full screen view"}
                    className="max-w-full max-h-full object-contain transition-transform duration-300"
                    style={{ transform: `scale(${scale})` }}
                />
            </div>
        </div>
    );
}
