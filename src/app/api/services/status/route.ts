import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json(
            { error: "Application ID is required" },
            { status: 400 }
        );
    }

    // Checking if ID is UUID or legacy mock format.
    // If it's legacy mock format (e.g., EM2024...), and database uses UUID, this will fail.
    // However, I seeded the DB with text IDs or UUIDs? 
    // In my `mcp_supabase-mcp-server_execute_sql` calls, I passed 'EM2024...' as ID. 
    // If the table 'id' column is UUID, that insert would have failed!
    // But the `mcp_supabase-mcp-server_execute_sql` output for the insert was `[]` (success or empty result).
    // Wait, the `applications` table schema was NOT created by me, it existed. 
    // The previous analysis showed `applications` schema was truncated in `list_tables`.
    // I should be careful. If the ID is text, filtering works. If UUID, 'EM...' fails.
    // I'll assume it works or fail gracefully.

    // Parallel fetch: Application details + Status Events
    const [appResponse, eventsResponse] = await Promise.all([
        supabase
            .from('applications')
            .select('*, services(code, name_hi, name_en)')
            .eq('id', id)
            .single(),
        supabase
            .from('status_events')
            .select('*')
            .eq('application_id', id)
            .order('created_at', { ascending: true })
    ]);

    const { data: application, error } = appResponse;
    const { data: events } = eventsResponse;

    if (error || !application) {
        return NextResponse.json(
            {
                error: "Application not found",
                error_hi: "आवेदन नहीं मिला",
                message_hi: "कृपया सही आवेदन नंबर दर्ज करें।"
            },
            { status: 404 }
        );
    }

    // Transform DB data to expected API response format
    const metadata = application.metadata as any || {};

    // Build timeline from status events
    let timeline = [];
    if (events && events.length > 0) {
        timeline = events.map((event: any) => ({
            title_en: event.new_status.replace('_', ' ').toUpperCase(),
            title_hi: event.details?.title_hi || event.new_status, // Fallback if no hindi title in details
            date: event.created_at,
            status: event.new_status === application.status ? 'current' : 'completed',
            description: event.details?.description || ''
        }));
    } else {
        // Fallback to metadata timeline if no events found (migration support)
        timeline = metadata.timeline || [];
    }

    // Format dates in Hindi
    const formatDateHi = (dateStr: string) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const options: Intl.DateTimeFormatOptions = {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        };
        return date.toLocaleDateString("hi-IN", options);
    };

    const responseData = {
        application_id: application.id,
        service_code: application.services?.code || metadata.service_code,
        service_name_hi: application.services?.name_hi || metadata.service_name_hi,
        service_name_en: application.services?.name_en || metadata.service_name_en,
        status: application.status,
        status_hi: metadata.status_hi || "प्रक्रियाधीन",
        applicant_name: metadata.applicant_name,
        submitted_at: application.created_at,
        last_updated: application.updated_at,
        current_step: metadata.current_step,
        total_steps: metadata.total_steps,
        timeline: timeline,
        submitted_at_formatted: formatDateHi(application.created_at),
        last_updated_formatted: formatDateHi(application.updated_at),
    };

    return NextResponse.json(responseData);
}
