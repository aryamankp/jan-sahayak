"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function VerificationPage() {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        const fetchPendingApps = async () => {
            // Fetch applications that are submitted
            const { data, error } = await supabase
                .from("applications")
                .select("*, services(name_en, name_hi), documents(*)")
                .eq("status", "submitted")
                .order("created_at", { ascending: false });

            if (data) setApplications(data);
            setLoading(false);
        };

        fetchPendingApps();
    }, []);

    const handleVerify = async (status: "approved" | "rejected") => {
        if (!selectedApp) return;
        setVerifying(true);

        try {
            // 1. Update Application Status
            const { error: appError } = await supabase
                .from("applications")
                .update({ status: status })
                .eq("id", selectedApp.id);

            if (appError) throw appError;

            // 2. Update Document Status (All to verified for simplicity in demo)
            if (status === "approved" && selectedApp.documents) {
                for (const doc of selectedApp.documents) {
                    await supabase
                        .from("documents")
                        .update({ verification_status: "verified", verified_at: new Date().toISOString() })
                        .eq("id", doc.id);
                }
            }

            // Refresh List
            setApplications(prev => prev.filter(a => a.id !== selectedApp.id));
            setSelectedApp(null);
        } catch (error) {
            console.error("Verification failed:", error);
            alert("Verification failed");
        } finally {
            setVerifying(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading pending verifications...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar List */}
            <div className="w-1/3 border-r h-screen overflow-y-auto bg-white">
                <div className="p-4 border-b bg-gray-100">
                    <h1 className="font-bold text-lg">Pending Verification</h1>
                    <p className="text-sm text-gray-500">{applications.length} applications waiting</p>
                </div>
                <div>
                    {applications.map(app => (
                        <div
                            key={app.id}
                            onClick={() => setSelectedApp(app)}
                            className={`p-4 border-b cursor-pointer hover:bg-blue-50 transition-colors ${selectedApp?.id === app.id ? 'bg-blue-100 border-l-4 border-blue-600' : ''}`}
                        >
                            <p className="font-bold text-gray-800">{app.services?.name_en || "Service"}</p>
                            <p className="text-xs text-gray-500">ID: {app.submission_id}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(app.created_at).toLocaleDateString()}</p>
                            {app.documents?.length > 0 && (
                                <span className="inline-block mt-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] rounded-full">
                                    {app.documents.length} Docs
                                </span>
                            )}
                        </div>
                    ))}
                    {applications.length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                            No pending applications
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto h-screen">
                {selectedApp ? (
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Application Review</h2>
                                <p className="text-gray-500">Submission ID: {selectedApp.submission_id}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleVerify("rejected")}
                                    disabled={verifying}
                                    className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleVerify("approved")}
                                    disabled={verifying}
                                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 shadow-sm"
                                >
                                    {verifying ? "Processing..." : "Approve Application"}
                                </button>
                            </div>
                        </div>

                        {/* Documents Grid */}
                        <div className="mb-8">
                            <h3 className="font-bold text-lg mb-4 border-b pb-2">Uploaded Documents</h3>
                            {selectedApp.documents && selectedApp.documents.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedApp.documents.map((doc: any) => (
                                        <div key={doc.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                                                    📄
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="font-medium truncate">{doc.file_name}</p>
                                                    <p className="text-xs text-gray-400">{(doc.file_size / 1024).toFixed(1)} KB</p>
                                                </div>
                                            </div>
                                            <a
                                                href={doc.file_path}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block w-full text-center py-2 bg-gray-50 text-blue-600 text-sm rounded hover:bg-gray-100"
                                            >
                                                View Document
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No documents attached.</p>
                            )}
                        </div>

                        {/* Details JSON */}
                        <div className="bg-gray-900 text-gray-300 p-6 rounded-xl overflow-auto max-h-96 text-sm font-mono">
                            <h3 className="text-white font-bold mb-4 border-b border-gray-700 pb-2">Application Metadata</h3>
                            <pre>{JSON.stringify(selectedApp, null, 2)}</pre>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <span className="text-4xl mb-4">👈</span>
                        <p>Select an application to verify</p>
                    </div>
                )}
            </div>
        </div>
    );
}
