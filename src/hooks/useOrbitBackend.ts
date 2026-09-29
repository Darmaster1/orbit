import { useCallback, useEffect, useState } from 'react'
import type { Card, Expense, FamilyData } from '../types'
import { demoData } from '../data/demoData'
import { loadData, saveData } from '../lib/storage'
import { isSupabaseConfigured, supabase, subscribeToFamily } from '../lib/supabase'
import { createFamily, insertCard, insertExpense, insertRule, joinFamily, loadWorkspace, removeExpense, type NewCard, type NewRule, type Workspace } from '../lib/supabaseData'

export type AppUser = { id: string; name: string; email: string }

export function useOrbitBackend() {
  const demo = !isSupabaseConfigured
  const [data, setData] = useState<FamilyData>(() => loadData(demoData))
  const [user, setUser] = useState<AppUser | null>(demo ? { id: 'mohnish', name: 'Mohnish', email: 'demo@orbit.local' } : null)
  const [workspace, setWorkspace] = useState<Workspace | null>(demo ? { familyId: '', familyName: demoData.familyName, inviteCode: 'DEMO2026', role: 'admin', data: loadData(demoData) } : null)
  const [loading, setLoading] = useState(!demo)
  const [error, setError] = useState('')

  const hydrate = useCallback(async (authUser: { id: string; email?: string | null; user_metadata?: { name?: string } }) => {
    setLoading(true)
    setError('')
    try {
      const nextUser = { id: authUser.id, name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Family member', email: authUser.email ?? '' }
      setUser(nextUser)
      const nextWorkspace = await loadWorkspace(authUser.id)
      setWorkspace(nextWorkspace)
      if (nextWorkspace) setData(nextWorkspace.data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your family workspace.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (demo || !supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (session?.user) void hydrate(session.user)
      else setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (session?.user) window.setTimeout(() => void hydrate(session.user), 0)
      else { setUser(null); setWorkspace(null); setLoading(false) }
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [demo, hydrate])

  const refresh = useCallback(async () => {
    if (demo || !user) return
    const nextWorkspace = await loadWorkspace(user.id)
    setWorkspace(nextWorkspace)
    if (nextWorkspace) setData(nextWorkspace.data)
  }, [demo, user])

  useEffect(() => {
    if (demo || !workspace?.familyId) return
    return subscribeToFamily(workspace.familyId, () => void refresh())
  }, [demo, refresh, workspace?.familyId])

  useEffect(() => { if (demo) saveData(data) }, [data, demo])

  const login = useCallback(async (email: string, password: string) => {
    if (!supabase) return
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.error) throw result.error
  }, [])
  const signup = useCallback(async (name: string, email: string, password: string) => {
    if (!supabase) return 'Demo mode is active.'
    const result = await supabase.auth.signUp({ email, password, options: { data: { name } } })
    if (result.error) throw result.error
    return result.data.session ? 'Account created.' : 'Check your email to confirm your account, then sign in.'
  }, [])
  const logout = useCallback(async () => { if (supabase) await supabase.auth.signOut() }, [])
  const makeFamily = useCallback(async (name: string) => { await createFamily(name); if (user) await hydrate({ id: user.id, email: user.email, user_metadata: { name: user.name } }) }, [hydrate, user])
  const enterFamily = useCallback(async (code: string) => { await joinFamily(code); if (user) await hydrate({ id: user.id, email: user.email, user_metadata: { name: user.name } }) }, [hydrate, user])
  const addExpense = useCallback(async (expense: Expense) => {
    if (demo || !workspace?.familyId || !user) setData((current) => ({ ...current, expenses: [expense, ...current.expenses] }))
    else { await insertExpense(workspace.familyId, user.id, expense); await refresh() }
  }, [demo, refresh, user, workspace?.familyId])
  const deleteExpense = useCallback(async (id: string) => {
    if (demo || !workspace?.familyId) setData((current) => ({ ...current, expenses: current.expenses.filter((expense) => expense.id !== id) }))
    else { await removeExpense(id); await refresh() }
  }, [demo, refresh, workspace?.familyId])
  const addCard = useCallback(async (card: NewCard) => {
    if (demo || !workspace?.familyId) {
      const next: Card = { ...card, id: `card-${Date.now()}`, rules: [] }
      setData((current) => ({ ...current, cards: [...current.cards, next] }))
    } else { await insertCard(workspace.familyId, card); await refresh() }
  }, [demo, refresh, workspace?.familyId])
  const addRule = useCallback(async (rule: NewRule) => {
    if (demo || !workspace?.familyId) {
      setData((current) => ({ ...current, cards: current.cards.map((card) => card.id === rule.cardId ? { ...card, rules: [...card.rules, { id: `rule-${Date.now()}`, category: rule.category, tag: rule.tag, rewardType: rule.rewardType, rewardValue: rule.rewardValue, rewardDescription: rule.rewardDescription, priority: rule.priority, active: true }] } : card) }))
    } else { await insertRule(rule); await refresh() }
  }, [demo, refresh, workspace?.familyId])

  return {
    data, user, workspace, loading, error, demo, authRequired: !demo,
    login, signup, logout, makeFamily, enterFamily, addExpense, deleteExpense, addCard, addRule,
  }
}