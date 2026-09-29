export const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

export const compactMoney = (value: number) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  return money(value)
}

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`))

export const relativeDate = (value: string) => {
  const today = new Date('2026-09-29T12:00:00')
  const date = new Date(`${value}T12:00:00`)
  const diff = Math.round((today.getTime() - date.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return formatDate(value)
}

export const monthName = (date = new Date('2026-09-29T12:00:00')) =>
  new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date)