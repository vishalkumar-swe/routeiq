import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Package, MapPin, Clock, CheckCircle2, 
  Search, Shield, Phone, AlertCircle,
  Truck, ArrowLeft
} from 'lucide-react'
import { shipmentsAPI } from '@/services/api'
import clsx from 'clsx'

export default function CustomerTrackingPage() {
  const { trackingId } = useParams()
  const [searchId, setSearchId] = useState('')
  
  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ['tracking', trackingId],
    queryFn: () => trackingId ? shipmentsAPI.get(trackingId) : null,
    enabled: !!trackingId
  })

  return (
    <div className="min-h-screen bg-bg text-text selection:bg-primary/30">
      <div className="bg-mesh" />
      <div className="bg-grid opacity-20" />
      
      {/* Header */}
      <nav className="relative z-20 border-b border-border bg-surface/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-bg font-black text-xl">RI</span>
            </div>
            <div className="hidden sm:block">
              <div className="font-display font-black text-white uppercase tracking-tight leading-none text-sm">ROUTEIQ</div>
              <div className="font-display font-bold text-primary uppercase tracking-[0.12em] text-[8px]">POWERED BY PRUDATA TECHNOLOGIES</div>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-xs font-black uppercase tracking-widest text-muted hover:text-white transition-colors">
              Enterprise Login
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Search Bar if no trackingId or for new search */}
        <div className="mb-12">
          <h1 className="text-4xl font-black text-white font-display tracking-tighter uppercase mb-4">
            Track <span className="text-primary">Your Cargo</span>
          </h1>
          <form 
            onSubmit={(e) => { e.preventDefault(); if(searchId) window.location.href = `/track/${searchId}` }}
            className="relative group"
          >
            <input 
              type="text" 
              placeholder="Enter Tracking ID (e.g., SN-12345678)"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full h-16 bg-surface border border-border rounded-2xl px-16 text-sm font-bold text-white placeholder:text-muted focus:outline-none focus:border-primary transition-all shadow-2xl"
            />
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={20} />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 h-10 px-6 bg-primary text-bg font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all">
              Track
            </button>
          </form>
        </div>

        {isLoading && (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted animate-pulse">Consulting Nexus AI...</p>
          </div>
        )}

        {error && (
          <div className="p-8 rounded-3xl bg-error/10 border border-error/20 flex flex-col items-center text-center gap-4 animate-fade-up">
            <AlertCircle className="text-error w-12 h-12" />
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Tracking ID Not Found</h3>
              <p className="text-muted text-sm font-bold mt-1">Please verify your ID and try again or contact support.</p>
            </div>
          </div>
        )}

        {shipment && (
          <div className="space-y-8 animate-fade-up">
            {/* Status Card */}
            <div className="p-10 rounded-[2.5rem] bg-surface border border-border shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Truck size={120} className="text-primary rotate-12" />
              </div>
              
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                  <div>
                    <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                      {shipment.status.replace('_', ' ')}
                    </span>
                    <h2 className="text-5xl font-black text-white font-display tracking-tighter uppercase mt-4">
                      {shipment.tracking_id}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Estimated Delivery</p>
                    <p className="text-2xl font-black text-white uppercase">Today, 4:30 PM</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative mb-16">
                   <div className="h-1.5 w-full bg-surface2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary shadow-[0_0_12px_rgba(79,172,254,0.6)]" 
                        style={{ width: shipment.status === 'delivered' ? '100%' : shipment.status === 'in_transit' ? '60%' : '20%' }} 
                      />
                   </div>
                   <div className="absolute top-0 left-0 w-full flex justify-between -translate-y-1/2">
                      {['booked', 'picked_up', 'in_transit', 'delivered'].map((step) => (
                        <div key={step} className="flex flex-col items-center gap-3">
                           <div className={clsx(
                             "w-4 h-4 rounded-full border-4 border-surface shadow-lg transition-all duration-500",
                             shipment.status === step || (shipment.status === 'delivered' && step !== 'delivered') ? "bg-primary scale-125" : "bg-muted"
                           )} />
                           <span className={clsx(
                             "text-[9px] font-black uppercase tracking-widest",
                             shipment.status === step ? "text-white" : "text-muted"
                           )}>
                             {step.replace('_', ' ')}
                           </span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center shrink-0 border border-border">
                        <MapPin className="text-primary" size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Destination</p>
                        <p className="text-sm font-bold text-white tracking-tight leading-relaxed">{shipment.delivery_point?.address || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center shrink-0 border border-border">
                        <Package className="text-primary" size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Cargo Details</p>
                        <p className="text-sm font-bold text-white tracking-tight">{shipment.total_weight_kg}kg • {shipment.priority.toUpperCase()} PRIORITY</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                       <Shield className="text-primary" size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">AI Assurance</p>
                      <p className="text-xs text-muted font-bold mt-0.5 leading-relaxed">Nexus AI is monitoring this shipment for route anomalies and delay risks.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <button className="h-16 bg-surface2 border border-border rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-white hover:border-primary transition-all">
                  <Phone size={16} className="text-primary" />
                  Contact Carrier
               </button>
               <button className="h-16 bg-surface2 border border-border rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-white hover:border-primary transition-all">
                  <CheckCircle2 size={16} className="text-primary" />
                  Download Invoice
               </button>
            </div>
          </div>
        )}
        
        {!trackingId && !shipment && (
           <div className="py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Package, title: "Real-time Tracking", desc: "Live GPS updates from the Nexus AI network." },
                { icon: Shield, title: "Secure Transit", desc: "AI-powered anomaly detection for cargo safety." },
                { icon: Clock, title: "Smart ETAs", desc: "Predictive ETAs based on traffic and weather." }
              ].map((f, i) => (
                <div key={i} className="p-8 rounded-3xl bg-surface border border-border hover:border-primary/30 transition-all group text-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <f.icon className="text-primary" size={24} />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2">{f.title}</h4>
                  <p className="text-xs text-muted font-bold leading-relaxed">{f.desc}</p>
                </div>
              ))}
           </div>
        )}
      </main>

      <footer className="relative z-20 py-12 border-t border-border mt-12 bg-surface/30">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">© 2026 ROUTEIQ • POWERED BY PRUDATA TECHNOLOGIES</p>
        </div>
      </footer>
    </div>
  )
}
