import type { FamilyData } from '../types'

const KEY = 'orbit-family-tracker-v1'

export function loadData(fallback: FamilyData): FamilyData {
  try {
    const saved = localStorage.getItem(KEY)
    return saved ? JSON.parse(saved) as FamilyData : fallback
  } catch {
    return fallback
  }
}

export function saveData(data: FamilyData) {
  localStorage.setItem(KEY, JSON.stringify(data))
}