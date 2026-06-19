import { 
  Plus, Search, Package, MapPin, Layers, 
  ShieldCheck, ShieldAlert, Zap, Navigation, Loader2,
  Calendar, Clock, AlertTriangle, Thermometer
} from 'lucide-react'
import axios from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

import { shipmentsAPI, deliveryPointsAPI } from '@/services/api'
import { Card, StatusDot, Button, Badge } from '@/components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const STATUS_OPTIONS = ['all', 'created', 'picked_up', 'in_transit', 'delivered', 'cancelled']
const PRIORITIES = ['low', 'medium', 'high', 'critical']

const CARGO_ARCHETYPES = [
  { id: 'standard', name: 'Standard Parcel', desc: 'Secure express delivery', icon: '/assets/cargo/parcel.png' },
  { id: 'heavy', name: 'Heavy Freight', desc: 'Industrial bulk cargo', icon: '/assets/cargo/freight.png' },
  { id: 'cold_chain', name: 'Cold Chain', desc: 'Temp-sensitive items', icon: '/assets/cargo/cold_chain.png' },
  { id: 'hazardous', name: 'Hazardous', desc: 'Special handling reqs', icon: '/assets/cargo/hazardous.png' },
]

export default function ShipmentsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsAPI.list(),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => shipmentsAPI.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      toast.success('Shipment status updated')
    },
  })

  const filtered = shipments.filter((s: any) => {
    const matchesFilter = filter === 'all' || s.status === filter
    const matchesSearch = s.tracking_id.toLowerCase().includes(search.toLowerCase()) ||
                         s.delivery_point?.name?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-6xl font-black text-text font-display tracking-tighter uppercase leading-none mb-4">
            Cargo <span className="text-primary">Manifest</span>
          </h1>
          <p className="text-muted font-bold text-lg tracking-tight">
            Managing <span className="text-text">{shipments.length}</span> active shipments across the global logistics grid.
          </p>
        </div>
        <Button variant="accent" onClick={() => setIsModalOpen(true)} className="h-16 px-10 rounded-2xl shadow-2xl shadow-primary/20 bg-primary hover:bg-primary-dark text-bg font-black uppercase tracking-widest group">
          <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300 mr-2" />
          Initialize New Shipment
        </Button>
      </div>

      <div className="bg-surface p-2 rounded-[2.5rem] border border-border shadow-2xl flex flex-col md:flex-row gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search by Tracking ID or Destination..."
            className="w-full h-16 pl-20 pr-8 bg-surface2 border-none rounded-[1.8rem] text-text font-bold placeholder:text-muted focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex overflow-x-auto gap-1 p-1 custom-scrollbar">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={clsx(
                "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                filter === s ? "bg-primary text-bg shadow-lg shadow-primary/20" : "text-muted hover:bg-surface2"
              )}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
            <p className="text-[10px] font-black uppercase text-muted tracking-[0.3em] animate-pulse">Syncing Cargo Manifest...</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
             <Package className="text-muted mb-6" size={64} />
             <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tighter">No Active Neural Loads</h3>
             <p className="text-sm text-muted max-w-xs font-bold leading-relaxed">Initialize your first shipment tracking vector to begin logistics optimization.</p>
          </div>
        ) : (
          filtered.map((s: any) => (
            <Card key={s.id} className="relative group transition-all hover:scale-[1.01] hover:shadow-2xl border border-border p-0 overflow-visible mb-8 bg-surface shadow-2xl rounded-[2.5rem]">
               <div className="grid grid-cols-1 lg:grid-cols-4 items-center">
                  
                  {/* Column 1: Tracking Vector */}
                  <div className="p-10 border-r border-border h-full flex flex-col justify-center">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Tracking ID</div>
                        <Badge variant="green" className="bg-success/10 text-success border-none rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                           <ShieldCheck size={10} className="inline mr-1 mb-0.5" /> SECURE
                        </Badge>
                     </div>
                     <h3 className="text-3xl font-black text-primary font-mono tracking-tight leading-none mb-6">{s.tracking_id}</h3>
                     <div className="bg-surface2 text-text px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-block w-fit border border-border">
                        {s.priority} priority
                     </div>
                  </div>

                  {/* Column 2: Journey Logistics */}
                  <div className="col-span-1 lg:col-span-1 p-10 border-r border-border flex flex-col gap-8">
                     <div className="space-y-2">
                        <div className="text-[8px] font-black text-muted uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(79,172,254,0.6)]" /> Departure
                        </div>
                        <div className="text-lg font-black text-text leading-tight">{s.origin_name || 'Fleet Hub Alpha'}</div>
                        <div className="text-[10px] font-bold text-muted uppercase truncate max-w-[200px] tracking-tight">{s.origin_address || 'Sector V, Salt Lake City, Kolkata'}</div>
                     </div>
                     <div className="space-y-2">
                        <div className="text-[8px] font-black text-muted uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(249,201,53,0.6)]" /> Destination
                        </div>
                        <div className="text-lg font-black text-text leading-tight">{s.delivery_point?.name || 'Local Distribution'}</div>
                        <div className="text-[10px] font-bold text-muted uppercase truncate max-w-[200px] tracking-tight">{s.delivery_point?.address || 'Street 104, New Delhi'}</div>
                     </div>
                  </div>

                  {/* Column 3: Cargo Payload */}
                  <div className="p-10 border-r border-border h-full flex flex-col justify-center">
                     <div className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-6">Cargo Payload</div>
                     <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-surface2 flex items-center justify-center border border-border group-hover:bg-bg transition-colors shadow-lg">
                           <Layers className="text-primary" size={24} />
                        </div>
                        <div>
                           <div className="text-2xl font-black text-text leading-none mb-2">{s.total_items} Items</div>
                           <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Total: {s.total_weight_kg} KG</div>
                        </div>
                     </div>
                     <button className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase text-primary hover:text-text transition-colors tracking-widest">
                        <Navigation size={14} className="text-primary" /> View Intelligence Grid
                     </button>
                  </div>

                  {/* Column 4: Status Intelligence */}
                  <div className="p-10 h-full flex flex-col justify-center bg-surface2/30">
                     <div className="flex items-center justify-between mb-10">
                        <div className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Status</div>
                        <div className="flex items-center gap-3">
                           <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(79,172,254,0.8)]" />
                           <span className="text-xs font-black text-text uppercase tracking-tighter">{s.status.replace('_', ' ')}</span>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 gap-2">
                        {['picked_up', 'in_transit', 'delivered'].map(st => (
                          <button
                            key={st}
                            onClick={() => statusMutation.mutate({ id: s.id, status: st })}
                            disabled={s.status === st || statusMutation.isPending}
                            className={clsx(
                              "h-12 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                              s.status === st 
                                ? "bg-primary text-bg border-primary shadow-lg shadow-primary/20" 
                                : "bg-surface/50 text-muted border-border hover:border-primary/40 hover:text-text"
                            )}
                          >
                            {st.replace('_', ' ')}
                          </button>
                        ))}
                     </div>
                  </div>

               </div>
            </Card>
          ))
        )}
      </div>

      <AddShipmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}

function AddShipmentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  const [formData, setFormData] = useState({
    tracking_id: `RTX-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    origin_id: '',
    origin_name: '',
    origin_address: '',
    origin_lat: 0,
    origin_lng: 0,
    delivery_point_id: '',
    delivery_point_name: '',
    delivery_point_address: '',
    dest_lat: 0,
    dest_lng: 0,
    priority: 'medium',
    cargo_type: 'standard',
    total_items: 1,
    total_weight_kg: 5.0,
    plan_for_later: false,
    scheduled_date: '',
    scheduled_time: ''
  })

  // State for origin search
  const [originSearch, setOriginSearch] = useState('')
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([])
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false)

  useEffect(() => {
    const searchMapbox = async (query: string, setter: (val: any[]) => void, loadingSetter: (val: boolean) => void) => {
      if (query.length < 3) {
        setter([])
        return
      }
      loadingSetter(true)
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN
      const resp = await axios.get(
        `${import.meta.env.VITE_MAPBOX_GEOCODING_URL}/${encodeURIComponent(query)}.json`,
        {
          params: {
            access_token: token,
            country: 'IN',
            limit: 5,
            types: 'place,locality,address'
          }
        }
      )
        setter(resp.data.features || [])
      } catch (err) {
        console.error('Search failed', err)
      } finally {
        loadingSetter(false)
      }
    }

    const timerDest = setTimeout(() => searchMapbox(searchTerm, setSuggestions, setIsSearching), 500)
    const timerOrigin = setTimeout(() => searchMapbox(originSearch, setOriginSuggestions, setIsSearchingOrigin), 500)
    
    return () => {
      clearTimeout(timerDest)
      clearTimeout(timerOrigin)
    }
  }, [searchTerm, originSearch])

  const mutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        tracking_id: data.tracking_id,
        delivery_point_id: data.delivery_point_id,
        dest_name: data.delivery_point_name,
        dest_address: data.delivery_point_address,
        dest_lat: data.dest_lat,
        dest_lng: data.dest_lng,
        origin_name: data.origin_name,
        origin_address: data.origin_address,
        origin_lat: data.origin_lat,
        origin_lng: data.origin_lng,
        total_items: Number(data.total_items),
        total_weight_kg: Number(data.total_weight_kg),
        priority: data.priority,
        parcels: [] // Backend handles summary
      }
      return shipmentsAPI.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      toast.success('Shipment successfully initialized')
      onClose()
    }
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 backdrop-blur-2xl bg-surface2/40 animate-in fade-in duration-500">
      <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/20 animate-in zoom-in-95 duration-500 scrollbar-none">
        
        {/* Header with Visual Treatment */}
        <div className="relative p-10 bg-surface overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-transparent pointer-events-none" />
           <div className="relative z-10">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                   <Package className="text-slate-900" size={20} />
                </div>
                <Badge variant="orange" className="h-6">LIVE NEURAL GRID</Badge>
             </div>
             <h2 className="text-4xl font-black text-text font-display tracking-tight uppercase leading-none mb-2">Request Shipment</h2>
             <p className="text-muted font-bold text-sm tracking-tight">Deploying cargo onto the active pan-India logistics network.</p>
           </div>
           
           {/* Decorative Illustration (Abstract Map Element) */}
           <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
        </div>

        <div className="p-10 space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Origin Search */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                 <label className="text-[10px] font-black text-muted uppercase tracking-widest pl-1 flex items-center gap-2">
                   <Navigation size={12} className="text-blue-500" /> Departure Point
                 </label>
              </div>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted">
                  {isSearchingOrigin ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <MapPin size={18} />}
                </div>
                <input 
                  placeholder="Where is the pickup?"
                  value={originSearch || formData.origin_name}
                  onChange={(e) => {
                    setOriginSearch(e.target.value)
                    if (formData.origin_name) setFormData({...formData, origin_name: '', origin_address: ''})
                  }}
                  className="w-full h-14 pl-14 pr-6 bg-slate-50 border-2 border-transparent rounded-2xl text-slate-900 font-bold placeholder:text-muted focus:bg-white focus:border-blue-500/30 transition-all outline-none text-sm"
                />
                {originSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-[60] bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
                    {originSuggestions.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setFormData({
                            ...formData, 
                            origin_name: p.text,
                            origin_address: p.place_name,
                            origin_lat: p.center[1],
                            origin_lng: p.center[0]
                          })
                          setOriginSearch('')
                          setOriginSuggestions([])
                        }}
                        className="w-full px-5 py-3 text-left hover:bg-slate-50 flex flex-col gap-0.5"
                      >
                        <span className="text-xs font-black text-slate-900">{p.text}</span>
                        <span className="text-[9px] font-bold text-muted uppercase truncate">{p.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Destination Search */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                 <label className="text-[10px] font-black text-muted uppercase tracking-widest pl-1 flex items-center gap-2">
                   <MapPin size={12} className="text-yellow-500" /> Goal Destination
                 </label>
              </div>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted">
                  {isSearching ? <Loader2 size={18} className="animate-spin text-yellow-500" /> : <Search size={18} />}
                </div>
                <input 
                  placeholder="Final drop destination?"
                  value={searchTerm || formData.delivery_point_name}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    if (formData.delivery_point_name) setFormData({...formData, delivery_point_name: '', delivery_point_id: ''})
                  }}
                  className="w-full h-14 pl-14 pr-6 bg-slate-50 border-2 border-transparent rounded-2xl text-slate-900 font-bold placeholder:text-muted focus:bg-white focus:border-yellow-500/30 transition-all outline-none text-sm"
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-[60] bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
                    {suggestions.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setFormData({
                            ...formData, 
                            delivery_point_id: p.id, 
                            delivery_point_name: p.text,
                            delivery_point_address: p.place_name,
                            dest_lat: p.center[1],
                            dest_lng: p.center[0]
                          })
                          setSearchTerm('')
                          setSuggestions([])
                        }}
                        className="w-full px-5 py-3 text-left hover:bg-slate-50 flex flex-col gap-0.5"
                      >
                        <span className="text-xs font-black text-slate-900">{p.text}</span>
                        <span className="text-[9px] font-bold text-muted uppercase truncate">{p.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cargo Payload (requested) */}
          <div className="space-y-4">
             <label className="text-[10px] font-black text-muted uppercase tracking-widest pl-1">Cargo Payload Configuration</label>
             <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                     <div className="relative">
                        <Package size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                        <input 
                          type="number"
                          placeholder="Item Count"
                          min="1"
                          value={formData.total_items}
                          onChange={(e) => setFormData({...formData, total_items: parseInt(e.target.value) || 0})}
                          className="w-full h-14 pl-12 bg-slate-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-slate-100 outline-none"
                        />
                     </div>
                  </div>
                  <div className="flex-1 space-y-2">
                     <div className="relative">
                        <Thermometer size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                        <input 
                          type="number"
                          placeholder="Total Weight (KG)"
                          min="0.1"
                          step="0.1"
                          value={formData.total_weight_kg}
                          onChange={(e) => setFormData({...formData, total_weight_kg: parseFloat(e.target.value) || 0})}
                          className="w-full h-14 pl-12 bg-slate-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-slate-100 outline-none"
                        />
                     </div>
                  </div>
             </div>
          </div>

          {/* Section 2: Cargo Archetypes (Image 3 style) */}
          <div className="space-y-4">
             <label className="text-[10px] font-black text-muted uppercase tracking-widest pl-1 flex items-center gap-2">
               <Layers size={12} className="text-muted" /> Shipment Intelligence
             </label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CARGO_ARCHETYPES.map(cargo => (
                  <button
                    key={cargo.id}
                    onClick={() => setFormData({...formData, cargo_type: cargo.id})}
                    className={clsx(
                      "relative p-5 rounded-[2rem] border-2 text-left transition-all group overflow-hidden",
                      formData.cargo_type === cargo.id 
                        ? "bg-surface border-slate-900 shadow-xl shadow-slate-900/10" 
                        : "bg-white border-slate-100 hover:border-yellow-500/30"
                    )}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                       <div className={clsx(
                         "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                         formData.cargo_type === cargo.id ? "bg-surface2" : "bg-slate-50"
                       )}>
                          <img src={cargo.icon} alt="" className="w-10 h-10 object-contain drop-shadow-xl" />
                       </div>
                       <div>
                          <div className={clsx(
                            "text-sm font-black uppercase tracking-tight",
                            formData.cargo_type === cargo.id ? "text-yellow-400" : "text-slate-900"
                          )}>{cargo.name}</div>
                          <div className={clsx(
                            "text-[10px] font-bold",
                            formData.cargo_type === cargo.id ? "text-muted" : "text-muted"
                          )}>{cargo.desc}</div>
                       </div>
                    </div>
                    {formData.cargo_type === cargo.id && (
                       <Zap size={40} className="absolute -right-4 -bottom-4 text-text/5 rotate-12" />
                    )}
                  </button>
                ))}
             </div>
          </div>

          {/* Section 3: Priority & Plan for Later (Image 4 style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-4">
               <label className="text-[10px] font-black text-muted uppercase tracking-widest pl-1">Priority Grid</label>
               <div className="flex flex-wrap gap-2">
                  {PRIORITIES.map(p => (
                    <button
                      key={p}
                      onClick={() => setFormData({...formData, priority: p})}
                      className={clsx(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        formData.priority === p ? "bg-surface text-yellow-400" : "bg-slate-50 text-muted hover:bg-slate-100"
                      )}
                    >
                      {p}
                    </button>
                  ))}
               </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <label className="text-[10px] font-black text-muted uppercase tracking-widest pl-1">Plan For Later</label>
                   <button 
                     onClick={() => setFormData({...formData, plan_for_later: !formData.plan_for_later})}
                     className={clsx(
                       "relative w-10 h-6 rounded-full transition-colors",
                       formData.plan_for_later ? "bg-yellow-500" : "bg-slate-200"
                     )}
                   >
                      <div className={clsx(
                        "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                        formData.plan_for_later ? "translate-x-4" : "translate-x-0"
                      )} />
                   </button>
                </div>

                {formData.plan_for_later && (
                  <div className="flex gap-2 animate-in slide-in-from-right-4 duration-300">
                     <div className="relative flex-1 group">
                        <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-yellow-500" />
                        <input 
                           type="date"
                           className="w-full h-12 pl-10 pr-3 bg-slate-50 border-none rounded-xl text-[10px] font-bold text-slate-900 focus:ring-2 focus:ring-yellow-500/20"
                           onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                        />
                     </div>
                     <div className="relative flex-1 group">
                        <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-yellow-500" />
                        <input 
                           type="time"
                           className="w-full h-12 pl-10 pr-3 bg-slate-50 border-none rounded-xl text-[10px] font-bold text-slate-900 focus:ring-2 focus:ring-yellow-500/20"
                           onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                        />
                     </div>
                  </div>
                )}
             </div>
          </div>
          
          <div className="flex gap-4 pt-6">
            <Button variant="ghost" className="flex-1 h-20 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-red-50 hover:text-red-500 border-none" onClick={onClose}>
               Abort
            </Button>
            <Button 
              variant="accent" 
              className="flex-[2] h-20 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-yellow-500/20 bg-yellow-500 hover:bg-yellow-400 text-slate-900"
              onClick={() => mutation.mutate(formData)}
              disabled={!formData.delivery_point_id || mutation.isPending}
            >
              {mutation.isPending ? (
                <div className="flex items-center gap-2">
                   <Loader2 size={16} className="animate-spin" /> Transmitting...
                </div>
              ) : "Confirm Shipment Deployment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
