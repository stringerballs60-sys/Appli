import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, pattern = 'dd MMM yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: fr })
}

export function formatDateTime(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy HH:mm', { locale: fr })
}

export function nightCount(checkIn: string, checkOut: string) {
  return differenceInDays(parseISO(checkOut), parseISO(checkIn))
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
