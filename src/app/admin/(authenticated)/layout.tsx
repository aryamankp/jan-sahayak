import { AdminAuthService } from '@/lib/services/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FileText, Users, AlertCircle, Settings } from 'lucide-react';
import LogoutButton from '../logout-button';

export default async function AuthenticatedAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await AdminAuthService.getCurrentUser();

    if (!user) {
        redirect('/admin/login');
    }

    const navigation = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Applications', href: '/admin/applications', icon: FileText },
        { name: 'Grievances', href: '/admin/grievances', icon: AlertCircle },
        { name: 'User Management', href: '/admin/users', icon: Users, role: 'super_admin' },
        { name: 'Schemes', href: '/admin/schemes', icon: Settings, role: 'super_admin' },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-700">
                    <h1 className="text-xl font-bold tracking-wider">JAN SAHAYAK</h1>
                    <span className="text-xs text-slate-400 uppercase tracking-widest">Admin Panel</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navigation.map((item) => {
                        if (item.role && user.role !== item.role) return null;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex items-center space-x-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                            >
                                <item.icon className="w-5 h-5" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                            {user.full_name[0]}
                        </div>
                        <div>
                            <p className="text-sm font-medium">{user.full_name}</p>
                            <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                        </div>
                    </div>
                    <LogoutButton />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
