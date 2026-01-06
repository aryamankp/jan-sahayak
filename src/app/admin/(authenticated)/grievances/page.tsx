import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { AlertCircle, Eye, Clock, CheckCircle } from 'lucide-react';

interface Grievance {
    id: string;
    ticket_id: string;
    description: string;
    description_hi: string;
    status: string;
    status_hi: string;
    citizen_name: string;
    citizen_mobile: string;
    category_hi: string;
    assigned_department: string;
    assigned_department_hi: string;
    created_at: string;
    expected_resolution_date: string;
}

async function getGrievances() {
    const { data, error } = await supabase
        .from('grievances')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching grievances:', error);
        return [];
    }
    return data as Grievance[];
}

async function getGrievanceStats() {
    const { count: total } = await supabase.from('grievances').select('*', { count: 'exact', head: true });
    const { count: pending } = await supabase.from('grievances').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: inProgress } = await supabase.from('grievances').select('*', { count: 'exact', head: true }).eq('status', 'in_progress');
    const { count: resolved } = await supabase.from('grievances').select('*', { count: 'exact', head: true }).eq('status', 'resolved');

    return {
        total: total || 0,
        pending: pending || 0,
        inProgress: inProgress || 0,
        resolved: resolved || 0
    };
}

export default async function GrievancesPage() {
    const [grievances, stats] = await Promise.all([getGrievances(), getGrievanceStats()]);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Grievance Management</h1>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatCard title="Total Grievances" value={stats.total} color="bg-blue-500" />
                <StatCard title="Pending" value={stats.pending} color="bg-yellow-500" />
                <StatCard title="In Progress" value={stats.inProgress} color="bg-orange-500" />
                <StatCard title="Resolved" value={stats.resolved} color="bg-green-500" />
            </div>

            {/* Grievance Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 font-medium">Ticket ID</th>
                                <th className="px-6 py-3 font-medium">Citizen</th>
                                <th className="px-6 py-3 font-medium">Category</th>
                                <th className="px-6 py-3 font-medium">Department</th>
                                <th className="px-6 py-3 font-medium">Filed On</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {grievances.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                        <p>No grievances found</p>
                                    </td>
                                </tr>
                            ) : (
                                grievances.map((grievance) => (
                                    <tr key={grievance.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-blue-600">{grievance.ticket_id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{grievance.citizen_name || 'Anonymous'}</div>
                                            <div className="text-xs text-gray-500">{grievance.citizen_mobile || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{grievance.category_hi || 'General'}</td>
                                        <td className="px-6 py-4 text-gray-600">{grievance.assigned_department_hi || grievance.assigned_department || 'Unassigned'}</td>
                                        <td className="px-6 py-4 text-gray-600">{new Date(grievance.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={grievance.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="inline-flex items-center text-blue-600 hover:text-blue-900">
                                                <Eye className="w-4 h-4 mr-1" /> View
                                            </button>
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

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
    return (
        <div className="bg-white rounded-lg shadow p-4 flex items-center space-x-3">
            <div className={`${color} w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                {value}
            </div>
            <p className="text-gray-600 text-sm font-medium">{title}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
        pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
        in_progress: { bg: 'bg-orange-100', text: 'text-orange-800', icon: AlertCircle },
        resolved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${config.bg} ${config.text}`}>
            <Icon className="w-3 h-3" />
            {status.replace('_', ' ')}
        </span>
    );
}
