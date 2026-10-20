import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { Layers, RefreshCw, Clock, Activity, CheckCircle2, AlertTriangle, PauseCircle } from 'lucide-react'
import type { WAQueueStats } from '../../api/client'

interface Props {
  stats: WAQueueStats | null
  onRefresh: () => void
}

export default function QueueStats({ stats, onRefresh }: Props) {
  const items: Array<{
    key: keyof WAQueueStats
    label: string
    icon: React.ElementType
    bgColor: string
    textColor: string
    borderColor: string
  }> = [
    {
      key: 'waiting',
      label: 'Menunggu',
      icon: Clock,
      bgColor: 'bg-blue-50/70',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200/60',
    },
    {
      key: 'active',
      label: 'Diproses',
      icon: Activity,
      bgColor: 'bg-amber-50/70',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200/60',
    },
    {
      key: 'completed',
      label: 'Selesai',
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50/70',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200/60',
    },
    {
      key: 'failed',
      label: 'Gagal',
      icon: AlertTriangle,
      bgColor: 'bg-rose-50/70',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200/60',
    },
    {
      key: 'delayed',
      label: 'Tertunda',
      icon: PauseCircle,
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-700',
      borderColor: 'border-slate-200/60',
    },
  ]

  const totalInQueue = (stats?.waiting ?? 0) + (stats?.active ?? 0)

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Antrean Pesan</CardTitle>
          {totalInQueue > 0 && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px]">
              {totalInQueue} aktif
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          className="h-7 px-2 text-xs gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Perbarui
        </Button>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {items.map(({ key, label, icon: Icon, bgColor, textColor, borderColor }) => {
            const count = stats?.[key] ?? 0
            return (
              <div
                key={key}
                className={`rounded-lg border p-2.5 flex flex-col justify-between ${bgColor} ${borderColor}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-600 truncate">{label}</span>
                  <Icon className={`h-3.5 w-3.5 ${textColor} shrink-0`} />
                </div>
                <p className={`mt-1.5 text-lg font-bold font-mono ${textColor}`}>
                  {stats ? count : '—'}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
