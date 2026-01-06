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
        const body = await request.json();
        const { step_number, step_identifier, question_text_hi, question_text_en, user_response } = body;

        // Check if step already exists
        const { data: existing } = await supabase
            .from("application_steps")
            .select("id")
            .eq("application_id", applicationId)
            .eq("step_identifier", step_identifier)
            .single();

        if (existing) {
            // Update existing step
            const { error } = await supabase
                .from("application_steps")
                .update({
                    user_response,
                    updated_at: new Date().toISOString()
                })
                .eq("id", existing.id);

            if (error) throw error;
        } else {
            // Insert new step
            const { error } = await supabase
                .from("application_steps")
                .insert({
                    id: uuidv4(),
                    application_id: applicationId,
                    step_number,
                    step_identifier,
                    question_text_hi,
                    question_text_en,
                    user_response,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        }

        // Update current_step in application
        await supabase
            .from("applications")
            .update({ current_step: step_number })
            .eq("id", applicationId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Step save error:", error);
        return NextResponse.json({ error: "Failed to save step" }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: applicationId } = await context.params;

    try {
        const { data, error } = await supabase
            .from("application_steps")
            .select("*")
            .eq("application_id", applicationId)
            .order("step_number", { ascending: true });

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error) {
        console.error("Steps fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch steps" }, { status: 500 });
    }
}
