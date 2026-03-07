/**
 * Smart Categorization Service
 * Auto-tags transactions using:
 *   1. User-defined CategoryRules (regex/keyword) stored in DB
 *   2. Built-in system rules as fallback
 */

export type CategoryMap = {
    pattern: RegExp;
    category: string;
};

// Built-in system rules — checked AFTER user rules
const SYSTEM_RULES: CategoryMap[] = [
    { pattern: /swiggy|zomato|dunzo|blinkit|grofer|bigbasket|fresh|ubereats/i, category: "Food & Groceries" },
    { pattern: /netflix|hotstar|prime|spotify|zee5|jiocinema|apple\.com\/bill/i, category: "Subscriptions" },
    { pattern: /ola|uber|rapido|metro|irctc|airline|flight|indigo|airindia/i, category: "Transport" },
    { pattern: /salary|payroll|stipend|neft cr|credit from/i, category: "Salary" },
    { pattern: /amazon|flipkart|myntra|ajio|nykaa|meesho|snapdeal/i, category: "Shopping" },
    { pattern: /apollo|medplus|1mg|pharmeasy|hospital|clinic|doctor|health/i, category: "Healthcare" },
    { pattern: /rent|landlord|housing|nbfc|home loan|emi/i, category: "Housing" },
    { pattern: /electricity|water|gas|bses|tata power|bescom|msedcl|bill/i, category: "Utilities" },
    { pattern: /jio|airtel|vi |vodafone|bsnl|mobile|recharge/i, category: "Telecom" },
    { pattern: /mutual fund|sip|zerodha|groww|kuvera|coin|nse|bse|demat/i, category: "Investments" },
    { pattern: /atm|cash withdrawal|atm cash/i, category: "Cash Withdrawal" },
    { pattern: /transfer|imps|rtgs|neft/i, category: "Transfer" },
];

/**
 * Returns the auto-detected category string for a given raw title.
 * Optionally accepts user rules (fetched from DB) to check first.
 */
export function autoCategory(
    title: string,
    userRules: Array<{ pattern: string; category: string }> = []
): string {
    // 1. Check user-defined rules first (they override system)
    for (const rule of userRules) {
        try {
            if (new RegExp(rule.pattern, "i").test(title)) {
                return rule.category;
            }
        } catch {
            // malformed regex — skip
        }
    }

    // 2. Fall back to system rules
    for (const rule of SYSTEM_RULES) {
        if (rule.pattern.test(title)) {
            return rule.category;
        }
    }

    return "General";
}
