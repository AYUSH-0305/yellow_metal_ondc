import prisma from '../utils/db';

export class GoldRateService {
  /**
   * Simulates the 8:00 AM Cron Job that fetches IBJA rates,
   * applies the RBI "Lower-of-Two" rule, and saves today's official rate.
   */
  static async updateTodaysRate(): Promise<number> {
    // In production, you would fetch these from an external API (like GoldAPI.io)
    const mockYesterdayClose = 6550.00;
    const mockThirtyDayAvg = 6480.00;
    
    // RBI Rule: Lower of the two
    const officialRate = Math.min(mockYesterdayClose, mockThirtyDayAvg);

    // Normalize today's date to midnight for unique constraints
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyGoldRate.upsert({
      where: { date: today },
      update: { rate_per_gram: officialRate },
      create: {
        date: today,
        rate_per_gram: officialRate,
        source: "IBJA_LOWER_OF_TWO"
      }
    });

    console.log(`✅ Official RBI-compliant Gold Rate updated for ${today.toDateString()}: ₹${officialRate}/g`);
    return officialRate;
  }

  /**
   * Fast DB lookup for the Offer Engine. Zero latency, highly scalable.
   */
  static async getTodaysOfficialRate(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await prisma.dailyGoldRate.findUnique({
      where: { date: today }
    });

    if (!record) {
      // Fallback: If the 8:00 AM cron job failed, force an immediate sync
      return await this.updateTodaysRate();
    }

    return record.rate_per_gram;
  }
}

