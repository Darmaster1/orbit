export type Tab = 'dashboard' | 'cards' | 'expenses' | 'reports' | 'settings' | 'profile'
export type Role = 'admin' | 'member'
export type RewardType = 'percentage' | 'fixed' | 'points' | 'miles' | 'cashback'

export type FamilyMember = {
  id: string
  name: string
  initials: string
  role: Role
  color: string
  email?: string
}

export type Category = {
  id: string
  name: string
  icon: string
  color: string
}

export type Tag = {
  id: string
  name: string
}

export type CardRule = {
  id: string
  category: string
  tag?: string
  rewardType: RewardType
  rewardValue: number
  rewardDescription: string
  minimumSpend?: number
  maximumSpend?: number
  priority: number
  active: boolean
}

export type Card = {
  id: string
  name: string
  issuer: string
  lastFour: string
  ownerId: string
  ownerName: string
  cardType: string
  accent: string
  accentSoft: string
  target: number
  billingStart: number
  billingEnd: number
  annualFee?: number
  active: boolean
  rules: CardRule[]
}

export type Expense = {
  id: string
  cardId: string
  createdBy: string
  amount: number
  merchant: string
  categoryId: string
  date: string
  note: string
  tagIds: string[]
}

export type FamilyData = {
  familyName: string
  members: FamilyMember[]
  categories: Category[]
  tags: Tag[]
  cards: Card[]
  expenses: Expense[]
}