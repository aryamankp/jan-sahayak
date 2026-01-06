import { NextRequest, NextResponse } from "next/server";
import { submitGrievance, GrievanceSubmission } from "@/lib/adapters/sampark";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await submitGrievance(body as GrievanceSubmission);

        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error submitting grievance:", error);
        return NextResponse.json({ success: false, message: "Internal Error" }, { status: 500 });
    }
}
