import { useEffect, useState, type ComponentType } from 'react'
import {
  ArrowDownToLine, ArrowRight, BadgeIndianRupee, BarChart3, Bell, BookOpen, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, CreditCard, Edit3, Ellipsis, Filter, Flame, Gauge, Gift, Home, Lightbulb,
  LogOut, Menu, MoreHorizontal, Pencil, Plus, ReceiptText, Search, Settings2, SlidersHorizontal, Sparkles, Tag,
  Trash2, TrendingUp, User as UserIcon, Users, Wallet, X, Zap
} from 'lucide-react'
import type { Card, CardRule, Expense, FamilyData, FamilyMember, Tab } from './types'
import { compactMoney, formatDate, money, monthName, relativeDate } from './lib/format'
import { recommend, type Recommendation } from './lib/recommendation'
import { useOrbitBackend } from './hooks/useOrbitBackend'
import type { NewCard, NewRule } from './lib/supabaseData'

const iconMap: Record<string, ComponentType<any>> = { shopping: ShoppingIcon, travel: PlaneIcon, food: UtensilsIcon, groceries: BasketIcon, bills: ReceiptText, fuel: FuelIcon, entertainment: ClapperIcon, electronics: LaptopIcon, healthcare: HeartIcon, education: BookOpen, other: CircleHelp }
function ShoppingIcon() { return <Tag size={16} /> }
function PlaneIcon() { return <span className="emoji-icon">✈</span> }
function UtensilsIcon() { return <span className="emoji-icon">♨</span> }
function BasketIcon() { return <span className="emoji-icon">⌁</span> }
function FuelIcon() { return <span className="emoji-icon">◒</span> }
function ClapperIcon() { return <span className="emoji-icon">◉</span> }
function LaptopIcon() { return <span className="emoji-icon">▣</span> }
function HeartIcon() { return <span className="emoji-icon">♥</span> }

function App() {
  const backend = useOrbitBackend()
  const { data, user, workspace } = backend
  const [tab, setTab] = useState<Tab>('dashboard')
  const [showExpense, setShowExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [showRecommend, setShowRecommend] = useState(false)
  const [showCardForm, setShowCardForm] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [showRuleFor, setShowRuleFor] = useState<Card | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [toast, setToast] = useState('')
  const [dark, setDark] = useState(false)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (backend.loading) return <LoadingScreen />
  if (backend.authRequired && !user) return <AuthScreen onLogin={backend.login} onSignup={backend.signup} error={backend.error} />
  if (backend.authRequired && user && !workspace) return <WorkspaceSetup user={user} onCreate={backend.makeFamily} onJoin={backend.enterFamily} onLogout={backend.logout} error={backend.error} />

  const addExpense = async (expense: Expense) => {
    try {
      if (editingExpense) {
        await backend.editExpense(expense)
        setToast('Expense updated')
      } else {
        await backend.addExpense(expense)
        setToast(backend.demo ? 'Expense added locally' : 'Expense added and synced')
      }
      setShowExpense(false)
      setEditingExpense(null)
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : 'Could not save expense')
    }
  }

  const deleteExpense = async (id: string) => {
    try {
      await backend.deleteExpense(id)
      setToast('Expense removed')
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : 'Could not remove expense')
    }
  }

  const saveCard = async (cardData: NewCard) => {
    try {
      if (editingCard) {
        await backend.editCard(editingCard.id, cardData)
        setToast('Card details updated')
      } else {
        await backend.addCard(cardData)
        setToast(backend.demo ? 'Card added locally' : 'Card added and synced')
      }
      setShowCardForm(false)
      setEditingCard(null)
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : 'Could not save card')
    }
  }

  const deleteCard = async (cardId: string) => {
    try {
      await backend.deleteCard(cardId)
      setSelectedCard(null)
      setShowCardForm(false)
      setEditingCard(null)
      setToast('Card removed')
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : 'Could not delete card')
    }
  }

  const addRule = async (rule: NewRule) => {
    try {
      await backend.addRule(rule)
      setShowRuleFor(null)
      setToast(backend.demo ? 'Benefit added locally' : 'Benefit added and synced')
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : 'Could not add benefit')
    }
  }

  const deleteRule = async (cardId: string, ruleId: string) => {
    try {
      await backend.deleteRule(cardId, ruleId)
      setToast('Benefit removed')
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : 'Could not remove benefit')
    }
  }

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <div className="app-shell">
        <Sidebar tab={tab} setTab={setTab} dark={dark} setDark={setDark} data={data} user={user} workspace={workspace} onLogout={backend.logout} demo={backend.demo} />
        <main className="main">
          <MobileHeader tab={tab} user={user} setTab={setTab} />
          {tab === 'dashboard' && <Dashboard data={data} user={user} onAdd={() => { setEditingExpense(null); setShowExpense(true) }} onRecommend={() => setShowRecommend(true)} onCard={setSelectedCard} setTab={setTab} />}
          {tab === 'cards' && <CardsPage data={data} onCard={setSelectedCard} onAdd={() => { setEditingCard(null); setShowCardForm(true) }} canAdd={backend.demo || workspace?.role === 'admin'} onEditCard={(c) => { setEditingCard(c); setShowCardForm(true) }} onDeleteCard={deleteCard} />}
          {tab === 'expenses' && <ExpensesPage data={data} onAdd={() => { setEditingExpense(null); setShowExpense(true) }} onEdit={(e) => { setEditingExpense(e); setShowExpense(true) }} onDelete={deleteExpense} />}
          {tab === 'reports' && <ReportsPage data={data} />}
          {tab === 'settings' && <SettingsPage data={data} workspace={workspace} user={user} demo={backend.demo} onUpdateWorkspace={backend.updateWorkspace} onAddMember={backend.addMember} onDeleteMember={backend.deleteMember} setToast={setToast} />}
          {tab === 'profile' && <ProfilePage user={user} workspace={workspace} onUpdateProfile={backend.updateProfile} onLogout={backend.logout} setToast={setToast} />}
        </main>
      </div>
      <button className="floating-action" onClick={() => { setEditingExpense(null); setShowExpense(true) }}><Plus size={20} strokeWidth={2.5} /><span>Expense</span></button>
      <div className="mobile-nav">
        {navItems.map((item) => <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} />)}
      </div>
      {showExpense && <ExpenseModal data={data} initialExpense={editingExpense} onClose={() => { setShowExpense(false); setEditingExpense(null) }} onSave={addExpense} />}
      {showCardForm && <CardModal data={data} initialCard={editingCard} onClose={() => { setShowCardForm(false); setEditingCard(null) }} onSave={saveCard} onDelete={editingCard ? () => deleteCard(editingCard.id) : undefined} />}
      {showRecommend && <RecommendationModal data={data} onClose={() => setShowRecommend(false)} />}
      {selectedCard && <CardDetail card={data.cards.find((card) => card.id === selectedCard.id) ?? selectedCard} data={data} onClose={() => setSelectedCard(null)} onAdd={() => { setSelectedCard(null); setEditingExpense(null); setShowExpense(true) }} canManage={backend.demo || workspace?.role === 'admin'} onAddRule={() => setShowRuleFor(selectedCard)} onEditCard={() => { const c = selectedCard; setSelectedCard(null); setEditingCard(c); setShowCardForm(true) }} onDeleteCard={() => deleteCard(selectedCard.id)} onDeleteRule={(ruleId) => deleteRule(selectedCard.id, ruleId)} />}
      {showRuleFor && <RuleModal card={data.cards.find((card) => card.id === showRuleFor.id) ?? showRuleFor} data={data} onClose={() => setShowRuleFor(null)} onSave={addRule} />}
      {toast && <div className="toast"><Check size={17} /> {toast}</div>}
    </div>
  )
}

const navItems: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'expenses', label: 'Activity', icon: ReceiptText },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
]

function NavButton({ item, active, onClick }: { item: typeof navItems[number]; active: boolean; onClick: () => void }) {
  const Icon = item.icon
  return <button className={active ? 'nav-item active' : 'nav-item'} onClick={onClick}><Icon size={19} /><span>{item.label}</span></button>
}

function Sidebar({ tab, setTab, dark, setDark, data, user, workspace, onLogout, demo }: { tab: Tab; setTab: (tab: Tab) => void; dark: boolean; setDark: (value: boolean) => void; data: FamilyData; user: { name: string; id: string } | null; workspace: { familyName: string; inviteCode: string; role: string } | null; onLogout: () => Promise<void>; demo: boolean }) {
  const currentMember = data.members.find((member) => member.id === user?.id)
  const copyInvite = async () => {
    if (!workspace?.inviteCode || demo) return
    await navigator.clipboard?.writeText(workspace.inviteCode)
  }
  return <aside className="sidebar">
    <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setTab('dashboard')}><div className="brand-mark">o</div><span>orbit</span></div>
    <div className="workspace" style={{ cursor: 'pointer' }} onClick={() => setTab('settings')}>
      <div className="family-avatar">{workspace?.familyName.slice(0, 1).toUpperCase() ?? 'T'}</div>
      <div><small>Family workspace</small><strong>{workspace?.familyName ?? 'The Tulsians'}</strong></div>
      <ChevronDown size={15} />
    </div>
    <nav className="side-nav">
      {navItems.map((item) => <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} />)}
    </nav>
    <div className="sidebar-bottom">
      <div className="sync-status"><span className="pulse" /> {demo ? 'Demo mode · local sync' : 'Live sync enabled'}</div>
      <button className="side-link" onClick={copyInvite}><Users size={17} /> Invite family <span className="side-count">{demo ? 'DEMO' : workspace?.inviteCode}</span></button>
      <button className={tab === 'settings' ? 'side-link active' : 'side-link'} onClick={() => setTab('settings')}><Settings2 size={17} /> Settings</button>
      <button className="theme-toggle" onClick={() => setDark(!dark)}><span>{dark ? '☼' : '☾'}</span>{dark ? 'Light mode' : 'Dark mode'}</button>
      <button className="profile profile-button" onClick={() => setTab('profile')}>
        <div className="avatar avatar-teal">{currentMember?.initials ?? user?.name.slice(0, 2).toUpperCase() ?? 'MT'}</div>
        <div><strong>{user?.name ?? 'Mohnish'}</strong><small>{workspace?.role === 'admin' ? 'Administrator' : 'Member'}</small></div>
        <UserIcon size={17} />
      </button>
    </div>
  </aside>
}

function MobileHeader({ tab, user, setTab }: { tab: Tab; user: { name: string } | null; setTab: (t: Tab) => void }) {
  const title = navItems.find((item) => item.id === tab)?.label ?? (tab === 'settings' ? 'Settings' : tab === 'profile' ? 'Profile' : 'Home')
  const initials = user?.name ? user.name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() : 'MT'
  return <header className="mobile-header"><div className="brand" onClick={() => setTab('dashboard')}><div className="brand-mark">o</div><span>orbit</span></div><div className="mobile-header-actions"><button aria-label="Settings" onClick={() => setTab('settings')}><Settings2 size={19} /></button><div className="avatar avatar-teal" style={{ cursor: 'pointer' }} onClick={() => setTab('profile')}>{initials}</div></div><span className="mobile-title">{title}</span></header>
}

function Dashboard({ data, user, onAdd, onRecommend, onCard, setTab }: { data: FamilyData; user: { name: string } | null; onAdd: () => void; onRecommend: () => void; onCard: (card: Card) => void; setTab: (tab: Tab) => void }) {
  const total = data.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const recent = data.expenses.slice(0, 5)
  const targetCards = data.cards.map((card) => ({ card, spent: cardSpend(card, data.expenses) }))
  const needsAttention = targetCards.filter(({ card, spent }) => spent < card.target).sort((a, b) => (b.card.target - b.spent) - (a.card.target - a.spent))[0]
  const firstName = user?.name ? user.name.split(' ')[0] : 'Mohnish'
  return <div className="page">
    <div className="topbar"><div><p className="eyebrow">Tuesday, 29 September 2026 <span className="live-dot" /> Live</p><h1>Good morning, {firstName} <span className="wave">✦</span></h1><p className="muted">Here’s how the family is doing this month.</p></div><div className="top-actions"><button className="icon-button"><Bell size={18} /><i /></button><div className="avatar avatar-teal" style={{ cursor: 'pointer' }} onClick={() => setTab('profile')}>{firstName.slice(0, 2).toUpperCase()}</div></div></div>
    <section className="hero-grid">
      <div className="spend-hero"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-content"><span className="eyebrow light">Family spending · September 2026</span><strong>{money(total)}</strong><span className="hero-compare"><TrendingUp size={14} /> 12.4% vs August</span><div className="hero-footer"><span>Across {data.expenses.length} expenses</span><span>Updated just now</span></div></div></div>
      <div className="quick-actions"><p className="section-kicker">Quick actions</p><button className="quick-card primary" onClick={onAdd}><span className="quick-icon"><Plus size={20} /></span><span><strong>Add an expense</strong><small>Log a purchase in seconds</small></span><ArrowRight size={17} /></button><button className="quick-card" onClick={onRecommend}><span className="quick-icon gold"><Sparkles size={19} /></span><span><strong>Which card should I use?</strong><small>Get a clear recommendation</small></span><ArrowRight size={17} /></button></div>
    </section>
    {needsAttention && <div className="notice"><span className="notice-icon"><Zap size={16} /></span><span><strong>{money(needsAttention.card.target - needsAttention.spent)} to go</strong> to reach {needsAttention.card.name}’s monthly target.</span><button onClick={() => onCard(needsAttention.card)}>View card <ArrowRight size={14} /></button></div>}
    <section className="section-block"><SectionHeading title="Card overview" action="View all cards" onAction={() => setTab('cards')} /><div className="card-grid">{targetCards.map(({ card, spent }) => <CardTile key={card.id} card={card} spent={spent} onClick={() => onCard(card)} />)}</div></section>
    <section className="section-block lower-grid"><div><SectionHeading title="Recent activity" action="See all" onAction={() => setTab('expenses')} /><div className="activity-list">{recent.map((expense) => <ExpenseRow key={expense.id} expense={expense} data={data} />)}</div></div><Insights data={data} /></section>
  </div>
}

function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="section-heading"><h2>{title}</h2>{action && <button onClick={onAction}>{action} <ArrowRight size={14} /></button>}</div>
}

function CardTile({ card, spent, onClick }: { card: Card; spent: number; onClick: () => void }) {
  const percent = Math.min(100, Math.round(spent / card.target * 100))
  return <button className="card-tile" onClick={onClick}><div className="card-top"><div><span className="card-issuer">{card.issuer}</span><strong>{card.name}</strong></div><span className="card-dots">•••</span></div><div className="card-number">•••• {card.lastFour}</div><div className="mini-progress"><span style={{ width: `${percent}%`, background: card.accent }} /></div><div className="card-amounts"><strong>{money(spent)} <span>/ {money(card.target)}</span></strong><span>{Math.max(0, card.target - spent) > 0 ? `${compactMoney(card.target - spent)} remaining` : 'Target reached'}</span></div><div className="card-meta"><span><div className="avatar tiny" style={{ background: card.accent }}>{card.ownerName[0]}</div> {card.ownerName}</span><span>{percent}% used</span></div></button>
}

function ExpenseRow({ expense, data }: { expense: Expense; data: FamilyData }) {
  const card = data.cards.find((item) => item.id === expense.cardId)
  const category = data.categories.find((item) => item.id === expense.categoryId)
  const Icon = iconMap[expense.categoryId] ?? CircleHelp
  return <div className="expense-row"><div className="expense-icon" style={{ background: `${category?.color}20`, color: category?.color }}><Icon size={17} /></div><div className="expense-main"><strong>{expense.merchant}</strong><span>{card?.name} <i>·</i> {category?.name}</span></div><div className="expense-right"><strong>{money(expense.amount)}</strong><span>{relativeDate(expense.date)}</span></div></div>
}

function Insights({ data }: { data: FamilyData }) {
  const categoryTotals = data.categories.map((category) => ({ category, amount: data.expenses.filter((expense) => expense.categoryId === category.id).reduce((sum, expense) => sum + expense.amount, 0) })).filter((item) => item.amount).sort((a, b) => b.amount - a.amount)
  return <div className="insights-card"><div className="insight-title"><span className="spark"><Sparkles size={16} /></span><strong>Monthly insights</strong><span className="beta">Auto</span></div><div className="insight-item"><span className="insight-bullet green"><TrendingUp size={14} /></span><p><strong>{categoryTotals[0]?.category.name ?? 'Shopping'}</strong> is your largest spending category this month.</p></div><div className="insight-item"><span className="insight-bullet gold"><Gauge size={14} /></span><p><strong>{data.cards.filter((card) => cardSpend(card, data.expenses) >= card.target).length} cards</strong> reached their configured monthly targets.</p></div><div className="insight-item"><span className="insight-bullet purple"><Flame size={14} /></span><p>Most delivery spending was made using <strong>HDFC Millennia</strong>.</p></div></div>
}

function CardsPage({ data, onCard, onAdd, canAdd, onEditCard, onDeleteCard }: { data: FamilyData; onCard: (card: Card) => void; onAdd: () => void; canAdd: boolean; onEditCard: (card: Card) => void; onDeleteCard: (cardId: string) => void }) {
  return <div className="page"><PageTitle eyebrow="Your wallet" title="Cards" subtitle={`${data.cards.length} active cards shared with your family`} action={canAdd ? <button className="button button-dark" onClick={onAdd}><Plus size={16} /> Add card</button> : undefined} /><div className="cards-page-grid">{data.cards.map((card) => <div key={card.id}><CardTile card={card} spent={cardSpend(card, data.expenses)} onClick={() => onCard(card)} /><div className="card-rule-summary"><span><Gift size={14} /> {card.rules.length} benefits configured</span><span>{card.billingStart === 1 ? 'Calendar month' : `${card.billingStart}th → ${card.billingEnd}th cycle`}</span></div><div className="card-actions-row"><button className="button button-outline compact" onClick={() => onEditCard(card)}><Pencil size={13} /> Edit</button>{canAdd && <button className="button button-outline compact danger-button" onClick={() => onDeleteCard(card.id)}><Trash2 size={13} /> Remove</button>}</div></div>)}</div><div className="secure-note"><span><BadgeIndianRupee size={19} /></span><p><strong>Your card data stays safe</strong><br />Orbit only stores the card name, issuer, owner, and last 4 digits. Never enter a full card number, CVV, PIN, or banking password.</p></div></div>
}

function ExpensesPage({ data, onAdd, onEdit, onDelete }: { data: FamilyData; onAdd: () => void; onEdit: (expense: Expense) => void; onDelete: (id: string) => void }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All cards')
  const visible = data.expenses.filter((expense) => {
    const card = data.cards.find((item) => item.id === expense.cardId)
    return `${expense.merchant} ${card?.name}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'All cards' || card?.name === filter)
  })
  return <div className="page"><PageTitle eyebrow="Shared ledger" title="Expenses" subtitle={`${visible.length} purchases this month`} action={<button className="button button-dark" onClick={onAdd}><Plus size={16} /> Add expense</button>} /><div className="filters"><div className="search-box"><Search size={17} /><input placeholder="Search merchant or card" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="select-box"><Filter size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All cards</option>{data.cards.map((card) => <option key={card.id}>{card.name}</option>)}</select><ChevronDown size={15} /></div><button className="filter-button"><SlidersHorizontal size={16} /> Filters</button></div><div className="expense-table"><div className="table-head"><span>Purchase</span><span>Card</span><span>Added by</span><span>Date</span><span>Amount</span><span style={{ textAlign: 'right' }}>Actions</span></div>{visible.map((expense) => <ExpenseTableRow key={expense.id} expense={expense} data={data} onEdit={onEdit} onDelete={onDelete} />)}</div></div>
}

function ExpenseTableRow({ expense, data, onEdit, onDelete }: { expense: Expense; data: FamilyData; onEdit: (expense: Expense) => void; onDelete: (id: string) => void }) {
  const card = data.cards.find((item) => item.id === expense.cardId)
  const category = data.categories.find((item) => item.id === expense.categoryId)
  const owner = data.members.find((member) => member.id === expense.createdBy)
  const Icon = iconMap[expense.categoryId] ?? CircleHelp
  return <div className="table-row"><div className="purchase-cell"><div className="expense-icon small" style={{ background: `${category?.color}20`, color: category?.color }}><Icon size={15} /></div><div><strong>{expense.merchant}</strong><span>{category?.name} {expense.tagIds.slice(0, 2).map((id) => <em key={id}>{data.tags.find((tag) => tag.id === id)?.name}</em>)}</span></div></div><div className="card-cell"><span className="card-dot" style={{ background: card?.accent }} />{card?.name}<small>•••• {card?.lastFour}</small></div><div className="owner-cell"><div className="avatar tiny" style={{ background: owner?.color }}>{owner?.initials[0]}</div>{owner?.name}</div><span className="date-cell">{formatDate(expense.date)}</span><strong className="amount-cell">{money(expense.amount)}</strong><div className="table-actions"><button onClick={() => onEdit(expense)} title="Edit expense"><Pencil size={14} /></button><button className="delete-btn" onClick={() => onDelete(expense.id)} title="Delete expense"><Trash2 size={14} /></button></div></div>
}

function SettingsPage({ data, workspace, user, demo, onUpdateWorkspace, onAddMember, onDeleteMember, setToast }: { data: FamilyData; workspace: { familyName: string; inviteCode: string; role: string } | null; user: { id: string; name: string } | null; demo: boolean; onUpdateWorkspace: (name: string) => Promise<void>; onAddMember: (name: string, role: 'admin' | 'member') => Promise<void>; onDeleteMember: (id: string) => Promise<void>; setToast: (msg: string) => void }) {
  const [familyName, setFamilyName] = useState(workspace?.familyName ?? data.familyName)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member')
  const [busy, setBusy] = useState(false)

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await onUpdateWorkspace(familyName)
      setToast('Workspace name updated')
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : 'Could not update workspace')
    } finally {
      setBusy(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberName.trim()) return
    setBusy(true)
    try {
      await onAddMember(newMemberName.trim(), newMemberRole)
      setNewMemberName('')
      setToast(`Added ${newMemberName} to family`)
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : 'Could not add member')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteMember = async (id: string, name: string) => {
    try {
      await onDeleteMember(id)
      setToast(`Removed ${name}`)
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : 'Could not remove member')
    }
  }

  const copyInvite = async () => {
    if (!workspace?.inviteCode || demo) return
    await navigator.clipboard?.writeText(workspace.inviteCode)
    setToast('Invite code copied to clipboard!')
  }

  return <div className="page">
    <PageTitle eyebrow="Workspace configuration" title="Family Settings" subtitle="Manage your household workspace, members, and permissions" />
    <div className="settings-grid">
      <div className="settings-card">
        <h2><Users size={18} /> Workspace Details</h2>
        <form className="expense-form" onSubmit={handleUpdateWorkspace}>
          <label>Family Workspace Name
            <input value={familyName} onChange={(e) => setFamilyName(e.target.value)} required />
          </label>
          <div className="modal-actions">
            <button className="button button-dark" disabled={busy}>Save Workspace Name</button>
          </div>
        </form>
      </div>

      <div className="settings-card">
        <h2><Users size={18} /> Family Members ({data.members.length})</h2>
        <p>People sharing cards and logging expenses in this workspace.</p>
        <div className="member-list" style={{ display: 'grid', gap: '10px' }}>
          {data.members.map((member) => (
            <div key={member.id} className="member-item">
              <div className="member-info">
                <div className="avatar" style={{ background: member.color }}>{member.initials}</div>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.email ?? `${member.name.toLowerCase()}@orbit.local`}</small>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="role-badge">{member.role}</span>
                {member.id !== user?.id && data.members.length > 1 && (
                  <button className="button button-outline compact danger-button" onClick={() => handleDeleteMember(member.id, member.name)}><Trash2 size={13} /></button>
                )}
              </div>
            </div>
          ))}
        </div>

        <form className="expense-form" onSubmit={handleAddMember} style={{ marginTop: '14px' }}>
          <label>Add New Family Member</label>
          <div className="form-row">
            <input placeholder="Member Name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} required />
            <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as any)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button className="button button-dark" disabled={busy}><Plus size={16} /> Add Member</button>
        </form>
      </div>

      <div className="settings-card">
        <h2><Gift size={18} /> Invite Code</h2>
        <p>Share this code with your family members so they can join your workspace during setup.</p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input readOnly value={demo ? 'DEMO-INVITE-2026' : (workspace?.inviteCode ?? 'NO-CODE')} style={{ fontFamily: 'DM Mono', fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px' }} />
          <button className="button button-outline" onClick={copyInvite}>Copy Invite</button>
        </div>
      </div>
    </div>
  </div>
}

function ProfilePage({ user, workspace, onUpdateProfile, onLogout, setToast }: { user: { name: string; email: string } | null; workspace: { familyName: string; role: string } | null; onUpdateProfile: (name: string) => Promise<void>; onLogout: () => Promise<void>; setToast: (msg: string) => void }) {
  const [name, setName] = useState(user?.name ?? '')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await onUpdateProfile(name)
      setToast('Profile updated')
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : 'Could not update profile')
    } finally {
      setBusy(false)
    }
  }

  const initials = user?.name ? user.name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() : 'MT'

  return <div className="page">
    <PageTitle eyebrow="Account management" title="My Profile" subtitle="Manage your personal profile and account credentials" />
    <div className="profile-card">
      <div className="profile-header-block">
        <div className="profile-avatar-lg">{initials}</div>
        <div>
          <h2>{user?.name ?? 'Mohnish'}</h2>
          <p className="muted">{user?.email ?? 'mohnish@tulsian.family'}</p>
          <span className="role-badge" style={{ marginTop: '6px', display: 'inline-block' }}>{workspace?.role === 'admin' ? 'Administrator' : 'Member'}</span>
        </div>
      </div>

      <form className="expense-form" onSubmit={handleSubmit}>
        <label>Display Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>Email Address
          <input value={user?.email ?? ''} disabled style={{ background: 'var(--soft)', cursor: 'not-allowed' }} />
        </label>
        <div className="modal-actions" style={{ marginTop: '10px' }}>
          <button className="button button-dark" disabled={busy}>Update Profile</button>
        </div>
      </form>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>Sign Out</strong>
          <p className="muted" style={{ fontSize: '11px', margin: 0 }}>Log out of your Orbit account on this device.</p>
        </div>
        <button className="button button-outline danger-button" onClick={() => void onLogout()}><LogOut size={16} /> Sign Out</button>
      </div>
    </div>
  </div>
}

function ReportsPage({ data }: { data: FamilyData }) {
  const [month, setMonth] = useState('September 2026')
  const total = data.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const categoryTotals = data.categories.map((category) => ({ ...category, amount: data.expenses.filter((expense) => expense.categoryId === category.id).reduce((sum, expense) => sum + expense.amount, 0) })).filter((item) => item.amount).sort((a, b) => b.amount - a.amount)
  const maxCategory = Math.max(...categoryTotals.map((item) => item.amount), 1)
  return <div className="page"><PageTitle eyebrow="Make sense of the month" title="Reports" subtitle="A clear view of how your family is spending" action={<button className="button button-outline"><ArrowDownToLine size={16} /> Export CSV</button>} /><div className="report-toolbar"><button className="month-switch"><ChevronLeft size={16} onClick={() => setMonth('August 2026')} />{month}<ChevronRight size={16} onClick={() => setMonth('October 2026')} /></button><span className="report-updated"><span className="live-dot" /> Calculated from actual transactions</span></div><div className="report-stats"><div><span>Total family spending</span><strong>{money(total)}</strong><small className="positive"><TrendingUp size={13} /> 12.4% vs August</small></div><div><span>Average per expense</span><strong>{data.expenses.length ? money(Math.round(total / data.expenses.length)) : '₹0'}</strong><small>{data.expenses.length} expenses logged</small></div><div><span>Online vs offline</span><strong>68% <small className="muted">online</small></strong><small>₹{Math.round(total * .32).toLocaleString('en-IN')} offline</small></div></div><div className="reports-grid"><div className="report-panel"><SectionHeading title="Spending by category" action="View details" /><div className="donut-wrap"><DonutChart values={categoryTotals.map((item) => item.amount)} colors={categoryTotals.map((item) => item.color)} /><div className="donut-total"><strong>{compactMoney(total)}</strong><span>this month</span></div></div><div className="legend">{categoryTotals.slice(0, 5).map((item) => <div key={item.id}><span className="legend-dot" style={{ background: item.color }} /><span>{item.name}</span><strong>{money(item.amount)}</strong></div>)}</div></div><div className="report-panel"><SectionHeading title="Spending by card" /><div className="bar-list">{data.cards.map((card) => { const amount = cardSpend(card, data.expenses); return <div className="bar-item" key={card.id}><div><span>{card.name}</span><strong>{money(amount)}</strong></div><div className="bar-track"><span style={{ width: `${amount / maxCategory / 2 * 100}%`, background: card.accent }} /></div></div> })}</div><div className="compare-card"><span><ArrowDownToLine size={16} /> August total</span><strong>₹1,12,400</strong><small className="positive">+₹12,450 this month</small></div></div></div><div className="target-report"><SectionHeading title="Monthly card targets" action="Manage rules" /><div className="target-grid">{data.cards.map((card) => { const spent = cardSpend(card, data.expenses); const percent = Math.round(spent / card.target * 100); return <div className="target-row" key={card.id}><div className="target-name"><span className="card-color" style={{ background: card.accent }} /><strong>{card.name}</strong><small>Target {money(card.target)}</small></div><div className="target-progress"><div><span style={{ width: `${Math.min(100, percent)}%`, background: card.accent }} /></div><small>{percent}%</small></div><div className={percent >= 100 ? 'target-status reached' : 'target-status'}>{percent >= 100 ? 'Target reached' : `${money(card.target - spent)} remaining`}</div></div> })}</div></div></div>
}

function DonutChart({ values, colors }: { values: number[]; colors: string[] }) {
  const total = values.reduce((sum, value) => sum + value, 0)
  if (!total) return <svg className="donut" viewBox="0 0 42 42"><circle cx="21" cy="21" r="15.9" fill="none" stroke="#eef0ea" strokeWidth="7" /></svg>
  let offset = 0
  return <svg className="donut" viewBox="0 0 42 42"><circle cx="21" cy="21" r="15.9" fill="none" stroke="#eef0ea" strokeWidth="7" />{values.map((value, index) => { const dash = value / total * 100; const circle = <circle key={colors[index] ?? index} cx="21" cy="21" r="15.9" fill="none" stroke={colors[index]} strokeWidth="7" strokeDasharray={`${dash} ${100 - dash}`} strokeDashoffset={-offset + 25} />; offset += dash; return circle })}</svg>
}

function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div>{action}</div>
}

function ExpenseModal({ data, initialExpense, onClose, onSave }: { data: FamilyData; initialExpense?: Expense | null; onClose: () => void; onSave: (expense: Expense) => void }) {
  const [cardId, setCardId] = useState(initialExpense?.cardId ?? data.cards[0]?.id ?? '')
  const [amount, setAmount] = useState(initialExpense ? String(initialExpense.amount) : '')
  const [merchant, setMerchant] = useState(initialExpense?.merchant ?? '')
  const [categoryId, setCategoryId] = useState(initialExpense?.categoryId ?? 'shopping')
  const [tagIds, setTagIds] = useState<string[]>(initialExpense?.tagIds ?? ['online'])
  const [date, setDate] = useState(initialExpense?.date ?? '2026-09-29')
  const [note, setNote] = useState(initialExpense?.note ?? '')

  const toggleTag = (id: string) => setTagIds((current) => current.includes(id) ? current.filter((tag) => tag !== id) : [...current, id])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!merchant || !amount || Number(amount) <= 0) return
    onSave({
      id: initialExpense?.id ?? `expense-${Date.now()}`,
      cardId,
      createdBy: initialExpense?.createdBy ?? 'mohnish',
      amount: Number(amount),
      merchant,
      categoryId,
      date,
      note,
      tagIds
    })
  }

  return <ModalShell title={initialExpense ? "Edit expense" : "Add an expense"} subtitle="Keep the family ledger up to date." onClose={onClose}>
    <form className="expense-form" onSubmit={submit}>
      <label>Card<select value={cardId} onChange={(event) => setCardId(event.target.value)}>{data.cards.map((card) => <option key={card.id} value={card.id}>{card.name} ···· {card.lastFour}</option>)}</select></label>
      <label>Amount<div className="amount-input"><span>₹</span><input autoFocus inputMode="decimal" placeholder="0" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ''))} /></div></label>
      <label>Merchant<input placeholder="e.g. Amazon" value={merchant} onChange={(event) => setMerchant(event.target.value)} /></label>
      <label>Category<div className="category-pills">{data.categories.slice(0, 8).map((category) => <button type="button" key={category.id} className={categoryId === category.id ? 'category-pill selected' : 'category-pill'} onClick={() => setCategoryId(category.id)}>{category.name}</button>)}</div></label>
      <label>Tags<div className="tag-pills">{data.tags.slice(0, 7).map((tag) => <button type="button" key={tag.id} className={tagIds.includes(tag.id) ? 'tag-pill selected' : 'tag-pill'} onClick={() => toggleTag(tag.id)}>{tag.name}</button>)}</div></label>
      <div className="form-row"><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Added by<div className="added-by"><div className="avatar tiny avatar-teal">MT</div> Mohnish</div></label></div>
      <label>Note <span className="optional">Optional</span><textarea placeholder="Anything worth remembering?" rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="modal-actions">
        <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
        <button className="button button-dark" type="submit"><Check size={16} /> {initialExpense ? "Update expense" : "Save expense"}</button>
      </div>
    </form>
  </ModalShell>
}

function RecommendationModal({ data, onClose }: { data: FamilyData; onClose: () => void }) {
  const [amount, setAmount] = useState('4000')
  const [category, setCategory] = useState('shopping')
  const [tags, setTags] = useState<string[]>(['online'])
  const [hasSubmitted, setHasSubmitted] = useState(true)
  const results = recommend(data.cards, data.expenses, data.categories, data.tags, Number(amount) || 0, category, tags)
  const best = results[0]
  return <ModalShell title="Which card should I use?" subtitle="A transparent recommendation from your configured benefits." onClose={onClose}><div className="recommend-form"><label>Purchase amount<div className="amount-input"><span>₹</span><input inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setHasSubmitted(false) }} /></div></label><label>Category<select value={category} onChange={(event) => { setCategory(event.target.value); setHasSubmitted(false) }}>{data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Tags<div className="tag-pills">{data.tags.slice(0, 7).map((tag) => <button type="button" key={tag.id} className={tags.includes(tag.id) ? 'tag-pill selected' : 'tag-pill'} onClick={() => setTags((current) => current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id])}>{tag.name}</button>)}</div></label><button className="button button-dark full" onClick={() => setHasSubmitted(true)}><Sparkles size={16} /> Find my best card</button></div>{hasSubmitted && best && <div className="recommend-result">{best.missingRules ? <div className="empty-recommend"><CircleHelp size={22} /><strong>No configured card benefit applies to this purchase.</strong><span>Add card rules to get a recommendation you can trust.</span></div> : <><div className="recommended-label"><Sparkles size={15} /> Recommended for this purchase</div><div className="recommended-card"><div className="recommend-card-visual" style={{ background: best.card.accent }}><span>{best.card.issuer}</span><strong>{best.card.name}</strong><small>•••• {best.card.lastFour}</small></div><div className="recommend-detail"><div><span>Estimated benefit</span><strong>{money(best.benefit)}</strong></div><ul>{best.reasons.map((reason) => <li key={reason}><Check size={14} /> {reason}</li>)}</ul></div></div><div className="other-options"><span>Other options</span>{results.slice(1).filter((item) => !item.missingRules).map((item) => <div key={item.card.id}><strong>{item.card.name}</strong><span>{money(item.benefit)} estimated benefit</span></div>)}</div></>}</div>}</ModalShell>
}

function CardDetail({ card, data, onClose, onAdd, canManage, onAddRule, onEditCard, onDeleteCard, onDeleteRule }: { card: Card; data: FamilyData; onClose: () => void; onAdd: () => void; canManage: boolean; onAddRule: () => void; onEditCard: () => void; onDeleteCard: () => void; onDeleteRule: (ruleId: string) => void }) {
  const spent = cardSpend(card, data.expenses)
  const expenses = data.expenses.filter((expense) => expense.cardId === card.id)
  const categories = data.categories.map((category) => ({ ...category, amount: expenses.filter((expense) => expense.categoryId === category.id).reduce((sum, expense) => sum + expense.amount, 0) })).filter((item) => item.amount).sort((a, b) => b.amount - a.amount)
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="detail-drawer" onMouseDown={(event) => event.stopPropagation()}><div className="drawer-header"><button className="icon-button" onClick={onClose}><ChevronLeft size={19} /></button><span>Card details</span><div style={{ display: 'flex', gap: '6px' }}><button className="icon-button" onClick={onEditCard} title="Edit card"><Pencil size={17} /></button><button className="icon-button" onClick={onDeleteCard} title="Delete card" style={{ color: '#dc2626' }}><Trash2 size={17} /></button></div></div><div className="large-card" style={{ background: card.accent }}><span>{card.issuer}</span><strong>{card.name}</strong><small>•••• {card.lastFour}</small><div><span>{card.ownerName}</span><span>{card.cardType}</span></div></div><div className="drawer-content"><div className="detail-heading"><div><p className="eyebrow">Current period</p><h2>{money(spent)} <span>/ {money(card.target)}</span></h2></div><button className="button button-dark compact" onClick={onAdd}><Plus size={15} /> Expense</button></div><div className="detail-progress"><span style={{ width: `${Math.min(100, spent / card.target * 100)}%`, background: card.accent }} /></div><div className="detail-between"><span>{Math.round(spent / card.target * 100)}% complete</span><strong>{money(Math.max(0, card.target - spent))} remaining</strong></div><div className="detail-section"><SectionHeading title="Spending breakdown" /><div className="breakdown-list">{categories.slice(0, 4).map((item) => <div key={item.id}><span className="legend-dot" style={{ background: item.color }} /><span>{item.name}</span><strong>{money(item.amount)}</strong></div>)}</div></div><div className="detail-section"><SectionHeading title="Card benefits" action={canManage ? 'Add benefit' : undefined} onAction={onAddRule} /><div className="benefit-list">{card.rules.map((rule) => <div key={rule.id}><span className="benefit-icon"><Gift size={15} /></span><p><strong>{rule.rewardDescription}</strong><small>{rule.tag ? `When tagged ${data.tags.find((tag) => tag.id === rule.tag)?.name}` : 'All eligible purchases'}</small></p>{canManage && <button className="icon-button" onClick={() => onDeleteRule(rule.id)} title="Remove benefit" style={{ border: 0, width: '24px', height: '24px' }}><Trash2 size={14} /></button>}</div>)}</div></div><div className="detail-section"><SectionHeading title="Recent spending" /><div className="activity-list">{expenses.slice(0, 4).map((expense) => <ExpenseRow key={expense.id} expense={expense} data={data} />)}</div></div></div></aside></div>
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div>{children}</div></div>
}

function cardSpend(card: Card, expenses: FamilyData['expenses']) {
  return expenses.filter((expense) => expense.cardId === card.id && expense.date.startsWith('2026-09')).reduce((sum, expense) => sum + expense.amount, 0)
}

function LoadingScreen() {
  return <div className="auth-shell"><div className="auth-card loading-card"><div className="brand"><div className="brand-mark">o</div><span>orbit</span></div><div className="loading-spinner" /><p>Loading your family workspace…</p></div></div>
}

function AuthScreen({ onLogin, onSignup, error }: { onLogin: (email: string, password: string) => Promise<void>; onSignup: (name: string, email: string, password: string) => Promise<string>; error: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setLocalError(''); setMessage('')
    try {
      if (mode === 'login') await onLogin(email, password)
      else setMessage(await onSignup(name, email, password))
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'Could not complete that request.')
    } finally { setBusy(false) }
  }
  return <div className="auth-shell"><div className="auth-card"><div className="auth-brand"><div className="brand"><div className="brand-mark">o</div><span>orbit</span></div><span className="auth-badge">Private family space</span></div><div className="auth-copy"><p className="eyebrow">A calmer family ledger</p><h1>{mode === 'login' ? 'Welcome back.' : 'Start your family space.'}</h1><p>{mode === 'login' ? 'Sign in to see what your family is spending together.' : 'Create an account, then create or join your family workspace.'}</p></div><form className="auth-form" onSubmit={submit}>{mode === 'signup' && <label>Your name<input required placeholder="Mohnish" value={name} onChange={(event) => setName(event.target.value)} /></label>}<label>Email<input required type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input required minLength={6} type="password" placeholder="At least 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{(localError || error) && <div className="form-error">{localError || error}</div>}{message && <div className="form-success">{message}</div>}<button className="button button-dark full" disabled={busy}>{busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button></form><div className="auth-switch">{mode === 'login' ? <span>New to Orbit? <button onClick={() => setMode('signup')}>Create an account</button></span> : <span>Already have an account? <button onClick={() => setMode('login')}>Sign in</button></span>}</div><p className="auth-footnote">Orbit never stores full card numbers, CVV, PINs, or banking passwords.</p></div></div>
}

function WorkspaceSetup({ user, onCreate, onJoin, onLogout, error }: { user: { name: string }; onCreate: (name: string) => Promise<void>; onJoin: (code: string) => Promise<void>; onLogout: () => Promise<void>; error: string }) {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [familyName, setFamilyName] = useState(`${user.name}'s family`)
  const [inviteCode, setInviteCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setLocalError('')
    try { if (mode === 'create') await onCreate(familyName); else await onJoin(inviteCode) }
    catch (caught) { setLocalError(caught instanceof Error ? caught.message : 'Could not set up the family.') }
    finally { setBusy(false) }
  }
  return <div className="auth-shell"><div className="auth-card setup-card"><div className="auth-brand"><div className="brand"><div className="brand-mark">o</div><span>orbit</span></div><button className="text-button" onClick={() => void onLogout()}>Sign out</button></div><div className="setup-illustration"><Users size={27} /><span>✦</span><CreditCard size={24} /></div><div className="auth-copy"><p className="eyebrow">One shared space</p><h1>Set up your family.</h1><p>Create a workspace for your household or join one with an invite code.</p></div><div className="segmented"><button className={mode === 'create' ? 'selected' : ''} onClick={() => setMode('create')}>Create family</button><button className={mode === 'join' ? 'selected' : ''} onClick={() => setMode('join')}>Join family</button></div><form className="auth-form" onSubmit={submit}>{mode === 'create' ? <label>Family name<input required value={familyName} onChange={(event) => setFamilyName(event.target.value)} /></label> : <label>Invite code<input required placeholder="e.g. A1B2C3D4" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} /></label>}{(localError || error) && <div className="form-error">{localError || error}</div>}<button className="button button-dark full" disabled={busy}>{busy ? 'Setting up…' : mode === 'create' ? 'Create workspace' : 'Join workspace'} <ArrowRight size={16} /></button></form><p className="auth-footnote">The family creator becomes the administrator. Admins can add cards and manage the workspace.</p></div></div>
}

function RuleModal({ card, data, onClose, onSave }: { card: Card; data: FamilyData; onClose: () => void; onSave: (rule: NewRule) => Promise<void> }) {
  const [category, setCategory] = useState(data.categories[0]?.id ?? '')
  const [tag, setTag] = useState('')
  const [rewardType, setRewardType] = useState<NewRule['rewardType']>('percentage')
  const [rewardValue, setRewardValue] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!category || !rewardValue || !description) { setError('Choose a category and add the reward details.'); return }
    setBusy(true); setError('')
    try { await onSave({ cardId: card.id, category, tag: tag || undefined, rewardType, rewardValue: Number(rewardValue), rewardDescription: description, priority: 5 }) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not add benefit.') }
    finally { setBusy(false) }
  }
  return <ModalShell title={`Add a benefit to ${card.name}`} subtitle="Recommendations only use rules you configure here." onClose={onClose}><form className="expense-form" onSubmit={submit}><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Optional tag<select value={tag} onChange={(event) => setTag(event.target.value)}><option value="">Any tag</option>{data.tags.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="form-row"><label>Reward type<select value={rewardType} onChange={(event) => setRewardType(event.target.value as NewRule['rewardType'])}><option value="percentage">Percentage</option><option value="cashback">Cashback</option><option value="fixed">Fixed amount</option><option value="points">Points</option><option value="miles">Miles</option></select></label><label>Value<input required inputMode="decimal" placeholder="5" value={rewardValue} onChange={(event) => setRewardValue(event.target.value.replace(/[^\d.]/g, ''))} /></label></div><label>Rule description<input required placeholder="5% reward on online shopping" value={description} onChange={(event) => setDescription(event.target.value)} /></label>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : 'Save benefit'} <Check size={16} /></button></div></form></ModalShell>
}

function CardModal({ data, initialCard, onClose, onSave, onDelete }: { data: FamilyData; initialCard?: Card | null; onClose: () => void; onSave: (card: NewCard) => Promise<void>; onDelete?: () => void }) {
  const [name, setName] = useState(initialCard?.name ?? '')
  const [issuer, setIssuer] = useState(initialCard?.issuer ?? '')
  const [lastFour, setLastFour] = useState(initialCard?.lastFour ?? '')
  const [ownerId, setOwnerId] = useState(initialCard?.ownerId ?? data.members[0]?.id ?? '')
  const [target, setTarget] = useState(initialCard ? String(initialCard.target) : '')
  const [annualFee, setAnnualFee] = useState(initialCard?.annualFee ? String(initialCard.annualFee) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name || !issuer || lastFour.length !== 4 || !target) { setError('Add a name, issuer, last 4 digits, and monthly target.'); return }
    setBusy(true); setError('')
    try {
      const owner = data.members.find((member) => member.id === ownerId) ?? data.members[0]
      await onSave({ name, issuer, lastFour, ownerId, ownerName: owner?.name ?? 'Family member', cardType: initialCard?.cardType ?? 'Credit card', target: Number(target), billingStart: initialCard?.billingStart ?? 1, billingEnd: initialCard?.billingEnd ?? 0, annualFee: Number(annualFee) || 0, accent: initialCard?.accent ?? '#1e6b62', accentSoft: initialCard?.accentSoft ?? '#dceee1', active: true })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save card.') }
    finally { setBusy(false) }
  }

  return <ModalShell title={initialCard ? "Edit card" : "Add a family card"} subtitle="Only the last four digits are stored." onClose={onClose}>
    <form className="expense-form" onSubmit={submit}>
      <label>Card name<input autoFocus required placeholder="Axis Select" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Issuer<input required placeholder="Axis Bank" value={issuer} onChange={(event) => setIssuer(event.target.value)} /></label>
      <label>Last 4 digits<input required inputMode="numeric" maxLength={4} placeholder="4821" value={lastFour} onChange={(event) => setLastFour(event.target.value.replace(/\D/g, ''))} /></label>
      <label>Card owner<select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>{data.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <div className="form-row"><label>Monthly target<input required inputMode="decimal" placeholder="50000" value={target} onChange={(event) => setTarget(event.target.value.replace(/[^\d.]/g, ''))} /></label><label>Annual fee <span className="optional">Optional</span><input inputMode="decimal" placeholder="3000" value={annualFee} onChange={(event) => setAnnualFee(event.target.value.replace(/[^\d.]/g, ''))} /></label></div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        {onDelete ? <button type="button" className="button button-outline danger-button" onClick={onDelete}><Trash2 size={16} /> Delete Card</button> : <div />}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
          <button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : initialCard ? 'Update card' : 'Save card'} <Check size={16} /></button>
        </div>
      </div>
    </form>
  </ModalShell>
}

export default App