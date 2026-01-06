import { supabaseAdmin } from '@/lib/supabase/admin';
import { FileText, CheckCircle, XCircle, Clock, AlertCircle, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

async function getStats() {
    // Application counts
    const { count: total } = await supabaseAdmin.from('applications').select('*', { count: 'exact', head: true });
    const { count: pending } = await supabaseAdmin.from('applications').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'in_process']);
    const { count: approved } = await supabaseAdmin.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    const { count: rejected } = await supabaseAdmin.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'rejected');

    // Grievance counts
    const { count: totalGrievances } = await supabaseAdmin.from('grievances').select('*', { count: 'exact', head: true });
    const { count: pendingGrievances } = await supabaseAdmin.from('grievances').select('*', { count: 'exact', head: true }).eq('status', 'pending');

    // Today's activity
    const today = new Date().toISOString().split('T')[0];
    const { count: todayApps } = await supabaseAdmin.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', today);
    const { count: todaySessions } = await supabaseAdmin.from('citizen_sessions').select('*', { count: 'exact', head: true }).gte('created_at', today);

    // Scheme count
    const { count: activeSchemes } = await supabaseAdmin.from('schemes').select('*', { count: 'exact', head: true }).eq('is_active', true);

    // Fetch recent applications
    const { data: recentApps } = await supabaseAdmin
        .from('applications')
        .select('*, services(name_en)')
        .order('created_at', { ascending: false })
        .limit(5);

    // Fetch recent grievances
    const { data: recentGrievances } = await supabaseAdmin
        .from('grievances')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    return {
        total: total || 0,
        pending: pending || 0,
        approved: approved || 0,
        rejected: rejected || 0,
        totalGrievances: totalGrievances || 0,
        pendingGrievances: pendingGrievances || 0,
        todayApps: todayApps || 0,
        todaySessions: todaySessions || 0,
        activeSchemes: activeSchemes || 0,
        recentApps: recentApps || [],
        recentGrievances: recentGrievances || []
    };
}

export default async function AdminDashboard() {
    const stats = await getStats();

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Dashboard Overview</h1>

            {/* Today's Activity */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 mb-8 text-white">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5" />
                    <h2 className="font-semibold">Today&apos;s Activity</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-blue-200 text-sm">New Applications</p>
                        <p className="text-3xl font-bold">{stats.todayApps}</p>
                    </div>
                    <div>
                        <p className="text-blue-200 text-sm">Active Sessions</p>
                        <p className="text-3xl font-bold">{stats.todaySessions}</p>
                    </div>
                    <div>
                        <p className="text-blue-200 text-sm">Pending Grievances</p>
                        <p className="text-3xl font-bold">{stats.pendingGrievances}</p>
                    </div>
                    <div>
                        <p className="text-blue-200 text-sm">Active Schemes</p>
                        <p className="text-3xl font-bold">{stats.activeSchemes}</p>
                    </div>
                </div>
            </div>

            {/* Application Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Applications" value={stats.total} icon={FileText} color="bg-blue-500" />
                <StatCard title="Pending Review" value={stats.pending} icon={Clock} color="bg-yellow-500" />
                <StatCard title="Approved" value={stats.approved} icon={CheckCircle} color="bg-green-500" />
                <StatCard title="Rejected" value={stats.rejected} icon={XCircle} color="bg-red-500" />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Applications */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800">Recent Applications</h3>
                        <Link href="/admin/applications" className="text-sm text-blue-600 hover:underline">View All</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 font-medium">ID</th>
                                    <th className="px-6 py-3 font-medium">Service</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {stats.recentApps.map((app) => (
                                    <tr key={app.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{app.submission_id}</td>
                                        <td className="px-6 py-4 text-gray-600">{app.services?.name_en || 'Unknown'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${app.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'}`}>
                                                {app.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Grievances */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800">Recent Grievances</h3>
                        <Link href="/admin/grievances" className="text-sm text-blue-600 hover:underline">View All</Link>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {stats.recentGrievances.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p>No grievances filed yet</p>
                            </div>
                        ) : (
                            stats.recentGrievances.map((g: any) => (
                                <div key={g.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-900">{g.ticket_id}</p>
                                            <p className="text-sm text-gray-600 line-clamp-1">{g.description || g.description_hi}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${g.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {g.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color }: any) {
    return (
        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
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
