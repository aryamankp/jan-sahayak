"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ProfileService } from "@/lib/services/profile";

// Icons
const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

export default function EditProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [formData, setFormData] = useState({
        mobile: "",
        email: "",
        address: ""
    });

    useEffect(() => {
        async function loadProfile() {
            try {
                // Mock ID for consistency
                const janAadhaarId = "1093847291";
                const data = await ProfileService.getProfile(janAadhaarId);
                setProfile(data);
                if (data) {
                    setFormData({
                        mobile: data.personalInfo.mobile_number || "",
                        email: "", // Not usually in Jan Aadhaar, but good for profile
                        address: data.personalInfo.address_en || data.personalInfo.address_hi || ""
                    });
                }
            } catch (err) {
                console.error("Failed to load profile", err);
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        // Simulate API call
        await new Promise(r => setTimeout(r, 1500));
        setSaving(false);
        router.push("/profile");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-md">
                    <div className="spinner"></div>
                    <p className="text-secondary mt-2">Loading...</p>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="gov-header sticky top-0 z-10">
                <div className="flex items-center gap-md">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-surface-alt transition-colors text-primary">
                        <BackIcon />
                    </button>
                    <div>
                        <h1 className="gov-header__subtitle text-lg">Edit Profile</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto p-md">

                <form onSubmit={handleSave} className="space-y-lg">

                    {/* Read Only Section */}
                    <div className="card bg-surface-alt border-border-strong">
                        <div className="flex items-center gap-md mb-md">
                            <div className="w-16 h-16 rounded-full bg-white border border-border flex items-center justify-center text-2xl font-bold text-primary">
                                {profile.personalInfo.head_of_family.charAt(0)}
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-primary">{profile.personalInfo.head_of_family}</h2>
                                <p className="text-sm text-secondary">Jan Aadhaar: {profile.personalInfo.jan_aadhaar_id}</p>
                            </div>
                        </div>
                        <div className="p-sm bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                            Note: Jan Aadhaar details cannot be changed here. Please visit your nearest e-Mitra for corrections.
                        </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="card space-y-md">
                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input
                                type="tel"
                                className="form-input"
                                value={formData.mobile}
                                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                            />
                            <p className="text-xs text-secondary mt-1">Used for login OTP and notifications</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address (Optional)</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Current Address</label>
                            <textarea
                                className="form-input min-h-[100px]"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-md">
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn btn--primary btn--full btn--large"
                        >
                            {saving ? (
                                <>
                                    <span className="spinner w-4 h-4 border-2 border-white/30 border-t-white mr-2"></span>
                                    Saving Changes...
                                </>
                            ) : "Save Changes"}
                        </button>
                    </div>

                </form>

            </main>
        </div>
    );
}
