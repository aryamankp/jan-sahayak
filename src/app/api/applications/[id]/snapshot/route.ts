import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: applicationId } = await context.params;

    try {
        // Fetch application with all related data
        const { data: application, error: appError } = await supabase
            .from("applications")
            .select(`
        *,
        services:service_id (*),
        application_steps (*)
      `)
            .eq("id", applicationId)
            .single();

        if (appError || !application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        // Create immutable snapshot
        const snapshot = {
            application_id: applicationId,
            snapshot: {
                ...application,
                frozen_at: new Date().toISOString()
            }
        };

        const { error: snapshotError } = await supabase
            .from("application_snapshots")
            .insert({
                id: uuidv4(),
                application_id: applicationId,
                snapshot: snapshot.snapshot,
                created_at: new Date().toISOString()
            });

        if (snapshotError) {
            console.error("Snapshot error:", snapshotError);
            throw snapshotError;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Snapshot creation error:", error);
        return NextResponse.json({ error: "Failed to create snapshot" }, { status: 500 });
    }
}
