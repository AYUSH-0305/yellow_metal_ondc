export interface ProvisionalOffer {
  loan_amount: number;
  interest_rate_pct_annual: number;
  interest_rate_pct_monthly: number;
  ltv_pct: number;
  tenure_months: number;
  plan_type: 'Monthly' | 'Bullet';
}

// In a real production environment, this would be fetched daily from a database or external API.
const MOCK_CURRENT_GOLD_RATE_PER_GRAM = 6500; 

/**
 * Computes a provisional offer based on Yellow Metal's official rate card.
 * Defaults to the 'Monthly' plan to offer the highest possible LTV (75%) to the borrower.
 */
export function computeOffer(goldWeightGrams: number): ProvisionalOffer {
  const LTV_PCT = 75; // Using Monthly plan LTV
  const TENURE_MONTHS = 12; // Standard default tenure
  
  // 1. Calculate the max loan amount they are eligible for
  const totalGoldValue = goldWeightGrams * MOCK_CURRENT_GOLD_RATE_PER_GRAM;
  const maxLoanAmount = Math.floor(totalGoldValue * (LTV_PCT / 100));

  // 2. Determine the Interest Rate based on the 'Monthly' plan tiers
  let monthlyRate = 1.88; // Default (20k to 50k tier)

  if (maxLoanAmount >= 1000001) {
    monthlyRate = 1.42;
  } else if (maxLoanAmount >= 500000) {
    monthlyRate = 1.42;
  } else if (maxLoanAmount >= 300000) {
    monthlyRate = 1.50;
  } else if (maxLoanAmount >= 100000) {
    monthlyRate = 1.58;
  } else if (maxLoanAmount >= 50000) {
    monthlyRate = 1.70;
  } else {
    // Under 50k falls into the 20k-49k bracket at 1.88%
    monthlyRate = 1.88; 
  }

  // Calculate annualized rate for standard API reporting
  const annualRate = parseFloat((monthlyRate * 12).toFixed(2));

  return {
    loan_amount: maxLoanAmount,
    interest_rate_pct_annual: annualRate,
    interest_rate_pct_monthly: monthlyRate,
    ltv_pct: LTV_PCT,
    tenure_months: TENURE_MONTHS,
    plan_type: 'Monthly'
  };
}

