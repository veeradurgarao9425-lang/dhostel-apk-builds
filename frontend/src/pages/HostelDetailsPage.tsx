import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  MapPin,
  Mail,
  Phone,
  ArrowLeft,
  DollarSign
} from 'lucide-react';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import toast from 'react-hot-toast';

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

interface Room {
  room_id: number;
  hostel_id: number;
  room_number: string;
  room_type_name: string;
  floor_number: number;
  occupied_beds: number;
  available_beds: number;
  rent_per_bed: number;
  is_available: boolean;
  amenities: string[];
}

interface Student {
  student_id: number;
  hostel_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  room_number: string;
  status: number;
  monthly_rent: number;
}

export const HostelDetailsPage: React.FC = () => {
  const { hostelId } = useParams<{ hostelId: string }>();
  const navigate = useNavigate();
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rooms' | 'students' | 'finances'>('rooms');

  useEffect(() => {
    fetchHostelData();
  }, [hostelId]);

  const fetchHostelData = async () => {
    try {
      setLoading(true);
      const id = parseInt(hostelId || '0');
      const [hostelsRes, roomsRes, studentsRes] = await Promise.all([
        api.get('/hostels'),
        api.get('/rooms', { params: { hostelId: id } }),
        api.get('/students', { params: { hostelId: id } })
      ]);

      const foundHostel = (hostelsRes.data.data || []).find((h: Hostel) => h.hostel_id === id);
      
      if (!foundHostel) {
        toast.error('Hostel not found');
        navigate('/hostels');
        return;
      }

      setHostel(foundHostel);
      setRooms((roomsRes.data.data || []).filter((r: Room) => Number(r.hostel_id) === id));
      setStudents((studentsRes.data.data || []).filter((s: Student) => Number(s.hostel_id) === id));
    } catch (error) {
      console.error('Failed to fetch hostel details:', error);
      toast.error('Failed to load hostel details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculations
  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    const occupiedBeds = rooms.reduce((sum, r) => sum + r.occupied_beds, 0);
    const availableBeds = rooms.reduce((sum, r) => sum + r.available_beds, 0);
    const totalBeds = occupiedBeds + availableBeds;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const totalRentRevenue = students.reduce((sum, s) => sum + (s.monthly_rent || 0), 0);

    return {
      totalRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      occupancyRate,
      totalRentRevenue
    };
  }, [rooms, students]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-600"></div>
      </div>
    );
  }

  if (!hostel) return null;

  return (
    <div className="space-y-6 w-full animate-fade-in pb-8">
      {/* Back button / Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <button
          onClick={() => navigate('/hostels')}
          className="flex items-center gap-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Hostels
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-800 dark:text-white">{hostel.hostel_name}</span>
      </div>

      {/* Hostel info banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500 via-teal-600 to-cyan-700 p-6 md:p-8 text-white shadow-md border border-cyan-400/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 backdrop-blur-md">
                ★ {hostel.hostel_type} Hostel
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-900/40 text-cyan-100 border border-cyan-400/30">
                Hostel ID: {hostel.hostel_id}
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {hostel.hostel_name}
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-cyan-100 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-300 flex-shrink-0" />
                <span className="truncate">{hostel.address}, {hostel.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-300 flex-shrink-0" />
                <span>Owner: <strong className="text-white">{hostel.owner_name || 'N/A'}</strong></span>
              </div>
              {hostel.contact_number && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-cyan-300 flex-shrink-0" />
                  <span>{hostel.contact_number}</span>
                </div>
              )}
              {hostel.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-cyan-300 flex-shrink-0" />
                  <span>{hostel.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 bg-cyan-950/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[280px]">
            <div className="text-center">
              <p className="text-[10px] text-cyan-200 uppercase tracking-wider font-bold">Rooms</p>
              <p className="text-xl font-extrabold mt-1">{stats.totalRooms}</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-[10px] text-cyan-200 uppercase tracking-wider font-bold">Occupied</p>
              <p className="text-xl font-extrabold mt-1">{stats.occupiedBeds}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-cyan-200 uppercase tracking-wider font-bold">Occupancy</p>
              <p className="text-xl font-extrabold mt-1">{stats.occupancyRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'rooms'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
          }`}
        >
          Rooms ({rooms.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'students'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
          }`}
        >
          Residents ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('finances')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'finances'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
          }`}
        >
          Financial Summary
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {activeTab === 'rooms' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <Card key={room.room_id} className="relative overflow-hidden group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold">
                        {room.room_number}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight">Floor {room.floor_number}</h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{room.room_type_name}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      room.available_beds > 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                        : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                    }`}>
                      {room.available_beds > 0 ? `${room.available_beds} Beds Left` : 'Full'}
                    </span>
                  </div>

                  <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                      <span>Rent per bed</span>
                      <span className="font-bold text-slate-850 dark:text-slate-200">{formatCurrency(room.rent_per_bed)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                      <span>Occupied Beds</span>
                      <span className="font-bold text-slate-850 dark:text-slate-200">{room.occupied_beds}</span>
                    </div>
                  </div>

                  {/* Amenities */}
                  {room.amenities && room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-4">
                      {room.amenities.map((amenity, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-[9px] rounded-md font-semibold text-slate-500 dark:text-slate-400">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-400">
                No rooms added for this hostel yet.
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-850/10 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Room</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Rent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-850/60 text-sm">
                  {students.length > 0 ? (
                    students.map((student) => (
                      <tr key={student.student_id} className="hover:bg-slate-50/20 dark:hover:bg-slate-850/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold">
                              {student.first_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                                {student.first_name} {student.last_name || ''}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">ID: {student.student_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            Room {student.room_number}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{student.phone}</p>
                          <p className="text-[10px] text-slate-500">{student.email || 'No email'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            student.status === 1
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                              : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                          }`}>
                            {student.status === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-850 dark:text-slate-100">
                          {formatCurrency(student.monthly_rent)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No students are currently residing in this hostel.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'finances' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <StatCard
                title="Total Active Rent Revenue"
                value={formatCurrency(stats.totalRentRevenue)}
                icon={DollarSign}
                color="cyan"
                statusText="Monthly Total Inflow"
              />
              <StatCard
                title="Total capacity occupancy"
                value={`${stats.occupiedBeds} Beds`}
                icon={Users}
                color="blue"
                statusText={`${stats.availableBeds} Available Beds`}
              />
              <StatCard
                title="Hostel Status Index"
                value={stats.occupancyRate > 75 ? 'Optimal' : 'Low Occupancy'}
                icon={Building2}
                color={stats.occupancyRate > 75 ? 'green' : 'yellow'}
                statusText={`${stats.occupancyRate}% Occupied`}
              />
            </div>
            
            <Card>
              <Card.Header>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Monthly Fee Collections</h3>
              </Card.Header>
              <Card.Body>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Aggregate billing details, including collections and pending rent invoices. The platform updates financial projections automatically based on occupant check-in logs.
                </p>
              </Card.Body>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
export default HostelDetailsPage;
