
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { StatusEvent, ApplicationStatus } from '@/lib/types/application';

interface StatusTimelineProps {
    applicationId: string;
}

export default function StatusTimeline({ applicationId }: StatusTimelineProps) {
    // Uses the singleton instance imported from client.ts

    const [events, setEvents] = useState<StatusEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            const { data, error } = await supabase
                .from('status_events')
                .select('*')
                .eq('application_id', applicationId)
                .order('created_at', { ascending: false }); // Newest first

            if (!error && data) {
                setEvents(data as StatusEvent[]);
            }
            setLoading(false);
        };

        fetchEvents();

        // Realtime subscription
        const channel = supabase
            .channel(`status_events:${applicationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'status_events',
                    filter: `application_id=eq.${applicationId}`
                },
                (payload: any) => {
                    setEvents((prev) => [payload.new as StatusEvent, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [applicationId, supabase]);

    if (loading) return <div className="text-sm text-gray-500 animate-pulse">Loading timeline...</div>;
    if (events.length === 0) return <div className="text-sm text-gray-500">No history available</div>;

    return (
        <div className="flow-root">
            <ul role="list" className="-mb-8">
                {events.map((event, eventIdx) => (
                    <li key={event.id}>
                        <div className="relative pb-8">
                            {eventIdx !== events.length - 1 ? (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                            ) : null}
                            <div className="relative flex space-x-3">
                                <div>
                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getStatusColor(event.new_status)}`}>
                                        <StatusIcon status={event.new_status} />
                                    </span>
                                </div>
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                        <p className="text-sm text-gray-900 font-medium">
                                            Status changed to <span className="uppercase">{event.new_status.replace('_', ' ')}</span>
                                        </p>
                                        {event.details && (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {formatDetails(event.details)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="whitespace-nowrap text-right text-xs text-gray-500">
                                        <time dateTime={event.created_at}>
                                            {new Date(event.created_at).toLocaleString()}
                                        </time>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function getStatusColor(status: ApplicationStatus) {
    switch (status) {
        case 'draft': return 'bg-gray-400';
        case 'submitted': return 'bg-blue-500';
        case 'in_process': return 'bg-yellow-500';
        case 'approved': return 'bg-green-500';
        case 'rejected': return 'bg-red-500';
        case 'needs_info': return 'bg-orange-500';
        default: return 'bg-gray-400';
    }
}

function StatusIcon({ status }: { status: ApplicationStatus }) {
    // Simple SVG icons
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
    ); // Placeholder icon for all
}

function formatDetails(details: Record<string, any>): string {
    if (details.message) return details.message;
    if (details.source === 'database_trigger') return 'System Auto-Log';
    return JSON.stringify(details).slice(0, 50);
}
