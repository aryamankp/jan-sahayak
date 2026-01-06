import { NextResponse } from 'next/server';
import { AdminAuthService } from '@/lib/services/admin-auth';

export async function POST() {
    await AdminAuthService.logout();
    return NextResponse.json({ success: true, redirect: '/admin/login' });
}
