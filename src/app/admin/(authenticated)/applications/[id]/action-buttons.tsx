'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ActionButtons({ applicationId, currentStatus }: { applicationId: string, currentStatus: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const updateStatus = async (status: string) => {
        if (!confirm(`Are you sure you want to mark this as ${status.toUpperCase()}?`)) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/applications/${applicationId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, remarks: `Marked as ${status} by admin` }),
            });

            if (res.ok) {
                router.refresh();
            } else {
                alert('Failed to update status');
            }
        } catch (e) {
            alert('Error updating status');
        } finally {
            setLoading(false);
        }
    };

    if (currentStatus === 'approved' || currentStatus === 'rejected') {
        return <div className="text-sm text-gray-500 text-center">No further actions available.</div>;
    }

    return (
        <div className="grid grid-cols-2 gap-3">
            <button
                onClick={() => updateStatus('approved')}
                disabled={loading}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
                Approve
            </button>
            <button
                onClick={() => updateStatus('rejected')}
                disabled={loading}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
                Reject
            </button>
            <button
                onClick={() => updateStatus('needs_info')}
                disabled={loading}
                className="col-span-2 flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
                Request More Info
            </button>
        </div>
    );
}
