import React, { useState, useEffect } from 'react';
import { Building2, Mail, Phone, MapPin, Edit } from 'lucide-react';
import { Card } from '../components/ui/Card';
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
  contact_number: string;
  email: string;
  hostel_type: string;
  total_floors?: number;
  owner_id: number;
  owner_name?: string;
  admission_fee?: number;
  amenities?: string[];
  created_at?: string;
}

export const OwnerHostelsPage: React.FC = () => {
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [totalRooms, setTotalRooms] = useState<number>(0);
  const [activeStudents, setActiveStudents] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchHostel();
  }, []);

  useEffect(() => {
    if (hostel?.hostel_id) {
      fetchTotalRooms();
      fetchActiveStudents();
    }
  }, [hostel?.hostel_id]);

  const fetchHostel = async () => {
    setLoading(true);
    try {
      const response = await api.get('/hostels');
      const hostels = response.data.data || [];

      // Owner should only see their own hostel (filtered by backend)
      if (hostels.length > 0) {
        setHostel(hostels[0]);
      }
    } catch (error) {
      console.error('Failed to fetch hostel:', error);
      toast.error('Failed to load hostel details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalRooms = async () => {
    try {
      const response = await api.get(`/rooms?hostel_id=${hostel?.hostel_id}`);
      const rooms = response.data.data || [];
      setTotalRooms(rooms.length);
    } catch (error) {
      console.error('Failed to fetch rooms count:', error);
    }
  };

  const fetchActiveStudents = async () => {
    try {
      const response = await api.get(`/students?hostel_id=${hostel?.hostel_id}`);
      const students = response.data.data || [];
      // Count only active students
      const activeCount = students.filter((s: any) => s.status === 1).length;
      setActiveStudents(activeCount);
    } catch (error) {
      console.error('Failed to fetch students count:', error);
    }
  };

  const handleEditSuccess = () => {
    fetchHostel();
    fetchTotalRooms(); // Refresh rooms count after edit
    fetchActiveStudents(); // Refresh active students count after edit
    setIsEditModalOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Hostel</h1>
          <p className="text-sm text-gray-600 mt-1">View and manage your hostel information</p>
        </div>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
          <p className="mt-2 text-sm text-gray-600">Loading hostel details...</p>
        </div>
      </div>
    );
  }

  if (!hostel) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Hostel</h1>
          <p className="text-sm text-gray-600 mt-1">View and manage your hostel information</p>
        </div>
        <Card>
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">No hostel assigned</h3>
            <p className="text-xs text-gray-600">
              Please contact the admin to get a hostel assigned to your account.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Hostel</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View and manage your hostel property details</p>
        </div>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 shadow-sm shadow-cyan-500/20 transition-all font-semibold hover:scale-102 active:scale-98 text-sm"
        >
          <Edit className="h-4 w-4" />
          Edit Details
        </button>
      </div>

      {/* Hostel Details Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[2rem] shadow-sm relative overflow-hidden p-8">
        {/* Top Accent Gradient strip */}
        <div className={clsx(
          "absolute top-0 left-0 right-0 h-2",
          hostel.hostel_type === 'Boys' ? "bg-gradient-to-r from-blue-500 to-cyan-500" :
          hostel.hostel_type === 'Girls' ? "bg-gradient-to-r from-pink-500 to-rose-500" :
          "bg-gradient-to-r from-purple-500 to-indigo-500"
        )} />

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800/60 mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className={clsx(
              "h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg",
              hostel.hostel_type === 'Boys' ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/20" :
              hostel.hostel_type === 'Girls' ? "bg-gradient-to-br from-pink-500 to-rose-500 shadow-pink-500/20" :
              "bg-gradient-to-br from-purple-500 to-indigo-650 shadow-purple-500/20"
            )}>
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{hostel.hostel_name}</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider font-bold">Property ID: {hostel.hostel_id}</p>
            </div>
          </div>
          <span className={clsx(
            "px-4.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm align-self-start sm:align-self-auto",
            hostel.hostel_type === 'Boys' ? 'bg-blue-50 text-blue-700 border border-blue-105 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30' :
            hostel.hostel_type === 'Girls' ? 'bg-pink-50 text-pink-700 border border-pink-105 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-900/30' :
            'bg-purple-50 text-purple-700 border border-purple-105 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/30'
          )}>
            {hostel.hostel_type}
          </span>
        </div>

        {/* Details and Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Contact Details */}
          <div className="space-y-5 bg-slate-50/50 dark:bg-slate-800/20 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/40">
            <h3 className="text-sm font-bold text-slate-850 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800/40">Contact Information</h3>

            <div className="flex items-start gap-3.5">
              <div className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 flex items-center justify-center shadow-sm flex-shrink-0">
                <MapPin className="h-4.5 w-4.5 text-slate-450 dark:text-slate-405" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Address</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mt-0.5 leading-relaxed">
                  {hostel.address}, {hostel.city}
                  {hostel.state && `, ${hostel.state}`}
                  {hostel.pincode && ` - ${hostel.pincode}`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 flex items-center justify-center shadow-sm flex-shrink-0">
                <Mail className="h-4.5 w-4.5 text-slate-450 dark:text-slate-405" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mt-0.5">{hostel.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 flex items-center justify-center shadow-sm flex-shrink-0">
                <Phone className="h-4.5 w-4.5 text-slate-450 dark:text-slate-405" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Number</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mt-0.5">{hostel.contact_number}</p>
              </div>
            </div>
          </div>

          {/* Hostel Info Details */}
          <div className="space-y-5 bg-slate-50/50 dark:bg-slate-800/20 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/40">
            <h3 className="text-sm font-bold text-slate-855 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800/40">Property Breakdown</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Students</p>
                <p className="text-2xl font-black text-slate-850 dark:text-white mt-1">{activeStudents}</p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Rooms</p>
                <p className="text-2xl font-black text-slate-850 dark:text-white mt-1">{totalRooms}</p>
              </div>

              {hostel.total_floors && (
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Floors</p>
                  <p className="text-2xl font-black text-slate-850 dark:text-white mt-1">{hostel.total_floors}</p>
                </div>
              )}

              {hostel.admission_fee !== undefined && hostel.admission_fee !== null && (
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admission Fee</p>
                  <p className="text-2xl font-black text-slate-850 dark:text-white mt-1">
                    ₹{typeof hostel.admission_fee === 'string' ? Math.floor(parseFloat(hostel.admission_fee)) : Math.floor(hostel.admission_fee)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Amenities Section */}
        {hostel.amenities && hostel.amenities.length > 0 && (
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800/60">
            <h3 className="text-sm font-bold text-slate-850 dark:text-white uppercase tracking-wider mb-4">Available Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {hostel.amenities.map((amenity, index) => (
                <span
                  key={index}
                  className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-655 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold rounded-xl uppercase tracking-wider shadow-sm"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Hostel Modal */}
      {hostel && (
        <EditHostelModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          hostel={hostel}
          isOwner={true}
        />
      )}
    </div>
  );
};
