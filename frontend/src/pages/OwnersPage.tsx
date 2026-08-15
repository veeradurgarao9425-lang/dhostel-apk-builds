import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Users, Plus, Mail, Phone, Search, Trash2, X } from 'lucide-react';

import { AddOwnerModal } from '../components/modals/AddOwnerModal';
import { EditOwnerModal } from '../components/modals/EditOwnerModal';
import { DeleteConfirmModal } from '../components/modals/DeleteConfirmModal';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Owner {
  user_id: number;
  full_name: string;
  email?: string;
  phone: string;
  created_at?: string;
}

export const OwnersPage: React.FC = () => {
  const location = useLocation();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [filteredOwners, setFilteredOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    ownerId: number;
    ownerName: string;
  }>({
    isOpen: false,
    ownerId: 0,
    ownerName: '',
  });

  useEffect(() => {
    fetchOwners();
  }, []);

  // Check if we should open the Add Owner modal from navigation state
  useEffect(() => {
    if (location.state?.openAddModal) {
      setIsAddModalOpen(true);
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = owners.filter(owner =>
        owner.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (owner.email && owner.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        owner.phone.includes(searchTerm)
      );
      setFilteredOwners(filtered);
    } else {
      setFilteredOwners(owners);
    }
  }, [searchTerm, owners]);

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/owners');
      setOwners(response.data.data || []);
      setFilteredOwners(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch owners:', error);
      toast.error('Failed to load owners');
      // Dummy data for development
      const dummyOwners = [
        { user_id: 2, full_name: 'Mahendra Reddy', email: 'mahendra@gmail.com', phone: '9876543210' },
        { user_id: 3, full_name: 'Priya Sharma', email: 'priya@gmail.com', phone: '9876543211' },
        { user_id: 4, full_name: 'Rajesh Kumar', email: 'rajesh@gmail.com', phone: '9876543212' },
      ];
      setOwners(dummyOwners);
      setFilteredOwners(dummyOwners);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = () => {
    fetchOwners();
    setIsAddModalOpen(false);
  };

  const handleDeleteClick = (userId: number, fullName: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      ownerId: userId,
      ownerName: fullName,
    });
  };

  const handleDeleteConfirm = async () => {
    const { ownerId } = deleteConfirmModal;
    setDeletingId(ownerId);
    try {
      await api.delete(`/users/owners/${ownerId}`);
      toast.success('Owner deleted successfully!');
      fetchOwners();
      setDeleteConfirmModal({ isOpen: false, ownerId: 0, ownerName: '' });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete owner';
      toast.error(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmModal({ isOpen: false, ownerId: 0, ownerName: '' });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Hostel Owners</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Manage hostel owners and their system access</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 shadow-sm shadow-cyan-500/20 transition-all font-semibold hover:scale-102 active:scale-98"
        >
          <Plus className="h-5 w-5" />
          Add New Owner
        </button>
      </div>

      {/* Search and Owner Count */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search owners by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto justify-center">
          <Users className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white">{filteredOwners.length}</span> Owner{filteredOwners.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Owners Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-4 border-cyan-600"></div>
        </div>
      ) : filteredOwners.length === 0 ? (
        <div className="text-center py-20 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {searchTerm ? 'No owners found' : 'No owners yet'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            {searchTerm
              ? 'Try adjusting your search criteria'
              : 'Get started by adding your first hostel owner to manage properties'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 shadow-md shadow-cyan-500/20 transition-all font-semibold"
            >
              <Plus className="h-5 w-5" />
              Add First Owner
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOwners.map((owner) => (
            <div 
              key={owner.user_id} 
              className="group relative bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div>
                {/* Header Row: Icon/Avatar, Name & ID, Active Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-sm text-white font-extrabold text-lg flex-shrink-0 transition-transform group-hover:scale-105 duration-300">
                      {owner.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight tracking-tight">
                        {owner.full_name}
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wider">
                        Owner ID: {owner.user_id}
                      </p>
                    </div>
                  </div>

                  {/* Status badge with green dot */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>

                {/* Sub-badge: Role Type */}
                <div className="mb-4">
                  <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/10 text-[10px] font-bold uppercase tracking-wider">
                    Platform Owner
                  </span>
                </div>

                {/* Metadata List with icons */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>{owner.phone}</span>
                  </div>
                  {owner.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{owner.email}</span>
                    </div>
                  )}
                </div>

                {/* Highlighted Muted Accent Pill (Corresponding to Salary in image) */}
                <div className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100/20 inline-block self-start mb-1">
                  Contact: {owner.phone}
                </div>
              </div>

              {/* Card Footer: Left ID, Right Action Link */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  O-ID: #{owner.user_id}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteClick(owner.user_id, owner.full_name)}
                    disabled={deletingId === owner.user_id}
                    className="p-1.5 text-rose-500 hover:text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all disabled:opacity-50"
                    title="Delete Owner"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-slate-200 dark:text-slate-800 mx-1">|</span>
                  <button
                    onClick={() => {
                      setSelectedOwner(owner);
                      setIsEditModalOpen(true);
                    }}
                    className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-bold text-xs flex items-center gap-0.5 transition-all hover:translate-x-0.5"
                  >
                    Update Owner &gt;
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals remain structurally the same, but should adopt the global CSS updates naturally */}
      <AddOwnerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {selectedOwner && (
        <EditOwnerModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedOwner(null);
          }}
          onSuccess={handleAddSuccess}
          owner={selectedOwner}
        />
      )}

      <DeleteConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Owner"
        message={`Are you sure you want to delete ${deleteConfirmModal.ownerName}?`}
        itemName={deleteConfirmModal.ownerName}
        loading={deletingId === deleteConfirmModal.ownerId}
      />
    </div>
  );
};
