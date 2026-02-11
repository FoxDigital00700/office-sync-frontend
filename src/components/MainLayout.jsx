import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // Import useParams
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import NotificationToast from './NotificationToast';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

const MainLayout = () => {
    const { channelId } = useParams(); // Get channelId from URL
    const [activeChannel, setActiveChannel] = useState(null);
    const [notification, setNotification] = useState(null);
    const { socket } = useSocket();
    const [channels, setChannels] = useState([]);

    // ... (rest of code)

    const [allChannels, setAllChannels] = useState([]);

    // Effect to set active channel from URL
    useEffect(() => {
        if (channelId && allChannels.length > 0) {
            const channel = allChannels.find(c => c._id === channelId);
            if (channel) {
                setActiveChannel(channel);
            }
        }
    }, [channelId, allChannels]);

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (msg) => {
            // If message is NOT for active channel, show notification
            if (!activeChannel || msg.channel !== activeChannel._id) {
                // Find channel name
                const ch = allChannels.find(c => c._id === msg.channel);
                const channelName = ch ? ch.name : 'Channel';

                setNotification({
                    senderName: msg.sender?.name || 'User',
                    content: msg.content,
                    channelName: channelName,
                    channelId: msg.channel
                });
            }
        };

        socket.on('message', handleMessage);

        return () => {
            socket.off('message', handleMessage);
        };
    }, [socket, activeChannel, allChannels]);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100">
            <Sidebar
                onSelectChannel={setActiveChannel}
                onChannelsLoaded={setAllChannels}
                selectedChannelId={activeChannel?._id}
            />
            <ChatArea
                activeChannel={activeChannel}
                onChannelSelect={(channelId) => {
                    const channel = allChannels.find(c => c._id === channelId);
                    if (channel) setActiveChannel(channel);
                }}
            />
            <NotificationToast
                notification={notification}
                onClose={() => setNotification(null)}
                onClick={() => {
                    console.log('Notification Clicked:', notification);
                    if (notification?.channelId) {
                        const channel = allChannels.find(c => c._id === notification.channelId);
                        console.log('Found Channel for Notification:', channel);
                        if (channel) {
                            setActiveChannel(channel);
                        } else {
                            console.warn('Channel not found in allChannels:', notification.channelId);
                        }
                        setNotification(null);
                    }
                }}
            />
        </div>
    );
};

export default MainLayout;
