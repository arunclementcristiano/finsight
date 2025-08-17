import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, SunMedium, Moon } from 'lucide-react'
import './index.css'

// Minimal shadcn-like primitives (local) to avoid CLI codegen
function cn(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(' ')
}

type Role = 'user' | 'system'

type ParsedExpense = {
	amount: number
	currency: string
	category: string
	date: string
	raw: string
}

type Message = {
	id: string
	role: Role
	text: string
	parsed?: ParsedExpense
}

function parseExpense(input: string): ParsedExpense | undefined {
	// Very simple heuristic parser for demo purposes
	// Examples: "Spent ₹500 on groceries yesterday", "500 food 2025-01-01"
	const lower = input.toLowerCase()
	const currencyMatch = input.match(/[₹$€£]/)?.[0] ?? '₹'
	const amountMatch = input.match(/([0-9]+(?:\.[0-9]{1,2})?)/)
	if (!amountMatch) return undefined
	const amount = Number(amountMatch[1])

	const categories = ['groceries', 'food', 'rent', 'shopping', 'travel', 'transport', 'entertainment', 'utilities', 'health']
	const category = categories.find((c) => lower.includes(c)) ?? 'misc'

	// date: try ISO first, else keywords
	const iso = input.match(/(\d{4}-\d{2}-\d{2})/)
	let date = new Date()
	if (iso) {
		date = new Date(iso[1])
	} else if (lower.includes('yesterday')) {
		const d = new Date()
		d.setDate(d.getDate() - 1)
		date = d
	}
	const dateStr = date.toISOString().slice(0, 10)

	return { amount, currency: currencyMatch, category: category.charAt(0).toUpperCase() + category.slice(1), date: dateStr, raw: input }
}

function Bubble({ role, children }: { role: Role; children: React.ReactNode }) {
	const isUser = role === 'user'
	return (
		<div className={cn('w-full flex', isUser ? 'justify-end' : 'justify-start')}>
			<div
				className={cn(
					'max-w-[78%] rounded-2xl px-4 py-3 shadow-sm',
					isUser ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card text-card-foreground border border-border rounded-bl-sm'
				)}
			>
				{children}
			</div>
		</div>
	)
}

function ParsedCard({ parsed }: { parsed: ParsedExpense }) {
	return (
		<div className="mt-2 rounded-xl border border-border bg-card text-card-foreground p-3">
			<div className="grid grid-cols-3 gap-3 text-sm">
				<div>
					<div className="text-muted-foreground">Amount</div>
					<div className="font-semibold">{parsed.currency}{parsed.amount.toLocaleString()}</div>
				</div>
				<div>
					<div className="text-muted-foreground">Category</div>
					<div className="inline-flex items-center gap-2 font-semibold">
						<span className="inline-block h-2 w-2 rounded-full bg-primary" />
						{parsed.category}
					</div>
				</div>
				<div>
					<div className="text-muted-foreground">Date</div>
					<div className="font-semibold">{parsed.date}</div>
				</div>
			</div>
		</div>
	)
}

function useDarkMode() {
	const [isDark, setIsDark] = useState<boolean>(() => {
		return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
	})
	useMemo(() => {
		const root = document.documentElement
		if (isDark) root.classList.add('dark')
		else root.classList.remove('dark')
	}, [isDark])
	return { isDark, setIsDark }
}

function SummaryBadge({ messages }: { messages: Message[] }) {
	const totals = useMemo(() => {
		const byCategory = new Map<string, number>()
		let weekTotal = 0
		const now = new Date()
		for (const m of messages) {
			if (!m.parsed) continue
			const amount = m.parsed.amount
			const d = new Date(m.parsed.date)
			const diffDays = Math.floor((Number(now) - Number(d)) / (1000 * 60 * 60 * 24))
			if (diffDays <= 7) weekTotal += amount
			byCategory.set(m.parsed.category, (byCategory.get(m.parsed.category) ?? 0) + amount)
		}
		let topCategory = '—'
		let topAmount = 0
		for (const [cat, amt] of byCategory.entries()) {
			if (amt > topAmount) {
				topAmount = amt
				topCategory = cat
			}
		}
		return { weekTotal, topCategory }
	}, [messages])

	return (
		<div className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-sm">
			<div className="font-medium">This week: ₹{totals.weekTotal.toLocaleString()}</div>
			<div className="text-muted-foreground">Top: {totals.topCategory}</div>
		</div>
	)
}

export default function App() {
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState('')
	const { isDark, setIsDark } = useDarkMode()
	const listRef = useRef<HTMLDivElement>(null)

	function addMessage(text: string) {
		const userMessage: Message = { id: crypto.randomUUID(), role: 'user', text }
		const parsed = parseExpense(text)
		const systemText = parsed
			? `Added ${parsed.currency}${parsed.amount} to ${parsed.category} on ${parsed.date}.`
			: `Sorry, I couldn't parse that. Try like: "Spent ₹500 on groceries yesterday".`
		const systemMessage: Message = {
			id: crypto.randomUUID(),
			role: 'system',
			text: systemText,
			parsed: parsed ?? undefined,
		}
		setMessages((prev) => [...prev, userMessage, systemMessage])
		setInput('')
		queueMicrotask(() => {
			listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
		})
	}

	return (
		<div className="h-full flex flex-col bg-background">
			<header className="sticky top-0 z-10 border-b border-border bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
					<div className="text-base font-semibold">Expense Chat</div>
					<div className="flex items-center gap-3">
						<SummaryBadge messages={messages} />
						<button
							className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-sm"
							onClick={() => setIsDark((v) => !v)}
							aria-label="Toggle theme"
						>
							{isDark ? <SunMedium size={16} /> : <Moon size={16} />}
						</button>
					</div>
				</div>
			</header>

			<main className="flex-1">
				<div ref={listRef} className="mx-auto max-w-3xl px-4 py-4 h-full overflow-y-auto">
					<AnimatePresence initial={false}>
						{messages.map((m) => (
							<motion.div
								key={m.id}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -8 }}
								transition={{ type: 'spring', stiffness: 300, damping: 24 }}
								className="mb-3"
							>
								<Bubble role={m.role}>
									<div className="whitespace-pre-wrap text-sm leading-relaxed">
										{m.text}
										{m.parsed ? <ParsedCard parsed={m.parsed} /> : null}
									</div>
								</Bubble>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			</main>

			<footer className="sticky bottom-0 border-t border-border bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="mx-auto max-w-3xl px-4 py-3">
					<form
						onSubmit={(e) => {
							e.preventDefault()
							if (!input.trim()) return
							addMessage(input.trim())
						}}
						className="flex items-center gap-2"
					>
						<div className="flex-1">
							<label htmlFor="message" className="sr-only">Type your expense</label>
							<div className="relative">
								<input
									id="message"
									type="text"
									value={input}
									onChange={(e) => setInput(e.target.value)}
									placeholder="Type your expense…"
									className="block w-full rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm outline-none ring-0 focus:border-primary"
								/>
								<button
									type="submit"
									className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow hover:opacity-95"
									aria-label="Send"
								>
									<Send size={16} />
								</button>
							</div>
						</div>
					</form>
				</div>
			</footer>
		</div>
	)
}
