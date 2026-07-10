import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Phone, Search, MapPin, Edit, Trash2, X } from 'lucide-react';
import { AddHostelModal } from '../components/modals/AddHostelModal';
import { EditHostelModal } from '../components/modals/EditHostelModal';
import api from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Hostel {
  hostel_id: number;
  hostel_name: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  hostel_type: string;
  owner_id: number;
  owner_name?: string;
  contact_number?: string;
  email?: string;
  amenities?: string[];
  created_at?: string;
  subscription_status?: string;
  trial_end_date?: string;
  subscription_end_date?: string;
}

export const HostelsPage: React.FC = () => {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [filteredHostels, setFilteredHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = hostels.filter(hostel =>
        hostel.hostel_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hostel.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (hostel.email && hostel.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (hostel.contact_number && hostel.contact_number.includes(searchTerm))
      );
      setFilteredHostels(filtered);
    } else {
      setFilteredHostels(hostels);
    }
  }, [searchTerm, hostels]);

  const fetchHostels = async () => {
    setLoading(true);
    try {
      const response = await api.get('/hostels');
      setHostels(response.data.data || []);
      setFilteredHostels(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch hostels:', error);
      toast.error('Failed to load hostels');
      // Dummy data for development
      const dummyHostels = [
        {
          hostel_id: 1,
          hostel_name: 'Sunrise Boys Hostel',
          address: 'Gachibowli',
          city: 'Hyderabad',
          state: 'Telangana',
          hostel_type: 'Boys',
          owner_id: 2,
          owner_name: 'Mahendra Reddy'
        },
        {
          hostel_id: 2,
          hostel_name: 'GreenView Girls Hostel',
          address: 'Kukatpally',
          city: 'Hyderabad',
          state: 'Telangana',
          hostel_type: 'Girls',
          owner_id: 3,
          owner_name: 'Priya Sharma'
        },
      ];
      setHostels(dummyHostels);
      setFilteredHostels(dummyHostels);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = () => {
    fetchHostels();
    setIsAddModalOpen(false);
  };

  const handleDelete = async (hostelId: number, hostelName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${hostelName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(hostelId);
    try {
      await api.delete(`/hostels/${hostelId}`);
      toast.success('Hostel deleted successfully!');
      fetchHostels();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete hostel';
      toast.error(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Hostels</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Manage properties and their details</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 shadow-sm shadow-cyan-500/20 transition-all font-semibold hover:scale-102 active:scale-98"
        >
          <Plus className="h-5 w-5" />
          Add New Hostel
        </button>
      </div>

      {/* Search and Hostel Count */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search hostels by name, city, or email..."
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
          <Building2 className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white">{filteredHostels.length}</span> Hostel{filteredHostels.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Hostels Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-4 border-cyan-600"></div>
        </div>
      ) : filteredHostels.length === 0 ? (
        <div className="text-center py-20 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {searchTerm ? 'No hostels found' : 'No hostels yet'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            {searchTerm
              ? 'Try adjusting your search criteria'
              : 'Get started by adding your first hostel property'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 shadow-md shadow-cyan-500/20 transition-all font-semibold"
            >
              <Plus className="h-5 w-5" />
              Add First Hostel
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHostels.map((hostel) => (
            <div 
              key={hostel.hostel_id} 
              className="group relative bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div>
                {/* Header Row: Icon, Title & Subtitle, Status Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Icon container inside soft colored gradient background */}
                    <div className={clsx(
                      "h-11 w-11 rounded-2xl flex items-center justify-center shadow-sm text-white flex-shrink-0 transition-transform group-hover:scale-105 duration-300",
                      hostel.hostel_type === 'Boys' ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/10" :
                      hostel.hostel_type === 'Girls' ? "bg-gradient-to-br from-pink-500 to-rose-500 shadow-pink-500/10" :
                      "bg-gradient-to-br from-purple-500 to-indigo-650 shadow-purple-500/10"
                    )}>
                      <Building2 className="h-5.5 w-5.5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight tracking-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {hostel.hostel_name}
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wider">
                        {hostel.city}, {hostel.state || 'India'}
                      </p>
                    </div>
                  </div>

                  {/* Status Pill Badge with colored leading dot */}
                  <span className={clsx(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    hostel.hostel_type === 'Boys' ? 'bg-blue-50/50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/20' :
                    hostel.hostel_type === 'Girls' ? 'bg-pink-50/50 text-pink-700 border-pink-100 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900/20' :
                    'bg-purple-50/50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/20'
                  )}>
                    <span className={clsx(
                      "h-1.5 w-1.5 rounded-full",
                      hostel.hostel_type === 'Boys' ? 'bg-blue-500' :
                      hostel.hostel_type === 'Girls' ? 'bg-pink-500' :
                      'bg-purple-500'
                    )} />
                    {hostel.hostel_type}
                  </span>
                </div>

                {/* Sub-badge: Hostel Type Pill & Subscription */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="inline-flex px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-100/10 text-[10px] font-bold uppercase tracking-wider">
                    {hostel.hostel_type} Hostel
                  </span>
                  {hostel.subscription_status && (
                    <span className={clsx(
                      "inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider",
                      hostel.subscription_status === 'Active' ? 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 border-green-100/20' :
                      hostel.subscription_status === 'Trial' ? 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400 border-yellow-100/20' :
                      'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-100/20'
                    )}>
                      {hostel.subscription_status}
                    </span>
                  )}
                </div>

                {/* Metadata List with small icons */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate leading-relaxed">{hostel.address}, {hostel.city}</span>
                  </div>
                  {hostel.contact_number && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span>{hostel.contact_number}</span>
                    </div>
                  )}
                </div>

                {/* Highlighted Muted Accent Pill (Corresponding to Salary in image) */}
                <div className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100/20 inline-block self-start mb-1">
                  Owner: {hostel.owner_name || 'System Unassigned'}
                </div>
              </div>

              {/* Card Footer: Left aligned ID, Right aligned actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  H-ID: #{hostel.hostel_id}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedHostel(hostel);
                      setIsEditModalOpen(true);
                    }}
                    className="p-1.5 text-slate-450 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                    title="Edit Hostel"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(hostel.hostel_id, hostel.hostel_name)}
                    disabled={deletingId === hostel.hostel_id}
                    className="p-1.5 text-rose-500 hover:text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all disabled:opacity-50"
                    title="Delete Hostel"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-slate-200 dark:text-slate-800 mx-1">|</span>
                  <button
                    onClick={() => navigate(`/hostels/${hostel.hostel_id}`)}
                    className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-bold text-xs flex items-center gap-0.5 transition-all hover:translate-x-0.5"
                  >
                    View Details &gt;
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AddHostelModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {selectedHostel && (
        <EditHostelModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedHostel(null);
          }}
          onSuccess={handleAddSuccess}
          hostel={selectedHostel}
        />
      )}
    </div>
  );
};
