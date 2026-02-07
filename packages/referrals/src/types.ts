/**
 * Types for @fabrk/referrals
 *
 * Provider-agnostic referral/affiliate marketing types.
 * All persistence is via injectable store interfaces.
 */

// ============================================================================
// Enums
// ============================================================================

export type ReferralStatus = 'pending' | 'approved' | 'rejected'
export type ConversionType = 'signup' | 'purchase' | 'trial' | 'lead'
export type ConversionStatus = 'pending' | 'approved' | 'rejected'
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled'
export type CommissionRuleType = 'percentage' | 'fixed'
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type PayoutMethod = 'bank_transfer' | 'paypal' | 'stripe' | 'crypto' | 'other'

// ============================================================================
// Core Entities
// ============================================================================

export interface Affiliate {
  id: string
  userId: string
  referralCode: string
  balanceCents: number
  partnerGroupId?: string
  payoutDetails?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface Referral {
  id: string
  affiliateId: string
  leadName?: string
  leadEmail?: string
  leadPhone?: string
  status: ReferralStatus
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface ReferralClick {
  id: string
  affiliateId: string
  referralId?: string
  ipAddress?: string
  userAgent?: string
  referer?: string
  attributionKey?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface Conversion {
  id: string
  affiliateId: string
  referralId?: string
  eventType: ConversionType
  amountCents: number
  currency: string
  status: ConversionStatus
  customerEmail?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface Commission {
  id: string
  affiliateId: string
  conversionId?: string
  amountCents: number
  rate: number
  status: CommissionStatus
  ruleId?: string
  approvedBy?: string
  approvedAt?: Date
  paidAt?: Date
  createdAt: Date
}

export interface CommissionRule {
  id: string
  name: string
  type: CommissionRuleType
  /** For percentage: 0-100 (e.g. 10 = 10%). For fixed: amount in cents */
  value: number
  conditions?: Record<string, unknown>
  isDefault: boolean
  isActive: boolean
  createdAt: Date
}

export interface PartnerGroup {
  id: string
  name: string
  /** Commission rate as decimal (0-1), e.g. 0.20 = 20% */
  commissionRate: number
  signupUrl?: string
  isDefault: boolean
  createdAt: Date
}

export interface Payout {
  id: string
  affiliateId: string
  amountCents: number
  commissionCount: number
  method: PayoutMethod
  status: PayoutStatus
  processedAt?: Date
  notes?: string
  createdAt: Date
}

// ============================================================================
// Store Interfaces
// ============================================================================

export interface ReferralStore {
  // Affiliates
  getAffiliate(id: string): Promise<Affiliate | null>
  getAffiliateByCode(referralCode: string): Promise<Affiliate | null>
  getAffiliateByUserId(userId: string): Promise<Affiliate | null>
  createAffiliate(data: Omit<Affiliate, 'id' | 'createdAt' | 'updatedAt'>): Promise<Affiliate>
  updateAffiliate(id: string, data: Partial<Affiliate>): Promise<Affiliate>
  listAffiliates(): Promise<Affiliate[]>

  // Referrals
  getReferral(id: string): Promise<Referral | null>
  createReferral(data: Omit<Referral, 'id' | 'createdAt' | 'updatedAt'>): Promise<Referral>
  updateReferral(id: string, data: Partial<Referral>): Promise<Referral>
  listReferralsByAffiliate(affiliateId: string): Promise<Referral[]>

  // Clicks
  createClick(data: Omit<ReferralClick, 'id' | 'createdAt'>): Promise<ReferralClick>
  getClicksByAffiliate(affiliateId: string): Promise<ReferralClick[]>

  // Conversions
  createConversion(data: Omit<Conversion, 'id' | 'createdAt'>): Promise<Conversion>
  getConversionsByAffiliate(affiliateId: string): Promise<Conversion[]>

  // Commissions
  createCommission(data: Omit<Commission, 'id' | 'createdAt'>): Promise<Commission>
  updateCommission(id: string, data: Partial<Commission>): Promise<Commission>
  getCommissionsByAffiliate(affiliateId: string): Promise<Commission[]>
  getPendingCommissions(): Promise<Commission[]>

  // Commission Rules
  getCommissionRules(): Promise<CommissionRule[]>
  getDefaultRule(): Promise<CommissionRule | null>
  createCommissionRule(data: Omit<CommissionRule, 'id' | 'createdAt'>): Promise<CommissionRule>

  // Partner Groups
  getPartnerGroup(id: string): Promise<PartnerGroup | null>
  listPartnerGroups(): Promise<PartnerGroup[]>

  // Payouts
  createPayout(data: Omit<Payout, 'id' | 'createdAt'>): Promise<Payout>
  updatePayout(id: string, data: Partial<Payout>): Promise<Payout>
  getPayoutsByAffiliate(affiliateId: string): Promise<Payout[]>
}

// ============================================================================
// Function Options
// ============================================================================

export interface TrackClickOptions {
  referralCode: string
  ipAddress?: string
  userAgent?: string
  referer?: string
  metadata?: Record<string, unknown>
}

export interface TrackConversionOptions {
  referralCode: string
  eventType: ConversionType
  amountCents: number
  currency?: string
  customerEmail?: string
  metadata?: Record<string, unknown>
}

export interface CreatePayoutOptions {
  affiliateId: string
  commissionIds: string[]
  method: PayoutMethod
  notes?: string
}

export interface AffiliateStats {
  totalClicks: number
  totalConversions: number
  conversionRate: number
  totalEarningsCents: number
  pendingCommissionsCents: number
  paidCommissionsCents: number
}
