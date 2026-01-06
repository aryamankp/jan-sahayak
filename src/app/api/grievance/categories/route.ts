import { NextRequest, NextResponse } from "next/server";
import { getCategories } from "@/lib/adapters/sampark";

export async function GET(request: NextRequest) {
    try {
        const categories = await getCategories();
        return NextResponse.json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        return NextResponse.json([], { status: 500 });
    }
}
