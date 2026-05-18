import { createClient } from '@/lib/supabase/server'
import { Task, TaskStatus, TaskType, TASK_STATUS_LABELS, TASK_TYPE_LABELS, Property } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export const revalidate = 0

const statusVariant = {
  [TaskStatus.PENDING]: 'warning',
  [TaskStatus.IN_PROGRESS]: 'info',
  [TaskStatus.DONE]: 'success',
} as const

const typeColors = {
  [TaskType.CLEANING]: 'bg-blue-100 text-blue-700',
  [TaskType.MAINTENANCE]: 'bg-orange-100 text-orange-700',
  [TaskType.RESTOCK]: 'bg-purple-100 text-purple-700',
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('tasks')
    .select('*, property:properties(id,name,color), checklist_items(*)')
    .order('scheduled_date', { ascending: true })

  if (params.status) {
    query = query.eq('status', params.status)
  } else {
    query = query.neq('status', TaskStatus.DONE)
  }

  const { data: tasks } = await query

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tâches</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {tasks?.length ?? 0} tâche{(tasks?.length ?? 0) > 1 ? 's' : ''}
        </p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/tasks"
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !params.status
              ? 'bg-kaza-blue text-white border-kaza-blue'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          En cours
        </Link>
        {Object.values(TaskStatus).map((s) => (
          <Link
            key={s}
            href={`/tasks?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              params.status === s
                ? 'bg-kaza-blue text-white border-kaza-blue'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {TASK_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {!tasks || tasks.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">Aucune tâche</p>
            <p className="text-sm mt-1">Toutes les tâches sont terminées 🎉</p>
          </div>
        ) : (
          tasks.map((task: Task) => {
            const property = task.property as { id: string; name: string; color: string } | undefined
            const checklist = task.checklist_items ?? []
            const done = checklist.filter((i) => i.is_checked).length
            const isOverdue = task.scheduled_date < today && task.status !== TaskStatus.DONE

            return (
              <Card key={task.id} className={isOverdue ? 'border-red-200 bg-red-50/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {property && (
                      <div
                        className="w-1 self-stretch rounded-full flex-shrink-0"
                        style={{ backgroundColor: property.color }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[task.type]}`}>
                          {TASK_TYPE_LABELS[task.type]}
                        </span>
                        <Badge variant={statusVariant[task.status]}>
                          {TASK_STATUS_LABELS[task.status]}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="danger">En retard</Badge>
                        )}
                      </div>
                      <p className="font-medium text-slate-800 truncate">{task.title}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {property && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: property.color }}
                            />
                            {property.name}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {formatDate(task.scheduled_date)}
                        </span>
                        {checklist.length > 0 && (
                          <span className="text-xs text-slate-500">
                            {done}/{checklist.length} étapes
                          </span>
                        )}
                      </div>

                      {checklist.length > 0 && (
                        <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${(done / checklist.length) * 100}%` }}
                          />
                        </div>
                      )}

                      {task.notes && (
                        <p className="text-xs text-slate-400 mt-1.5 truncate">{task.notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
