import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: '',
        warning: '',
        danger: '',
        info: '',
        confirmed: '',
        pending: '',
        cancelled: '',
        completed: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const translucent: Record<string, React.CSSProperties> = {
  success: { backgroundColor: '#10B98122', border: '1px solid #10B981', color: '#10B981' },
  warning: { backgroundColor: '#F59E0B22', border: '1px solid #F59E0B', color: '#F59E0B' },
  danger: { backgroundColor: '#EF444422', border: '1px solid #EF4444', color: '#EF4444' },
  info: { backgroundColor: '#2196F322', border: '1px solid #2196F3', color: '#2196F3' },
  confirmed: { backgroundColor: '#27AE6022', border: '1px solid #27AE60', color: '#27AE60' },
  pending: { backgroundColor: '#F39C1222', border: '1px solid #F39C12', color: '#F39C12' },
  cancelled: { backgroundColor: '#E74C3C22', border: '1px solid #E74C3C', color: '#E74C3C' },
  completed: { backgroundColor: '#95A5A622', border: '1px solid #95A5A6', color: '#95A5A6' },
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, style, ...props }: BadgeProps) {
  const translucentStyle = variant && translucent[variant] ? translucent[variant] : {}
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={{ ...translucentStyle, fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600, borderRadius: '999px', padding: '3px 10px', ...style }}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
