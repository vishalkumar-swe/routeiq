import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Truck, Clock, Fuel, TrendingUp, Zap, Filter, Activity } from 'lucide-react'
import { dashboardAPI, vehiclesAPI, telemetryWS } from '@/services/api'
import { KPICard, Card, CardHeader, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'
import LiveMap from '@/components/map/LiveMap'
import DeliveryChart from '@/components/dashboard/DeliveryChart'
import AlertFeed from '@/components/dashboard/AlertFeed'
import { AIInsightCard } from '@/components/dashboard/AIInsightCard'
import { STATUS_COLORS, CARGO_EMOJI } from '@/config/mapConfig'

export default function DashboardPage() {
  const [searchParams] = useSearchParams()
  const selectedVehicleId = searchParams.get('vehicle')
  const [filter, setFilter] = useState<'all' | 'moving' | 'idle'>('all')
  const [liveTelemetry, setLiveTelemetry] = useState<Record<string, any>>({})
  const [alerts, setAlerts] = useState<any[]>([])

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: dashboardAPI.kpis,
    refetchInterval: 30_000,
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'live'],
    queryFn: () => vehiclesAPI.list({ limit: 20 }),
    refetchInterval: 60_000, // Background refresh
  })

  useEffect(() => {
    const ws = telemetryWS.connect((msg) => {
      if (msg.type === 'TELEMETRY_UPDATE') {
        setLiveTelemetry(prev => ({
          ...prev,
          [msg.data.vehicle_id]: msg.data
        }))
      } else if (msg.type === 'VEHICLE_OFFLINE' || msg.type === 'ALERT_CRITICAL' || msg.type === 'ALERT_WARNING') {
        const isCritical = msg.type === 'ALERT_CRITICAL' || msg.type === 'VEHICLE_OFFLINE'
        const newAlert = {
          id: Date.now(),
          type: isCritical ? 'critical' : 'warning',
          title: msg.title || (isCritical ? 'Critical Event' : 'Fleet Warning'),
          desc: msg.message || msg.data?.message || `${msg.data?.plate_number} has lost connection.`,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }
        setAlerts(prev => [newAlert, ...prev].slice(0, 10)) // Keep last 10
      }
    })
    return () => ws.close()
  }, [])

  useEffect(() => {
    if (selectedVehicleId && vehicles.length > 0) {
      const v = vehicles.find((v: any) => v.id === selectedVehicleId)
      if (v) {
        toast.success(`Tracking vehicle ${v.plate_number}...`, { id: 'track-v' })
      }
    }
  }, [selectedVehicleId, vehicles])

  const filteredVehicles = vehicles.filter((v: any) => {
    const live = liveTelemetry[v.id]
    if (filter === 'all') return true
    if (filter === 'moving') return (live?.speed > 0 || v.status === 'on_route')
    if (filter === 'idle') return (!live || live?.speed === 0 || v.status === 'available')
    return true
  })

  const now = new Date()

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-6xl font-black tracking-tighter text-white uppercase leading-none">
            Nexus <span className="text-primary">Control</span> Tower
          </h1>
          <p className="text-muted font-bold tracking-tight mt-4 flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <Activity size={16} className="text-primary" />
            Enterprise Multi-Agent AI Ecosystem
            <span className="opacity-30">|</span>
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
          </p>
        </div>
        
        <div className="flex bg-surface2 p-1.5 rounded-2xl border border-border shadow-2xl">
          {[
            { id: 'all', label: 'All Fleet' },
            { id: 'moving', label: 'In Transit' },
            { id: 'idle', label: 'Parked' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f.id 
                  ? 'bg-primary text-bg shadow-lg shadow-primary/20' 
                  : 'text-muted hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label="Active Cargo"
          value={isLoading ? '—' : String(kpis?.active_vehicles ?? 0)}
          delta={kpis?.delta_vehicles || "+0%"} deltaUp
          icon={<Truck size={22} className="text-primary" />}
          color="var(--accent)"
          progress={kpis ? (kpis.active_vehicles > 0 ? 85 : 0) : 0}
        />
        <KPICard
          label="Delivery Success"
          value={isLoading ? '—' : `${kpis?.on_time_rate_pct?.toFixed(1) ?? '—'}%`}
          delta={kpis?.delta_efficiency || "+0%"} deltaUp
          icon={<Clock size={22} className="text-white" />}
          color="#FFFFFF"
          progress={kpis?.on_time_rate_pct ?? 0}
        />
        <KPICard
          label="Operational ROI"
          value={isLoading ? '—' : `₹${((kpis?.fuel_cost_today ?? 0) / 100000).toFixed(1)}L`}
          delta={kpis?.delta_roi || "+0%"} deltaUp
          icon={<Fuel size={22} className="text-primary-dark" />}
          color="var(--accent-secondary)"
          progress={kpis ? 72 : 0}
        />
        <KPICard
          label="AI Efficiency"
          value={isLoading ? '—' : `${kpis?.fuel_saved_pct ?? '—'}%`}
          delta={kpis?.delta_fuel || "+0%"} deltaUp
          icon={<Zap size={22} className="text-accent-tertiary" />}
          color="var(--accent-tertiary)"
          progress={kpis?.fuel_saved_pct ?? 0}
        />
      </div>

      {/* Map + Fleet List */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <div className="rounded-[40px] bg-surface border border-border flex flex-col overflow-hidden shadow-2xl relative group">
          <div className="absolute top-8 left-8 z-10 pointer-events-none">
             <div className="bg-bg/40 backdrop-blur-xl border border-white/5 px-8 py-5 rounded-[24px] shadow-2xl">
                <h2 className="text-xl font-black text-white tracking-tight uppercase">Live <span className="text-primary">Geospatial</span> Grid</h2>
                <p className="text-muted text-[10px] font-bold uppercase tracking-[0.2em] mt-2 opacity-60">High-Density Telemetry Pipe Active</p>
             </div>
          </div>
          <div className="h-[650px]">
            <LiveMap vehicles={vehicles} selectedVehicleId={selectedVehicleId} />
          </div>
        </div>

        <div className="rounded-[40px] bg-surface border border-border flex flex-col overflow-hidden shadow-2xl">
          <div className="px-8 pt-10 pb-6 flex justify-between items-center border-b border-border">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Cargo <span className="text-primary">Fleet</span></h2>
              <p className="text-muted text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Real-time Telemetry</p>
            </div>
            <div className="px-5 py-2.5 rounded-2xl bg-primary/10 text-primary text-[10px] font-black tracking-widest border border-primary/20">
              {filteredVehicles.length} ONLINE
            </div>
          </div>
          <div className="px-6 pb-10 pt-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
            {isLoading ? (
              <div className="py-20 flex justify-center"><Spinner /></div>
            ) : filteredVehicles.length === 0 ? (
              <div className="py-20 text-center text-muted text-xs font-bold uppercase">No vehicles match filter</div>
            ) : (
              filteredVehicles.map((v: any, i: number) => {
                const live = liveTelemetry[v.id]
                const dotColor = STATUS_COLORS[v.status] || '#94a3b8'
                const emoji = v.vehicle_type === 'truck' ? '🚛' : (v.vehicle_type === 'van' ? '🚐' : (v.vehicle_type === 'bike' ? '🏍️' : '🚗'))
                const speed = live?.speed || 0
                const primaryCargo = v.cargo_types?.[0] || 'general'
                const cargoEmoji = CARGO_EMOJI[primaryCargo] || ''

                return (
                  <div key={v.id} className="group relative flex items-center gap-5 p-5 rounded-[32px] hover:bg-surface2 border border-transparent hover:border-border transition-all cursor-pointer">
                    <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-3xl flex-shrink-0 bg-surface2 border border-border group-hover:bg-bg group-hover:scale-105 transition-all shadow-lg relative">
                      {emoji}
                      <span className="absolute -top-1 -right-1 text-[12px] bg-surface rounded-full w-6 h-6 flex items-center justify-center shadow-lg border border-border">
                        {cargoEmoji}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-black text-white text-base flex items-center gap-3">
                          {v.plate_number} 
                          <span className={`w-2.5 h-2.5 rounded-full ${speed > 0 ? 'animate-pulse' : ''}`} style={{ backgroundColor: dotColor, boxShadow: `0 0 12px ${dotColor}80` }} />
                        </div>
                        <div className="font-mono font-black text-[13px]" style={{ color: speed > 0 ? 'var(--success)' : 'var(--muted)' }}>
                          {speed > 0 ? `${speed.toFixed(0)} KM/H` : 'STATIONARY'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[12px] font-bold">
                        <div className="text-muted truncate pr-4 uppercase tracking-tight">
                          {v.status === 'on_route' ? 'Active Mission · Primary Route' : 'Awaiting Orders · Idle'}
                        </div>
                        <div className="text-primary/60 font-mono text-[10px] tracking-widest">
                          {live ? 'LIVE' : 'SYNCING...'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Charts + Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DeliveryChart />
        <AlertFeed alerts={alerts} />
        <Card className="border-slate-200 bg-white shadow-xl rounded-[40px] overflow-hidden">
          <CardHeader title="System Pulse" subtitle="Infrastructure load metrics" />
          <div className="px-8 pb-8 space-y-8">
            {[
              { label: 'Network Latency', value: 12, color: '#10b981', suffix: 'ms' },
              { label: 'Data Throughput', value: 94, color: '#0F172A', suffix: '%' },
              { label: 'ML Prediction Acc', value: 98, color: '#F9C935', suffix: '%' },
              { label: 'Fleet Sync Rate', value: 100, color: '#F59E0B', suffix: '%' },
            ].map(({ label, value, color, suffix }) => (
              <div key={label} className="group">
                <div className="flex justify-between mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>{label}</span>
                  <span style={{ color }}>{value}{suffix}</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                  <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${value}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI Pulse Insight */}
      <AIInsightCard 
        title="Predictive Fleet Optimization"
        insight="Our neural engine has identified a high-traffic cluster near Okhla. Rerouting 4 heavy-duty trucks to the Outer Ring Road will prevent a cumulative 82-minute delay across the cargo manifest."
        score={98.2}
        trend="up"
      />
    </div>
  )
}
