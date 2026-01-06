import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function generateSubmissionId(): string {
    const prefix = "EM";
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const random = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
    return `${prefix}${year}${month}${random}`;
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: applicationId } = await context.params;

    try {
        const body = await request.json();
        const { consent_id } = body;

        if (!consent_id) {
            return NextResponse.json({ error: "Consent required" }, { status: 400 });
        }

        // Generate submission ID
        const submissionId = generateSubmissionId();

        // Update application status
        const { data, error } = await supabase
            .from("applications")
            .update({
                status: "submitted",
                submission_id: submissionId,
                updated_at: new Date().toISOString()
            })
            .eq("id", applicationId)
            .eq("status", "draft") // Only allow submitting drafts
            .select()
            .single();

        if (error) {
            console.error("Submit error:", error);
            throw error;
        }

        if (!data) {
            return NextResponse.json({ error: "Application not in draft status" }, { status: 400 });
        }

        // The status_events will be automatically created by the database trigger

        return NextResponse.json({
            success: true,
            application_id: applicationId,
            submission_id: submissionId
        });
    } catch (error) {
        console.error("Submit error:", error);
        return NextResponse.json({ error: "Submission failed" }, { status: 500 });
    }
}
