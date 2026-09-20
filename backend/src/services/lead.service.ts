import prisma from '../utils/db';

export class LeadService {
  /**
   * Creates a new lead safely. Uses distributor_ref_id as an idempotency key 
   * so network retries don't create duplicate leads.
   */
  static async createLead(data: any) {
    // 1. Idempotency Check
    const existingLead = await prisma.lead.findUnique({
      where: { distributor_ref_id: data.distributor_ref_id }
    });

    if (existingLead) {
      // If it exists, they probably dropped the connection and retried. 
      // Return the existing lead safely without throwing an error.
      return { lead: existingLead, isNew: false };
    }

    // 2. Parse optional date gracefully
    let dobDate = null;
    if (data.borrower.dob) {
      const parsedDate = new Date(data.borrower.dob);
      if (!isNaN(parsedDate.getTime())) dobDate = parsedDate;
    }

    // 3. Database Insertion
    const newLead = await prisma.lead.create({
      data: {
        distributor_ref_id: data.distributor_ref_id,
        borrower_name: data.borrower.name,
        mobile_number: data.borrower.mobile_number,
        address: data.borrower.address,
        pincode: data.borrower.pincode,
        dob: dobDate,
        
        gold_weight_grams: data.gold_weight_grams,
        interest_rate_pct: data.offer_accepted.interest_rate_pct,
        tenure_months: data.offer_accepted.tenure_months,
        ltv_pct: data.offer_accepted.ltv_pct,
        
        status: 'new', // Hardcoded initial status per requirements
      }
    });

    // 4. Internal Ops Alert
    // In production, this might trigger a Slack webhook or email service
    console.log(`🔔 [INTERNAL ALERT] New Lead Received! ID: ${newLead.id} | Name: ${newLead.borrower_name} | Gold: ${newLead.gold_weight_grams}g`);

    return { lead: newLead, isNew: true };
  }
}

