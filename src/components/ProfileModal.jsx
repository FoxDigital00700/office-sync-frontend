import { useState, useEffect } from 'react';
import { X, User, Briefcase, FileText } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

import { API_URL } from '../config';

export default function ProfileModal({ isOpen, onClose, user, isEditable }) {
    const { user: currentUser } = useAuth(); // To update context if editing self
    const [formData, setFormData] = useState({
        name: '',
        designation: '',
        description: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                designation: user.designation || '',
                description: user.description || ''
            });
        }
    }, [user, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/auth/profile`, formData, {
                headers: { 'x-auth-token': token }
            });
            alert('Profile Updated');
            onClose();
            // Force reload to update context/sidebar (Simple fix for now)
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Failed to update profile');
        }
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-primary-700 p-4 flex justify-between items-center">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <User size={20} />
                        {isEditable ? 'Edit Profile' : 'User Profile'}
                    </h2>
                    <button onClick={onClose} className="text-primary-200 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Avatar Circle */}
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-3xl font-bold ring-4 ring-primary-50">
                            {formData.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                    </div>

                    {isEditable ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Display Name</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Designation</label>
                                <div className="relative">
                                    <Briefcase size={16} className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                        placeholder="e.g. Senior Developer"
                                        value={formData.designation}
                                        onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                                <div className="relative">
                                    <FileText size={16} className="absolute left-3 top-3 text-gray-400" />
                                    <textarea
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none h-24"
                                        placeholder="Tell us about your work..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded transition-colors shadow-md mt-4"
                            >
                                Save Changes
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-gray-800">{formData.name}</h3>
                                {formData.designation && (
                                    <p className="text-primary-600 font-medium flex items-center justify-center gap-1 mt-1">
                                        <Briefcase size={14} /> {formData.designation}
                                    </p>
                                )}
                                <span className={`inline-block px-2 py-0.5 rounded text-xs mt-2 ${user.role.includes('Admin') ? 'bg-red-100 text-red-700' :
                                    user.role === 'Manager' ? 'bg-purple-100 text-purple-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>
                                    {user.role}
                                </span>
                            </div>

                            {/* Promote / Demote Actions (Designation Based) */}
                            {!isEditable && currentUser && (currentUser.role?.includes('Admin') || currentUser.designation === 'Tech Lead') && !user.role?.includes('Admin') && (
                                <div className="flex justify-center gap-2">
                                    {user.designation !== 'Tech Lead' && (
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm(`Promote ${user.name} to Tech Lead?`)) return;
                                                try {
                                                    const token = localStorage.getItem('token');
                                                    await axios.put(`${API_URL}/api/auth/users/${user._id}/role`,
                                                        { designation: 'Tech Lead' },
                                                        { headers: { 'x-auth-token': token } }
                                                    );
                                                    alert('User Promoted to Tech Lead');
                                                    window.location.reload();
                                                } catch (err) {
                                                    console.error(err);
                                                    alert(err.response?.data?.message || 'Failed to promote');
                                                }
                                            }}
                                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1.5 px-3 rounded shadow transition-colors"
                                        >
                                            Promote to Tech Lead
                                        </button>
                                    )}
                                    {user.designation === 'Tech Lead' && (
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm(`Demote ${user.name} to Employee?`)) return;
                                                try {
                                                    const token = localStorage.getItem('token');
                                                    await axios.put(`${API_URL}/api/auth/users/${user._id}/role`,
                                                        { designation: 'Employee' },
                                                        { headers: { 'x-auth-token': token } }
                                                    );
                                                    alert('User Demoted to Employee');
                                                    window.location.reload();
                                                } catch (err) {
                                                    console.error(err);
                                                    alert(err.response?.data?.message || 'Failed to demote');
                                                }
                                            }}
                                            className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1.5 px-3 rounded shadow transition-colors"
                                        >
                                            Demote to Employee
                                        </button>
                                    )}
                                </div>
                            )}

                            {formData.description && (
                                <div className="bg-gray-50 p-4 rounded border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">About</h4>
                                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                                        {formData.description}
                                    </p>
                                </div>
                            )}

                            {!formData.description && !formData.designation && (
                                <p className="text-center text-gray-400 italic text-sm">No additional profile details.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
