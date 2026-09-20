export const BRANCH_OFFICERS = [
  { name: "Suresh Rao", contact: "9845012233" },
  { name: "Anita Desai", contact: "9845012244" }
];

/**
 * Assigns a branch officer for the loan application.
 * In a real production system, this would likely involve a 
 * geographic lookup based on the borrower's pincode.
 */
export function assignOfficer() {
  return BRANCH_OFFICERS[Math.floor(Math.random() * BRANCH_OFFICERS.length)];
}

