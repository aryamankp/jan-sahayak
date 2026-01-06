import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        // Fetch application with service and steps
        const { data: application, error } = await supabase
            .from("applications")
            .select(`
        *,
        services:service_id (
          id,
          code,
          name_hi,
          name_en,
          department_hi,
          department_en
        )
      `)
            .eq("id", id)
            .single();

        if (error || !application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        // Fetch steps
        const { data: steps } = await supabase
            .from("application_steps")
            .select("*")
            .eq("application_id", id)
            .order("step_number", { ascending: true });

        return NextResponse.json({
            ...application,
            service: application.services,
            steps: steps || []
        });
    } catch (error) {
        console.error("Application fetch error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
