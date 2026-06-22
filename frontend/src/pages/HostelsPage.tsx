import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Mail, Phone, Search, MapPin, Edit, Trash2, X, Star } from 'lucide-react';
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredHostels.map((hostel) => (
            <div 
              key={hostel.hostel_id} 
              className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
            >
              {/* Colored Card Accent Top Bar */}
              <div className={clsx(
                "absolute top-0 left-0 right-0 h-1.5",
                hostel.hostel_type === 'Boys' ? "bg-gradient-to-r from-blue-500 to-cyan-500" :
                hostel.hostel_type === 'Girls' ? "bg-gradient-to-r from-pink-500 to-rose-500" :
                "bg-gradient-to-r from-purple-500 to-indigo-500"
              )} />

              <div>
                {/* Title and Badge Row */}
                <div className="flex items-start justify-between mb-5 pt-2">
                  <div className="flex items-center gap-3.5">
                    <div className={clsx(
                      "h-12 w-12 rounded-2xl flex items-center justify-center shadow-md text-white transform transition-transform group-hover:scale-105 duration-300",
                      hostel.hostel_type === 'Boys' ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/20" :
                      hostel.hostel_type === 'Girls' ? "bg-gradient-to-br from-pink-500 to-rose-500 shadow-pink-500/20" :
                      "bg-gradient-to-br from-purple-500 to-indigo-650 shadow-purple-500/20"
                    )}>
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug tracking-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {hostel.hostel_name}
                      </h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID: {hostel.hostel_id}</p>
                      </div>
                    </div>
                  </div>

                  <span className={clsx(
                    "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm",
                    hostel.hostel_type === 'Boys' ? 'bg-blue-50 text-blue-700 border border-blue-105 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30' :
                    hostel.hostel_type === 'Girls' ? 'bg-pink-50 text-pink-700 border border-pink-105 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-900/30' :
                    'bg-purple-50 text-purple-700 border border-purple-105 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/30'
                  )}>
                    {hostel.hostel_type}
                  </span>
                </div>

                {/* Details Section */}
                <div className="space-y-2.5 mb-5 bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                  <div className="flex items-start gap-2.5 text-xs text-slate-650 dark:text-slate-350">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="font-medium leading-relaxed">
                      {hostel.address}, {hostel.city}
                      {hostel.state && `, ${hostel.state}`}
                      {hostel.pincode && ` - ${hostel.pincode}`}
                    </span>
                  </div>
                  {hostel.email && (
                    <div className="flex items-center gap-2.5 text-xs text-slate-650 dark:text-slate-350">
                      <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate font-medium">{hostel.email}</span>
                    </div>
                  )}
                  {hostel.contact_number && (
                    <div className="flex items-center gap-2.5 text-xs text-slate-650 dark:text-slate-350">
                      <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium">{hostel.contact_number}</span>
                    </div>
                  )}
                </div>
                
                {hostel.owner_name && (
                  <div className="flex items-center justify-between text-xs px-1 pb-4 border-b border-slate-100 dark:border-slate-800/40 mb-4">
                    <span className="text-slate-450 font-medium">Assigned Owner</span>
                    <span className="font-bold text-slate-800 dark:text-white">{hostel.owner_name}</span>
                  </div>
                )}

                {/* Amenities chips */}
                {hostel.amenities && hostel.amenities.length > 0 && (
                  <div className="pb-2">
                    <div className="flex flex-wrap gap-1.5">
                      {hostel.amenities.slice(0, 3).map((amenity, index) => (
                        <span
                          key={index}
                          className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50 text-[10px] font-bold rounded-lg uppercase tracking-wider"
                        >
                          {amenity}
                        </span>
                      ))}
                      {hostel.amenities.length > 3 && (
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-450 text-[10px] font-bold rounded-lg">
                          +{hostel.amenities.length - 3} More
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/40">
                <button
                  onClick={() => navigate(`/hostels/${hostel.hostel_id}`)}
                  className="mr-auto flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/20 hover:bg-cyan-100/50 dark:hover:bg-cyan-950/40 rounded-xl transition-all"
                >
                  Details
                </button>
                
                <button
                  onClick={() => handleDelete(hostel.hostel_id, hostel.hostel_name)}
                  disabled={deletingId === hostel.hostel_id}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 rounded-xl transition-all disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingId === hostel.hostel_id ? '...' : 'Delete'}
                </button>
                <button
                  onClick={() => {
                    setSelectedHostel(hostel);
                    setIsEditModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-850 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 rounded-xl transition-all shadow-sm shadow-slate-200 dark:shadow-none"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </button>
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
