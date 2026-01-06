import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import ActionButtons from './action-buttons'; // Client component

export default async function ApplicationDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;

    // Fetch Application with related data
    const { data: appRaw, error } = await supabase
        .from('applications')
        .select(`
            *,
            services:services(name_en, department),
            status_events(new_status, created_at, details),
            documents(*)
        `)
        .eq('id', id)
        .single();

    const app = appRaw as any;

    if (error || !app) {
        return <div className="p-8">Application not found</div>;
    }

    // Attempt to fetch citizen details if linked
    // (Doing separate query as direct link might be flaky if user_id is null)
    let citizen = null;
    if (app.jan_aadhaar_id) {
        const { data: family } = await supabase.from('families').select('*').eq('jan_aadhaar_id', app.jan_aadhaar_id).single();
        citizen = { name: family?.family_head, id: app.jan_aadhaar_id, type: 'Jan Aadhaar' };
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                    <Link href="/admin/applications" className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Application #{app.submission_id}</h1>
                        <p className="text-sm text-gray-500">Submitted on {new Date(app.created_at || '').toLocaleDateString()}</p>
                    </div>
                </div>
                <div>
                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium capitalize border
                        ${app.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                            app.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                        {app.status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Applicant Info */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Applicant Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Name</label>
                                <p className="font-medium">{citizen?.name || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase">ID Type</label>
                                <p className="font-medium">{citizen?.type} - {citizen?.id}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Service</label>
                                <p className="font-medium text-blue-600">{app.services?.name_en}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Department</label>
                                <p className="font-medium">{app.services?.department || 'Social Welfare'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Documents */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Documents</h3>
                        {app.documents && app.documents.length > 0 ? (
                            <ul className="space-y-3">
                                {app.documents.map((doc: any) => (
                                    <li key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                        <div className="flex items-center space-x-3">
                                            <FileText className="w-5 h-5 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium">{doc.file_name}</p>
                                                <p className="text-xs text-gray-500">{(doc.file_size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                        <a href="#" className="text-sm text-blue-600 hover:underline">View</a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 italic">No documents attached.</p>
                        )}
                    </div>

                    {/* Metadata */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Form Data</h3>
                        <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-auto max-h-64">
                            {JSON.stringify(app.metadata, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* Right Column: Actions & Timeline */}
                <div className="space-y-6">
                    {/* Action Card */}
                    <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-500">
                        <h3 className="text-lg font-semibold mb-4">Take Action</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Review the application details and documents before making a decision.
                        </p>
                        <ActionButtons applicationId={app.id} currentStatus={app.status} />
                    </div>

                    {/* Timeline */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">History</h3>
                        <div className="space-y-6 border-l-2 border-gray-200 ml-3 pl-6 relative">
                            {app.status_events?.map((event: any, idx: number) => (
                                <div key={idx} className="relative">
                                    <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></span>
                                    <p className="text-sm font-medium capitalize">{event.new_status.replace('_', ' ')}</p>
                                    <p className="text-xs text-gray-500">{new Date(event.created_at).toLocaleString()}</p>
                                    {event.details?.remarks && (
                                        <p className="text-xs text-gray-600 mt-1 italic">"{event.details.remarks}"</p>
                                    )}
                                </div>
                            ))}
                            {/* Creation Event */}
                            <div className="relative">
                                <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-gray-300 border-2 border-white"></span>
                                <p className="text-sm font-medium">Application Created</p>
                                <p className="text-xs text-gray-500">{new Date(app.created_at || '').toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
