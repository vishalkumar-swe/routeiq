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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none">
            Cargo <span className="text-yellow-500">Control</span> Tower
          </h1>
          <p className="text-slate-500 font-bold tracking-tight mt-3 flex items-center gap-2">
            <Activity size={14} className="text-yellow-600" />
            Live Fleet Intelligence Platform
            <span className="opacity-30">|</span>
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          {[
            { id: 'all', label: 'All Fleet' },
            { id: 'moving', label: 'In Transit' },
            { id: 'idle', label: 'Parked' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f.id 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
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
          value={isLoading ? '—' : String(kpis?.active_vehicles ?? 47)}
          delta="+6.2%" deltaUp
          icon={<Truck size={20} className="text-yellow-400" />}
          color="#F9C935"
          progress={78}
        />
        <KPICard
          label="Delivery Success"
          value={isLoading ? '—' : `${kpis?.on_time_rate_pct ?? 94}%`}
          delta="+1.2%" deltaUp
          icon={<Clock size={20} className="text-slate-900" />}
          color="#0F172A"
          progress={kpis?.on_time_rate_pct ?? 94}
        />
        <KPICard
          label="Fuel Offset"
          value={isLoading ? '—' : `₹${((kpis?.fuel_cost_today ?? 210000) / 100000).toFixed(1)}L`}
          delta="-8.4%"
          icon={<Fuel size={20} className="text-orange-500" />}
          color="#FF6B35"
          progress={56}
        />
        <KPICard
          label="AI Efficiency"
          value={isLoading ? '—' : `${kpis?.fuel_saved_pct ?? 18.2}%`}
          delta="+3.1%" deltaUp
          icon={<TrendingUp size={20} className="text-yellow-500" />}
          color="#F59E0B"
          progress={kpis?.fuel_saved_pct ?? 18.2}
        />
      </div>

      {/* Map + Fleet List */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <div className="rounded-[40px] bg-[#0A0F1C] border border-slate-800 flex flex-col overflow-hidden shadow-2xl relative">
          <div className="absolute top-8 left-8 z-10 pointer-events-none">
             <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 px-6 py-4 rounded-3xl shadow-2xl">
                <h2 className="text-lg font-black text-white tracking-tight uppercase italic italic-none">Live <span className="text-yellow-500">Geospatial</span> Grid</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">High-Density Telemetry Pipe Active</p>
             </div>
          </div>
          <div className="h-[600px]">
            <LiveMap vehicles={vehicles} selectedVehicleId={selectedVehicleId} />
          </div>
        </div>

        <div className="rounded-[40px] bg-white border border-slate-200 flex flex-col overflow-hidden shadow-xl">
          <div className="px-8 pt-8 pb-6 flex justify-between items-center border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Cargo <span className="text-yellow-500">Fleet</span></h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Real-time Telemetry</p>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-slate-900 text-white text-[10px] font-black tracking-widest">
              {filteredVehicles.length} ONLINE
            </div>
          </div>
          <div className="px-6 pb-8 pt-4 flex-1 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="py-20 flex justify-center"><Spinner /></div>
            ) : filteredVehicles.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs font-bold uppercase">No vehicles match filter</div>
            ) : (
              filteredVehicles.map((v: any, i: number) => {
                const live = liveTelemetry[v.id]
                const dotColor = STATUS_COLORS[v.status] || '#94a3b8'
                const emoji = v.vehicle_type === 'truck' ? '🚛' : (v.vehicle_type === 'van' ? '🚐' : (v.vehicle_type === 'bike' ? '🏍️' : '🚗'))
                const speed = live?.speed || 0
                const primaryCargo = v.cargo_types?.[0] || 'general'
                const cargoEmoji = CARGO_EMOJI[primaryCargo] || ''

                return (
                  <div key={v.id} className="group relative flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-slate-100 border border-slate-200 group-hover:bg-white group-hover:scale-110 transition-transform shadow-sm relative">
                      {emoji}
                      <span className="absolute -top-1 -right-1 text-[10px] bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm border border-slate-100">
                        {cargoEmoji}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                          {v.plate_number} 
                          <span className={`w-2 h-2 rounded-full ${speed > 0 ? 'animate-pulse' : ''}`} style={{ backgroundColor: dotColor, boxShadow: `0 0 8px ${dotColor}60` }} />
                        </div>
                        <div className="font-mono font-black text-[12px]" style={{ color: speed > 0 ? '#10b981' : '#94a3b8' }}>
                          {speed > 0 ? `${speed.toFixed(0)} KM/H` : 'STATIONARY'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] font-bold">
                        <div className="text-slate-500 truncate pr-4 uppercase tracking-tight">
                          {v.status === 'on_route' ? 'Active Mission · Primary Route' : 'Awaiting Orders · Idle'}
                        </div>
                        <div className="text-slate-400 font-mono">
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
