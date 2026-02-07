/**
 * In-memory referral store for development and testing.
 */

import type {
  ReferralStore,
  Affiliate,
  Referral,
  ReferralClick,
  Conversion,
  Commission,
  CommissionRule,
  PartnerGroup,
  Payout,
} from './types'

export class InMemoryReferralStore implements ReferralStore {
  private affiliates: Affiliate[] = []
  private referrals: Referral[] = []
  private clicks: ReferralClick[] = []
  private conversions: Conversion[] = []
  private commissions: Commission[] = []
  private rules: CommissionRule[] = []
  private groups: PartnerGroup[] = []
  private payouts: Payout[] = []
  private nextId = 1

  private id(): string {
    return String(this.nextId++)
  }

  // Affiliates
  async getAffiliate(id: string) {
    return this.affiliates.find((a) => a.id === id) || null
  }
  async getAffiliateByCode(referralCode: string) {
    return this.affiliates.find((a) => a.referralCode === referralCode) || null
  }
  async getAffiliateByUserId(userId: string) {
    return this.affiliates.find((a) => a.userId === userId) || null
  }
  async createAffiliate(data: Omit<Affiliate, 'id' | 'createdAt' | 'updatedAt'>) {
    const affiliate: Affiliate = { ...data, id: this.id(), createdAt: new Date(), updatedAt: new Date() }
    this.affiliates.push(affiliate)
    return affiliate
  }
  async updateAffiliate(id: string, data: Partial<Affiliate>) {
    const idx = this.affiliates.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error(`Affiliate ${id} not found`)
    this.affiliates[idx] = { ...this.affiliates[idx], ...data, updatedAt: new Date() }
    return this.affiliates[idx]
  }
  async listAffiliates() {
    return [...this.affiliates]
  }

  // Referrals
  async getReferral(id: string) {
    return this.referrals.find((r) => r.id === id) || null
  }
  async createReferral(data: Omit<Referral, 'id' | 'createdAt' | 'updatedAt'>) {
    const referral: Referral = { ...data, id: this.id(), createdAt: new Date(), updatedAt: new Date() }
    this.referrals.push(referral)
    return referral
  }
  async updateReferral(id: string, data: Partial<Referral>) {
    const idx = this.referrals.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error(`Referral ${id} not found`)
    this.referrals[idx] = { ...this.referrals[idx], ...data, updatedAt: new Date() }
    return this.referrals[idx]
  }
  async listReferralsByAffiliate(affiliateId: string) {
    return this.referrals.filter((r) => r.affiliateId === affiliateId)
  }

  // Clicks
  async createClick(data: Omit<ReferralClick, 'id' | 'createdAt'>) {
    const click: ReferralClick = { ...data, id: this.id(), createdAt: new Date() }
    this.clicks.push(click)
    return click
  }
  async getClicksByAffiliate(affiliateId: string) {
    return this.clicks.filter((c) => c.affiliateId === affiliateId)
  }

  // Conversions
  async createConversion(data: Omit<Conversion, 'id' | 'createdAt'>) {
    const conversion: Conversion = { ...data, id: this.id(), createdAt: new Date() }
    this.conversions.push(conversion)
    return conversion
  }
  async getConversionsByAffiliate(affiliateId: string) {
    return this.conversions.filter((c) => c.affiliateId === affiliateId)
  }

  // Commissions
  async createCommission(data: Omit<Commission, 'id' | 'createdAt'>) {
    const commission: Commission = { ...data, id: this.id(), createdAt: new Date() }
    this.commissions.push(commission)
    return commission
  }
  async updateCommission(id: string, data: Partial<Commission>) {
    const idx = this.commissions.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error(`Commission ${id} not found`)
    this.commissions[idx] = { ...this.commissions[idx], ...data }
    return this.commissions[idx]
  }
  async getCommissionsByAffiliate(affiliateId: string) {
    return this.commissions.filter((c) => c.affiliateId === affiliateId)
  }
  async getPendingCommissions() {
    return this.commissions.filter((c) => c.status === 'pending')
  }

  // Commission Rules
  async getCommissionRules() {
    return this.rules.filter((r) => r.isActive)
  }
  async getDefaultRule() {
    return this.rules.find((r) => r.isDefault && r.isActive) || null
  }
  async createCommissionRule(data: Omit<CommissionRule, 'id' | 'createdAt'>) {
    const rule: CommissionRule = { ...data, id: this.id(), createdAt: new Date() }
    this.rules.push(rule)
    return rule
  }

  // Partner Groups
  async getPartnerGroup(id: string) {
    return this.groups.find((g) => g.id === id) || null
  }
  async listPartnerGroups() {
    return [...this.groups]
  }

  // Payouts
  async createPayout(data: Omit<Payout, 'id' | 'createdAt'>) {
    const payout: Payout = { ...data, id: this.id(), createdAt: new Date() }
    this.payouts.push(payout)
    return payout
  }
  async updatePayout(id: string, data: Partial<Payout>) {
    const idx = this.payouts.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error(`Payout ${id} not found`)
    this.payouts[idx] = { ...this.payouts[idx], ...data }
    return this.payouts[idx]
  }
  async getPayoutsByAffiliate(affiliateId: string) {
    return this.payouts.filter((p) => p.affiliateId === affiliateId)
  }
}
