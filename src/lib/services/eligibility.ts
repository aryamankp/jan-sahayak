import { supabase } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";

export type EligibilityRule = Database['public']['Tables']['eligibility_rules']['Row'];

export const EligibilityService = {
    /**
     * Evaluate rules for a specific scheme against a user's profile/family
     */
    async checkEligibility(schemeId: string, citizenData: any): Promise<{ eligible: boolean; reasons: string[] }> {
        // 1. Fetch rules for the scheme
        const { data: rules, error } = await supabase
            .from('eligibility_rules')
            .select('*')
            .eq('scheme_id', schemeId)
            .order('priority', { ascending: true });

        if (error || !rules || rules.length === 0) {
            // If no rules defined, default to OPEN/ELIGIBLE (or policy choice)
            // For safety, maybe default to TRUE but log warning? 
            // Let's assume if no rules, it's open for all.
            return { eligible: true, reasons: ["No restrictions found"] };
        }

        const reasons: string[] = [];
        let isEligible = true;

        for (const rule of rules) {
            const passed = this.evaluateRule(rule, citizenData);
            if (!passed) {
                isEligible = false;
                if (rule.is_mandatory) {
                    reasons.push(rule.description_en || `Failed rule: ${rule.rule_type}`);
                    // Fail fast on mandatory rules? Or collect all failures?
                    // Let's collect failures.
                }
            }
        }

        return { eligible: isEligible, reasons };
    },

    /**
     * Core Rule Evaluator
     */
    evaluateRule(rule: EligibilityRule, data: any): boolean {
        const { rule_type, operator, value } = rule;
        const ruleValue = (value as any)?.value; // Assuming value stored as { value: ... } to fit Json type

        let userValue: any;

        // Extract user value based on rule type
        switch (rule_type) {
            case 'age_min':
            case 'age_max':
                userValue = this.extractAge(data);
                break;
            case 'income_max':
                userValue = data.income || data.annual_income || 0;
                break;
            case 'category':
                userValue = data.category || data.caste_category;
                break;
            case 'gender':
                userValue = data.gender;
                break;
            case 'economic_status':
                userValue = data.economic_status; // e.g. BPL, NFSA
                break;
            default:
                return true; // Unknown rule type, ignore
        }

        if (userValue === undefined || userValue === null) return false; // Data missing = fail

        // Compare
        switch (operator) {
            case 'eq': return String(userValue).toLowerCase() === String(ruleValue).toLowerCase();
            case 'neq': return String(userValue).toLowerCase() !== String(ruleValue).toLowerCase();
            case 'gt': return Number(userValue) > Number(ruleValue);
            case 'gte': return Number(userValue) >= Number(ruleValue);
            case 'lt': return Number(userValue) < Number(ruleValue);
            case 'lte': return Number(userValue) <= Number(ruleValue);
            case 'in':
                const allowed = (value as any)?.values || [];
                return allowed.includes(userValue);
            default: return false;
        }
    },

    extractAge(data: any): number {
        if (data.age) return Number(data.age);
        if (data.dob) {
            const dob = new Date(data.dob);
            const diffMs = Date.now() - dob.getTime();
            const ageDt = new Date(diffMs);
            return Math.abs(ageDt.getUTCFullYear() - 1970);
        }
        return 0;
    }
};
