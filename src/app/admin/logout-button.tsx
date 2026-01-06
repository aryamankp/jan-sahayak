'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/admin/auth/logout', { method: 'POST' });
        router.refresh();
        router.push('/admin/login');
    };

    return (
        <button
            onClick={handleLogout}
            className="flex items-center space-x-2 w-full px-4 py-2 text-red-300 hover:text-red-200 hover:bg-slate-800 rounded-md transition-colors text-sm"
        >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
        </button>
    );
}
