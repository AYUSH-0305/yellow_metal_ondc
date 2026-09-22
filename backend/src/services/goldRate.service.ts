export class GoldRateService {
  /**
   * Fetches the previous trading day's 5:30 PM closing gold price in rupees/gram.
   */
  static async getLiveGoldRates() {
    const url = process.env.GOLD_API_URL || "https://spot-app-bice.vercel.app/api/gold";
    const apiKey = process.env.GOLD_API_KEY || "5071d34e4d439940bb93e6ab563ba0e19088eb745f3897d5";

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        // 5-second timeout so the dashboard never hangs if the API is slow
        signal: AbortSignal.timeout(5000) 
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
        console.error("Gold API Error:", data.error || response.statusText);
        // Safe fallback in case the API key rotates or endpoint is down
        return { "24K": 7600, "22K": 7100, "20K": 6450, "18K": 5800 };
      }

      // Handle if the data is wrapped in a 'data' object or returned flat
      return data.data || data;
    } catch (error) {
      console.error("Failed to fetch live gold rates:", error);
      return { "24K": 7600, "22K": 7100, "20K": 6450, "18K": 5800 };
    }
  }

  /**
   * Calculates the maximum eligible loan amount for a lead based on the real-time 22K rate
   * and the strict 75% LTV (Loan-to-Value) cap mandated by RBI.
   */
  static async calculateMaxLoanAmount(goldWeightGrams: number): Promise<number> {
    const rates = await this.getLiveGoldRates();
    
    // Standard industry practice uses the 22K rate for valuations
    const rate22K = rates['22K'] || 7100;
    
    const totalGoldValue = goldWeightGrams * rate22K;
    const maxLoan = totalGoldValue * 0.75; 
    
    // Floor it to the nearest rupee
    return Math.floor(maxLoan);
  }
}
