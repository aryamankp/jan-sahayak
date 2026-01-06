import { supabase } from '@/lib/supabase/client';
import { Settings, Edit, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';

interface Scheme {
    id: string;
    name_en: string;
    name_hi: string;
    description_en?: string | null;
    description_hi?: string | null;
    is_active: boolean;
    category?: string | null;
    official_link?: string | null;
    application_process?: string | null;
    benefit_type?: string | null;
    created_at?: string | null;
}

async function getSchemes() {
    const { data, error } = await supabase
        .from('schemes')
        .select('*')
        .order('name_en', { ascending: true });

    if (error) {
        console.error('Error fetching schemes:', error);
        return [];
    }
    return data as Scheme[];
}

async function getSchemeStats() {
    const { count: total } = await supabase.from('schemes').select('*', { count: 'exact', head: true });
    const { count: active } = await supabase.from('schemes').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { count: inactive } = await supabase.from('schemes').select('*', { count: 'exact', head: true }).eq('is_active', false);

    return {
        total: total || 0,
        active: active || 0,
        inactive: inactive || 0
    };
}

export default async function SchemesPage() {
    const [schemes, stats] = await Promise.all([getSchemes(), getSchemeStats()]);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Scheme Management</h1>
                <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <Settings className="w-4 h-4" />
                    Add New Scheme
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm">Total Schemes</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <Settings className="w-8 h-8 text-blue-500" />
                </div>
                <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm">Active</p>
                        <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                    </div>
                    <ToggleRight className="w-8 h-8 text-green-500" />
                </div>
                <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm">Inactive</p>
                        <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                    </div>
                    <ToggleLeft className="w-8 h-8 text-red-500" />
                </div>
            </div>

            {/* Schemes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schemes.length === 0 ? (
                    <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
                        <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500">No schemes found</p>
                    </div>
                ) : (
                    schemes.map((scheme) => (
                        <div key={scheme.id} className="bg-white rounded-lg shadow overflow-hidden">
                            <div className={`h-2 ${scheme.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 line-clamp-1">{scheme.name_en}</h3>
                                        <p className="text-sm text-blue-600">{scheme.name_hi}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${scheme.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {scheme.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                                    {scheme.description_en || 'No description available'}
                                </p>

                                {scheme.category && (
                                    <div className="mb-3">
                                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                            {scheme.category}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    {scheme.official_link ? (
                                        <a
                                            href={scheme.official_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Official Link
                                        </a>
                                    ) : (
                                        <span className="text-xs text-gray-400">No link</span>
                                    )}
                                    <button className="text-xs text-gray-500 hover:text-blue-600 inline-flex items-center gap-1">
                                        <Edit className="w-3 h-3" />
                                        Edit
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
