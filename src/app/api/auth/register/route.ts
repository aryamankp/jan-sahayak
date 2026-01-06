import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { phone, jan_aadhaar_id, name, name_hi, session } = await request.json();
        const cookieStore = await cookies();

        if (!phone || !jan_aadhaar_id || !session) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify Supabase User
        let user;
        if (session.access_token === "demo_token") {
            // DEMO BYPASS: Create mock user from phone
            // We trust the phone from the request in demo mode (but still sanitize)
            const demoPhone = phone.replace(/\D/g, '').slice(-10);
            user = {
                id: "demo_user_" + demoPhone,
                phone: "+91" + demoPhone
            };
        } else {
            // REAL AUTH
            const { data: { user: realUser }, error: authError } = await supabase.auth.getUser(session.access_token);
            if (authError || !realUser) {
                return NextResponse.json({ error: "Invalid session" }, { status: 401 });
            }
            user = realUser;
        }

        // Security Check: Phone number must match authenticated user's phone
        const authPhone = user.phone?.replace(/\D/g, '').slice(-10);
        const reqPhone = phone.replace(/\D/g, '').slice(-10);

        if (authPhone !== reqPhone) {
            console.error("Phone mismatch:", authPhone, reqPhone);
            return NextResponse.json({ error: "Phone number mismatch" }, { status: 403 });
        }

        // Check if citizen already exists
        const { data: existing } = await supabase
            .from("citizens")
            .select("id")
            .eq("phone_number", reqPhone)
            .single();

        if (existing) {
            // If existing, we should ensure session/cookies are set anyway
            // Create Session
            const { data: dbSession, error: sessionError } = await supabase
                .from("citizen_sessions")
                .insert({
                    citizen_id: existing.id,
                    metadata: { auth_id: user.id, phone: reqPhone },
                    is_active: true
                })
                .select()
                .single();

            if (sessionError) throw sessionError;

            cookieStore.set('gen_session_id', dbSession.id, { httpOnly: true, path: '/' });
            cookieStore.set('gen_citizen_id', existing.id, { httpOnly: true, path: '/' });

            return NextResponse.json({
                success: true,
                citizen_id: existing.id,
                message: "User already exists - logged in"
            });
        }

        // Create new citizen
        const citizenId = uuidv4();
        const { error: insertError } = await supabase
            .from("citizens")
            .insert({
                id: citizenId,
                phone_number: reqPhone,
                jan_aadhaar_id,
                name,
                name_hi,
                is_verified: true,
                last_login: new Date().toISOString()
            });

        if (insertError) {
            console.error("Citizen insert error:", insertError);
            throw insertError;
        }

        // Create Session for new citizen
        const { data: dbSession, error: sessionError } = await supabase
            .from("citizen_sessions")
            .insert({
                citizen_id: citizenId,
                jan_aadhaar_id: jan_aadhaar_id, // Link directly
                metadata: { auth_id: user.id, phone: reqPhone, created_via: 'register' },
                is_active: true
            })
            .select()
            .single();

        if (sessionError) throw sessionError;

        cookieStore.set('gen_session_id', dbSession.id, { httpOnly: true, path: '/' });
        cookieStore.set('gen_citizen_id', citizenId, { httpOnly: true, path: '/' });

        return NextResponse.json({
            success: true,
            citizen_id: citizenId,
            message: "Registration successful"
        });
    } catch (error: any) {
        console.error("Register error:", error);
        return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
    }
}
