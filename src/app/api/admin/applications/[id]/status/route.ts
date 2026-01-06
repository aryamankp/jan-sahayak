import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/lib/services/admin-auth';
import { supabase } from '@/lib/supabase/client';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> } // Correct type for Next.js 15
) {
    const { id } = await context.params;

    // 1. Verify Admin
    const user = await AdminAuthService.getCurrentUser();
    if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role === 'view_only') {
        return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { status, remarks } = body;

        if (!['approved', 'rejected', 'in_process', 'needs_info'].includes(status)) {
            return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
        }

        // 2. Update Application Status
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) throw updateError;

        // 3. Log Status Event (Audit)
        await supabase.from('status_events').insert({
            application_id: id,
            previous_status: 'unknown', // Ideally we fetch first, but optimization
            new_status: status,
            changed_by: user.id, // Admin ID
            details: { remarks: remarks || 'Admin action', updated_by_role: user.role }
        });

        // 4. (Optional) Create Notification for Citizen
        // We would add to 'notifications' table here

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Update status error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update status' },
            { status: 500 }
        );
    }
}
