import { X } from 'lucide-react';
import { useEffect } from 'react';

const NotificationToast = ({ notification, onClose, onClick }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [notification, onClose]);

    if (!notification) return null;

    return (
        <div
            onClick={onClick}
            className="fixed bottom-4 right-4 glass rounded-2xl p-4 flex items-start space-x-3 max-w-sm z-50 animate-dust-in border-l-4 border-l-purple-500 cursor-pointer hover:bg-white/10 transition-colors"
        >
            <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-sm">New Message</h4>
                <p className="text-xs text-purple-600 font-semibold mb-1">
                    #{notification.channelName} • {notification.senderName}
                </p>
                <p className="text-sm text-gray-600 line-clamp-2">{notification.content}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
            </button>
        </div>
    );
};

export default NotificationToast;
