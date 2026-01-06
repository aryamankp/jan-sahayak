import { NextRequest, NextResponse } from "next/server";
import { emitraAdapter, ApplicationData } from "@/lib/adapters/e-mitra";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Basic validation or mapping if needed
        const submissionResult = await emitraAdapter.submitApplication(body as ApplicationData);

        if (!submissionResult.success) {
            return NextResponse.json(submissionResult, { status: 400 });
        }

        return NextResponse.json(submissionResult, { status: 200 });

    } catch (error) {
        console.error("Application submission error:", error);
        return NextResponse.json({
            success: false,
            message: "Internal Server Error",
            message_hi: "आंतरिक सर्वर त्रुटि"
        }, { status: 500 });
    }
}
