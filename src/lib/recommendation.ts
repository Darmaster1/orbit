import type { Card, Category, Expense, Tag } from '../types'

export type Recommendation = {
  card: Card
  benefit: number
  score: number
  reasons: string[]
  missingRules?: boolean
}

export function recommend(cards: Card[], expenses: Expense[], categories: Category[], tags: Tag[], amount: number, categoryId: string, tagIds: string[]): Recommendation[] {
  const category = categories.find((item) => item.id === categoryId)
  return cards.filter((card) => card.active).map((card) => {
    const periodSpend = expenses.filter((expense) => expense.cardId === card.id && expense.date.startsWith('2026-09')).reduce((sum, expense) => sum + expense.amount, 0)
    const remaining = Math.max(0, card.target - periodSpend)
    const rules = card.rules.filter((rule) => rule.active && rule.category === categoryId && (!rule.tag || tagIds.includes(rule.tag)) && (!rule.minimumSpend || amount >= rule.minimumSpend) && (!rule.maximumSpend || amount <= rule.maximumSpend))
    const bestRule = rules.sort((a, b) => b.priority - a.priority)[0]
    if (!bestRule) return { card, benefit: 0, score: -1, reasons: ['Benefit information not configured.'], missingRules: true }
    const benefit = bestRule.rewardType === 'percentage' || bestRule.rewardType === 'cashback' ? amount * bestRule.rewardValue / 100 : bestRule.rewardValue
    const helpsTarget = remaining > 0
    const targetBoost = helpsTarget ? Math.min(amount, remaining) / 100 : -8
    const tagReason = bestRule.tag ? `Matches your ${tags.find((tag) => tag.id === bestRule.tag)?.name ?? bestRule.tag.toLowerCase()} rule` : `Configured for ${category?.name.toLowerCase() ?? 'this category'}`
    return {
      card,
      benefit,
      score: benefit + targetBoost + bestRule.priority,
      reasons: [tagReason, bestRule.rewardDescription, helpsTarget ? `This purchase moves you ${remaining <= amount ? 'to your target' : 'toward your target'}` : 'Monthly target already reached'],
    }
  }).sort((a, b) => b.score - a.score)
}