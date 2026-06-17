export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-4 pb-1">
      <p
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '12px',
          fontWeight: 700,
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {title}
      </p>
    </div>
  )
}
