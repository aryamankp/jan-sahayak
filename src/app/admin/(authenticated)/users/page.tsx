import { supabase } from '@/lib/supabase/client';
import { Users, UserPlus, Shield, Clock, CheckCircle } from 'lucide-react';

interface Citizen {
    id: string;
    name: string;
    name_hi: string;
    phone_number: string;
    jan_aadhaar_id: string;
    is_verified: boolean;
    created_at: string;
    last_login: string;
}

async function getCitizens() {
    const { data, error } = await supabase
        .from('citizens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Error fetching citizens:', error);
        return [];
    }
    return data as Citizen[];
}

async function getCitizenStats() {
    const { count: total } = await supabase.from('citizens').select('*', { count: 'exact', head: true });
    const { count: verified } = await supabase.from('citizens').select('*', { count: 'exact', head: true }).eq('is_verified', true);
    const { count: sessions } = await supabase.from('citizen_sessions').select('*', { count: 'exact', head: true });
    const { count: activeSessions } = await supabase.from('citizen_sessions').select('*', { count: 'exact', head: true }).eq('is_active', true);

    return {
        total: total || 0,
        verified: verified || 0,
        totalSessions: sessions || 0,
        activeSessions: activeSessions || 0
    };
}

export default async function AdminUsersPage() {
    const [citizens, stats] = await Promise.all([getCitizens(), getCitizenStats()]);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Total Citizens"
                    value={stats.total}
                    icon={Users}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Verified"
                    value={stats.verified}
                    icon={CheckCircle}
                    color="bg-green-500"
                />
                <StatCard
                    title="Total Sessions"
                    value={stats.totalSessions}
                    icon={Clock}
                    color="bg-purple-500"
                />
                <StatCard
                    title="Active Sessions"
                    value={stats.activeSessions}
                    icon={Shield}
                    color="bg-orange-500"
                />
            </div>

            {/* Citizens Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Registered Citizens</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 font-medium">Name</th>
                                <th className="px-6 py-3 font-medium">Jan Aadhaar</th>
                                <th className="px-6 py-3 font-medium">Phone</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Registered</th>
                                <th className="px-6 py-3 font-medium">Last Login</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {citizens.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                        <p>No citizens registered yet</p>
                                    </td>
                                </tr>
                            ) : (
                                citizens.map((citizen) => (
                                    <tr key={citizen.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{citizen.name || 'Unknown'}</div>
                                            {citizen.name_hi && (
                                                <div className="text-xs text-gray-500">{citizen.name_hi}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-blue-600">
                                            {citizen.jan_aadhaar_id || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {citizen.phone_number || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {citizen.is_verified ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Verified
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    <Clock className="w-3 h-3" />
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                            {citizen.created_at ? new Date(citizen.created_at).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                            {citizen.last_login ? new Date(citizen.last_login).toLocaleDateString() : 'Never'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
    return (
        <div className="bg-white rounded-lg shadow p-5 flex items-center space-x-4">
            <div className={`${color} w-12 h-12 rounded-full flex items-center justify-center text-white`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-gray-500 text-sm font-medium">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}
