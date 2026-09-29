import type { Card, CardRule, Category, Expense, FamilyData, FamilyMember, Tag } from '../types'
import { demoData } from '../data/demoData'
import { supabase } from './supabase'

const accents = [
  ['#163d48', '#dcecee'],
  ['#70503e', '#f1e4d7'],
  ['#6d4052', '#f0dfe5'],
  ['#385e55', '#dceee1'],
]

export type Workspace = {
  familyId: string
  familyName: string
  inviteCode: string
  role: 'admin' | 'member'
  data: FamilyData
}

export type NewCard = {
  name: string
  issuer: string
  lastFour: string
  ownerId: string
  ownerName: string
  cardType: string
  target: number
  billingStart: number
  billingEnd: number
  annualFee: number
  accent: string
  accentSoft: string
  active: boolean
}

export type NewRule = {
  cardId: string
  category: string
  tag?: string
  rewardType: 'percentage' | 'fixed' | 'points' | 'miles' | 'cashback'
  rewardValue: number
  rewardDescription: string
  priority: number
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and a publishable key.')
  return supabase
}

function displayName(profile: any) {
  return profile?.name || profile?.email?.split('@')[0] || 'Family member'
}

export async function loadWorkspace(userId: string): Promise<Workspace | null> {
  const client = requireClient()
  const membershipResult = await client.from('family_members').select('family_id, user_id, role').eq('user_id', userId).limit(1).maybeSingle()
  if (membershipResult.error) throw membershipResult.error
  if (!membershipResult.data) return null

  const familyId = membershipResult.data.family_id as string
  const [familyResult, memberResult, cardResult, categoryResult, tagResult, expenseResult] = await Promise.all([
    client.from('families').select('id, name, invite_code').eq('id', familyId).single(),
    client.from('family_members').select('family_id, user_id, role, joined_at').eq('family_id', familyId),
    client.from('cards').select('*').eq('family_id', familyId).eq('active', true).order('created_at'),
    client.from('categories').select('*').eq('family_id', familyId).order('name'),
    client.from('tags').select('*').eq('family_id', familyId).order('name'),
    client.from('expenses').select('*').eq('family_id', familyId).order('date', { ascending: false }).order('created_at', { ascending: false }),
  ])
  for (const result of [familyResult, memberResult, cardResult, categoryResult, tagResult, expenseResult]) {
    if (result.error) throw result.error
  }
  if (!familyResult.data) throw new Error('Family workspace not found.')

  const memberRows = (memberResult.data ?? []) as any[]
  const profileIds = memberRows.map((row) => row.user_id)
  const profileResult = profileIds.length
    ? await client.from('profiles').select('id, name, email, avatar_url').in('id', profileIds)
    : { data: [], error: null }
  if (profileResult.error) throw profileResult.error
  const profiles = new Map((profileResult.data ?? []).map((profile: any) => [profile.id, profile]))

  const cardRows = (cardResult.data ?? []) as any[]
  const cardIds = cardRows.map((row) => row.id)
  const ruleResult = cardIds.length
    ? await client.from('card_rules').select('*').in('card_id', cardIds).eq('active', true).order('priority', { ascending: false })
    : { data: [], error: null }
  if (ruleResult.error) throw ruleResult.error

  const expenseRows = (expenseResult.data ?? []) as any[]
  const expenseIds = expenseRows.map((row) => row.id)
  const expenseTagResult = expenseIds.length
    ? await client.from('expense_tags').select('expense_id, tag_id').in('expense_id', expenseIds)
    : { data: [], error: null }
  if (expenseTagResult.error) throw expenseTagResult.error

  const tagsByExpense = new Map<string, string[]>()
  for (const row of (expenseTagResult.data ?? []) as any[]) {
    tagsByExpense.set(row.expense_id, [...(tagsByExpense.get(row.expense_id) ?? []), row.tag_id])
  }
  const rulesByCard = new Map<string, any[]>()
  for (const row of (ruleResult.data ?? []) as any[]) {
    rulesByCard.set(row.card_id, [...(rulesByCard.get(row.card_id) ?? []), row])
  }

  const members: FamilyMember[] = memberRows.map((row) => {
    const profile = profiles.get(row.user_id)
    const name = displayName(profile)
    return { id: row.user_id, name, initials: name.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase(), role: row.role, color: row.user_id === userId ? '#1e6b62' : '#8b79b5' }
  })
  const categories: Category[] = ((categoryResult.data ?? []) as any[]).map((row, index) => ({ id: row.id, name: row.name, icon: row.icon ?? 'circle-dot', color: demoData.categories[index % demoData.categories.length]?.color ?? '#8b9291' }))
  const tags: Tag[] = ((tagResult.data ?? []) as any[]).map((row) => ({ id: row.id, name: row.name }))
  const cards: Card[] = cardRows.map((row, index) => {
    const owner = profiles.get(row.owner_id)
    const ownerName = displayName(owner)
    const [accent, accentSoft] = accents[index % accents.length]
    const rules: CardRule[] = (rulesByCard.get(row.id) ?? []).map((rule) => ({
      id: rule.id,
      category: rule.category,
      tag: rule.tag ?? undefined,
      minimumSpend: rule.minimum_spend ? Number(rule.minimum_spend) / 100 : undefined,
      maximumSpend: rule.maximum_spend ? Number(rule.maximum_spend) / 100 : undefined,
      rewardType: rule.reward_type,
      rewardValue: Number(rule.reward_value),
      rewardDescription: rule.reward_description,
      priority: rule.priority,
      active: rule.active,
    }))
    return {
      id: row.id, name: row.name, issuer: row.issuer, lastFour: row.last_four, ownerId: row.owner_id, ownerName,
      cardType: row.card_type, accent, accentSoft, target: Number(row.monthly_spend_target) / 100,
      billingStart: row.billing_cycle_start, billingEnd: row.billing_cycle_end, annualFee: Number(row.annual_fee) / 100,
      active: row.active, rules,
    }
  })
  const expenses: Expense[] = expenseRows.map((row) => ({
    id: row.id, cardId: row.card_id, createdBy: row.created_by, amount: Number(row.amount) / 100,
    merchant: row.merchant, categoryId: row.category_id, date: row.date, note: row.note ?? '', tagIds: tagsByExpense.get(row.id) ?? [],
  }))

  return {
    familyId,
    familyName: familyResult.data.name,
    inviteCode: familyResult.data.invite_code,
    role: membershipResult.data.role,
    data: { familyName: familyResult.data.name, members, categories, tags, cards, expenses },
  }
}

export async function createFamily(name: string) {
  const client = requireClient()
  const result = await client.rpc('create_family', { family_name: name })
  if (result.error) throw result.error
  return result.data as string
}

export async function joinFamily(inviteCode: string) {
  const client = requireClient()
  const result = await client.rpc('join_family', { invite_code_input: inviteCode.trim().toUpperCase() })
  if (result.error) throw result.error
  return result.data as string
}

export async function insertExpense(familyId: string, userId: string, expense: Expense) {
  const client = requireClient()
  const result = await client.from('expenses').insert({
    family_id: familyId, card_id: expense.cardId, created_by: userId, amount: Math.round(expense.amount * 100),
    merchant: expense.merchant.trim(), category_id: expense.categoryId, date: expense.date, note: expense.note.trim(),
  }).select('id').single()
  if (result.error) throw result.error
  if (expense.tagIds.length) {
    const tags = await client.from('expense_tags').insert(expense.tagIds.map((tagId) => ({ expense_id: result.data.id, tag_id: tagId })))
    if (tags.error) throw tags.error
  }
}

export async function removeExpense(id: string) {
  const result = await requireClient().from('expenses').delete().eq('id', id)
  if (result.error) throw result.error
}

export async function insertCard(familyId: string, card: NewCard) {
  const result = await requireClient().from('cards').insert({
    family_id: familyId, owner_id: card.ownerId, name: card.name.trim(), issuer: card.issuer.trim(),
    last_four: card.lastFour, card_type: card.cardType.trim() || 'Credit card',
    billing_cycle_start: card.billingStart, billing_cycle_end: card.billingEnd,
    monthly_spend_target: Math.round(card.target * 100), annual_fee: Math.round(card.annualFee * 100), active: true,
  })
  if (result.error) throw result.error
}

export async function updateCard(cardId: string, card: Partial<NewCard>) {
  const client = requireClient()
  const payload: any = {}
  if (card.name !== undefined) payload.name = card.name.trim()
  if (card.issuer !== undefined) payload.issuer = card.issuer.trim()
  if (card.lastFour !== undefined) payload.last_four = card.lastFour
  if (card.ownerId !== undefined) payload.owner_id = card.ownerId
  if (card.cardType !== undefined) payload.card_type = card.cardType.trim()
  if (card.target !== undefined) payload.monthly_spend_target = Math.round(card.target * 100)
  if (card.annualFee !== undefined) payload.annual_fee = Math.round(card.annualFee * 100)
  if (card.billingStart !== undefined) payload.billing_cycle_start = card.billingStart
  if (card.billingEnd !== undefined) payload.billing_cycle_end = card.billingEnd
  const result = await client.from('cards').update(payload).eq('id', cardId)
  if (result.error) throw result.error
}

export async function removeCard(cardId: string) {
  const result = await requireClient().from('cards').delete().eq('id', cardId)
  if (result.error) throw result.error
}

export async function insertRule(rule: NewRule) {
  const result = await requireClient().from('card_rules').insert({
    card_id: rule.cardId,
    category: rule.category,
    tag: rule.tag || null,
    reward_type: rule.rewardType,
    reward_value: rule.rewardValue,
    reward_description: rule.rewardDescription.trim(),
    priority: rule.priority,
    active: true,
  })
  if (result.error) throw result.error
}

export async function removeRule(ruleId: string) {
  const result = await requireClient().from('card_rules').delete().eq('id', ruleId)
  if (result.error) throw result.error
}

export async function updateExpense(expense: Expense) {
  const client = requireClient()
  const result = await client.from('expenses').update({
    card_id: expense.cardId,
    amount: Math.round(expense.amount * 100),
    merchant: expense.merchant.trim(),
    category_id: expense.categoryId,
    date: expense.date,
    note: expense.note.trim(),
  }).eq('id', expense.id)
  if (result.error) throw result.error

  await client.from('expense_tags').delete().eq('expense_id', expense.id)
  if (expense.tagIds.length) {
    const tags = await client.from('expense_tags').insert(expense.tagIds.map((tagId) => ({ expense_id: expense.id, tag_id: tagId })))
    if (tags.error) throw tags.error
  }
}

export async function updateWorkspaceName(familyId: string, name: string) {
  const result = await requireClient().from('families').update({ name: name.trim() }).eq('id', familyId)
  if (result.error) throw result.error
}

export async function removeFamilyMember(familyId: string, memberId: string) {
  const result = await requireClient().from('family_members').delete().eq('family_id', familyId).eq('user_id', memberId)
  if (result.error) throw result.error
}

export async function updateProfileName(userId: string, name: string) {
  const result = await requireClient().from('profiles').update({ name: name.trim() }).eq('id', userId)
  if (result.error) throw result.error
}