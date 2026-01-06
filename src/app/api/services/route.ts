import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const category = searchParams.get("category");

    let query = supabase.from('services').select('*').eq('is_active', true);

    // Filter by code
    if (code) {
        query = query.eq('code', code);
    }

    // Filter by category
    if (category) {
        // Case insensitive match might be tricky with simple Postgrest filter if sensitive
        // Using ilike for category match
        query = query.ilike('category', category);
    }

    const { data: services, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (code) {
        if (!services || services.length === 0) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }
        return NextResponse.json(services[0]);
    }

    return NextResponse.json(services);
}
