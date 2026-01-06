import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { Eye } from 'lucide-react';

export default async function ApplicationsPage() {

    // Fetch all applications
    const { data: applicationsRaw } = await supabase
        .from('applications')
        .select('*, services(name_en), citizens(name, phone_number)')
        .order('created_at', { ascending: false })
        .limit(50); // Pagination needed in real app

    const applications = applicationsRaw as any[];

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Applications</h1>
                <div className="flex space-x-2">
                    {/* Add filters here later */}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 font-medium">Submission ID</th>
                                <th className="px-6 py-3 font-medium">Citizen</th>
                                <th className="px-6 py-3 font-medium">Service</th>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {applications?.map((app) => (
                                <tr key={app.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-blue-600">{app.submission_id}</td>
                                    <td className="px-6 py-4 text-gray-900">
                                        <div className="font-medium">{app.citizens?.name || 'Unknown'}</div>
                                        <div className="text-xs text-gray-500">{app.citizens?.phone_number || app.jan_aadhaar_id}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{app.services?.name_en}</td>
                                    <td className="px-6 py-4 text-gray-600">{new Date(app.created_at || '').toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                            ${app.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'}`}>
                                            {app.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/admin/applications/${app.id}`}
                                            className="inline-flex items-center text-blue-600 hover:text-blue-900"
                                        >
                                            <Eye className="w-4 h-4 mr-1" /> View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
