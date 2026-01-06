"use client";

import { useEffect, useState } from "react";
import { ProfileService, Notification } from "@/lib/services/profile";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            try {
                // Get current user session
                // 1. Try Supabase Auth first
                const { data: { session } } = await supabase.auth.getSession();
                let janAadhaarId = "";

                const phone = session?.user?.phone;
                if (phone) {
                    // Check if they have a linked citizen record
                    const { data: citizen } = await supabase
                        .from('citizens')
                        .select('jan_aadhaar_id')
                        .eq('phone_number', phone.replace('+91', ''))
                        .single();

                    if (citizen?.jan_aadhaar_id) janAadhaarId = citizen.jan_aadhaar_id;
                }

                // 2. If no Auth (or Auth didn't give ID), check the Server Session via API (for httpOnly cookies)
                if (!janAadhaarId) {
                    try {
                        const res = await fetch("/api/auth/user");
                        if (res.ok) {
                            const userData = await res.json();
                            if (userData.authenticated && userData.jan_aadhaar_id) {
                                janAadhaarId = userData.jan_aadhaar_id;
                            }
                        }
                    } catch (e) {
                        console.error("Failed to fetch session user", e);
                    }
                }

                // Fallback (Only if absolutely nothing found, preventing error)
                if (!janAadhaarId) {
                    console.log("No ID found in session, using default");
                    janAadhaarId = "1093847291"; // Default for totally guest users
                } else {
                    console.log("Loading Profile for:", janAadhaarId);
                }

                const data = await ProfileService.getProfile(janAadhaarId);
                setProfile(data);
            } catch (err) {
                console.error("Failed to load profile", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-md">
                <div className="spinner"></div>
                <p className="text-secondary">कंड लोंडिंग...</p>
            </div>
        </div>
    );

    if (!profile) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <p className="text-error">Profile Not Found</p>
        </div>
    );

    const { personalInfo, benefits, notifications, documents } = profile;
    const totalBenefits = benefits.reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0);

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="gov-header">
                <div className="flex justify-between items-center">
                    <div className="gov-header__brand">
                        <div className="gov-header__emblem">🏛️</div>
                        <div>
                            <p className="gov-header__title">राजस्थान सरकार</p>
                            <h1 className="gov-header__subtitle">जन सहायक</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-md space-y-lg">
                {/* Profile Header Card */}
                <div className="card bg-surface shadow-sm border-0 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-24 bg-[var(--gov-primary)] opacity-10"></div>

                    <div className="relative pt-8 px-4 pb-4 flex flex-col md:flex-row items-center md:items-end gap-md">
                        <div className="w-24 h-24 rounded-full border-4 border-surface bg-gray-200 flex items-center justify-center text-3xl shadow-md z-10 -mt-12 md:mt-0">
                            {personalInfo.head_of_family.charAt(0)}
                        </div>

                        <div className="flex-1 text-center md:text-left mt-2 md:mt-0">
                            <h1 className="text-2xl font-bold text-primary">{personalInfo.head_of_family}</h1>
                            <p className="text-secondary text-sm">Jan Aadhaar: {personalInfo.jan_aadhaar_id}</p>
                            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">
                                    Verified Citizen
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-2 mt-4 md:mt-0">
                            <Link href="/edit-profile" className="btn btn--secondary">
                                Edit Profile
                            </Link>
                            <button
                                onClick={async () => {
                                    if (confirm("Are you sure you want to logout?")) {
                                        await supabase.auth.signOut();
                                        await fetch("/api/auth/logout", { method: "POST" });
                                        router.push("/login"); // Fixed: router was not imported or used correctly if not shown in context, but assuming standard Next.js router
                                    }
                                }}
                                className="btn bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                    {/* Left Column */}
                    <div className="space-y-lg">

                        {/* Status Card */}
                        <div className="card">
                            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-md">Total Benefits</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-primary">
                                    ₹{totalBenefits.toLocaleString()}
                                </span>
                                <span className="text-sm text-secondary">received</span>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="card">
                            <div className="flex justify-between items-center mb-md">
                                <h3 className="font-bold text-primary">Notifications</h3>
                                <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">{notifications.length}</span>
                            </div>
                            <div className="space-y-md max-h-64 overflow-y-auto">
                                {notifications.map((notif: Notification) => (
                                    <div key={notif.id} className={`flex gap-3 p-2 rounded-md ${notif.status === 'unread' ? 'bg-orange-50 border-l-2 border-orange-500' : ''}`}>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-primary">{notif.title}</p>
                                            <p className="text-xs text-secondary line-clamp-2">{notif.message}</p>
                                            <span className="text-[10px] text-muted mt-1 block">
                                                {new Date(notif.created_at!).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {notifications.length === 0 && <p className="text-sm text-muted text-center">No new notifications</p>}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="md:col-span-2 space-y-lg">

                        {/* Active Applications */}
                        <div className="card">
                            <div className="flex justify-between items-center mb-md border-b border-border pb-2">
                                <h2 className="font-bold text-lg text-primary">Applications</h2>
                                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{profile.applications?.length || 0}</span>
                            </div>
                            <div className="space-y-4">
                                {profile.applications?.map((app: any) => (
                                    <div key={app.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-surface-alt transition-colors">
                                        <div>
                                            <p className="font-medium text-primary">
                                                {app.service?.name_en || "Application"}
                                            </p>
                                            <p className="text-xs text-secondary mt-1">
                                                ID: <span className="font-mono">{app.submission_id || "Draft"}</span>
                                            </p>
                                            <p className="text-xs text-muted mt-0.5">
                                                {new Date(app.updated_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize
                                                ${app.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {app.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {(!profile.applications || profile.applications.length === 0) && (
                                    <p className="text-center text-muted py-4">No active applications</p>
                                )}
                            </div>
                        </div>

                        {/* Grievances */}
                        <div className="card">
                            <div className="flex justify-between items-center mb-md border-b border-border pb-2">
                                <h2 className="font-bold text-lg text-primary">Grievances</h2>
                                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{profile.grievances?.length || 0}</span>
                            </div>
                            <div className="space-y-4">
                                {profile.grievances?.map((grv: any) => (
                                    <div key={grv.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-surface-alt transition-colors">
                                        <div>
                                            <p className="font-medium text-primary line-clamp-1">
                                                {grv.category_id?.replace('CAT_', '') || "Grievance"}
                                            </p>
                                            <p className="text-xs text-secondary mt-1">
                                                Ticket: <span className="font-mono">{grv.ticket_id}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize
                                                ${grv.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                                    grv.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                                                        'bg-orange-100 text-orange-700'
                                                }`}>
                                                {grv.status || 'Registered'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {(!profile.grievances || profile.grievances.length === 0) && (
                                    <p className="text-center text-muted py-4">No grievances submitted</p>
                                )}
                            </div>
                        </div>

                        {/* Benefits List */}
                        <div className="card">
                            <div className="flex justify-between items-center mb-md border-b border-border pb-2">
                                <h2 className="font-bold text-lg text-primary">Recent Benefits</h2>
                                <Link href="/benefits" className="text-sm text-[var(--gov-primary)] font-medium hover:underline">
                                    View All
                                </Link>
                            </div>
                            <div className="space-y-4">
                                {benefits.slice(0, 3).map((benefit: any) => (
                                    <div key={benefit.id} className="flex items-center justify-between p-2 hover:bg-surface-alt rounded-lg transition-colors">
                                        <div className="flex items-center gap-md">
                                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                                                ₹
                                            </div>
                                            <div>
                                                <p className="font-medium text-primary">
                                                    {benefit.scheme?.name_en || "Scheme Benefit"}
                                                </p>
                                                <p className="text-xs text-secondary">
                                                    {new Date(benefit.disbursement_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-success">+₹{benefit.amount}</p>
                                            <span className="text-[10px] uppercase tracking-wide text-muted">{benefit.status}</span>
                                        </div>
                                    </div>
                                ))}
                                {benefits.length === 0 && <p className="text-center text-muted py-4">No benefits found</p>}
                            </div>
                        </div>

                        {/* Family Members */}
                        <div className="card">
                            <div className="mb-md border-b border-border pb-2">
                                <h2 className="font-bold text-lg text-primary">Family Members</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                                {personalInfo.members.map((member: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-surface-alt">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-primary border border-border">
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-primary">{member.name}</p>
                                            <p className="text-xs text-secondary">{member.relation} • {member.age} yrs</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Document Wallet */}
                        <div className="card">
                            <div className="flex justify-between items-center mb-md border-b border-border pb-2">
                                <h2 className="font-bold text-lg text-primary">Documents</h2>
                                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{documents.length}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                                {documents.map((doc: any) => (
                                    <div key={doc.id} className="border border-border rounded-lg p-3 flex items-start gap-3 hover:border-[var(--gov-primary)] transition-colors cursor-pointer bg-surface">
                                        <div className="w-8 h-8 bg-red-50 text-red-500 rounded flex items-center justify-center flex-shrink-0">
                                            📄
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-primary truncate">
                                                {doc.file_name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] px-1.5 rounded capitalize ${doc.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                                                    doc.verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {doc.verification_status || 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {documents.length === 0 && <p className="text-center text-muted col-span-full py-4">No documents</p>}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}

