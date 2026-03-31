import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cpu, BarChart, AlertTriangle, Loader2, Zap, RotateCw, ShieldCheck } from 'lucide-react';
import { AIInsightCard } from '../components/dashboard/AIInsightCard';
import { analyticsAPI, routesAPI, trafficAPI, optimizationAPI } from '@/services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';


export default function AIHubPage() {
  const queryClient = useQueryClient();
  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => analyticsAPI.insights(),
    refetchInterval: 5_000, // Faster refresh during Phase 5 testing
  });

  const rerouteMutation = useMutation({
    mutationFn: ({ routeId, newSequence }: { routeId: string, newSequence: string[] }) => 
      routesAPI.reroute(routeId, newSequence),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      toast.success('Dynamic Reroute Applied Successfully');
    }
  });

  const trafficMutation = useMutation({
    mutationFn: () => {
      // Near Saket, Delhi (where our demo routes are)
      const lat = 28.5244 + (Math.random() - 0.5) * 0.05;
      const lng = 77.2167 + (Math.random() - 0.5) * 0.05;
      return trafficAPI.simulateEvent(lat, lng, 'accident', 0.8);
    },
    onSuccess: (data: any) => {
      toast.success(`Traffic Event Triggered! Suggestions: ${data.reroute_suggestions_count}`);
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
    }
  });

  const { data: activeMissions = [] } = useQuery({
    queryKey: ['active-missions'],
    queryFn: () => analyticsAPI.activeMissions(),
    refetchInterval: 10_000,
  });

  const incubateMutation = useMutation({
    mutationFn: (vehicleId: string) => optimizationAPI.incubate(vehicleId),
    onSuccess: (data: any) => {
      if (data.status === 'suggested') {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      } else {
        toast(data.message, { icon: 'ℹ️' });
      }
    }
  });

  const syncMutation = useMutation({
    mutationFn: () => analyticsAPI.syncSparkGPS(),
    onSuccess: (data: any) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['active-missions'] });
    }
  });

  const tickerAlerts = insights.length > 0 
    ? insights.map((ins: any) => ins.insight) 
    : [
        "SYSTEM: Synchronizing route clusters for zone BX-04...",
        "FLEET: Predictive maintenance vector applied to vehicle ID #4002",
        "GLOBAL: Calibrating demand distribution model v2.4"
      ];
  
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const isSparkGPSActive = !!activeMissions.length;

  const rerouteSuggestions = insights.filter((ins: any) => ins.type === 'reroute_suggestion');

  if (isLoading && insights.length === 0) {
    return (
      <div className="py-40 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] animate-pulse">Initialized Neural Core...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Mapbox Token Alert */}
      {!mapboxToken && (
        <div className="w-full bg-red-500/10 border border-red-500/20 rounded-3xl p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-red-500 text-white shadow-lg">
              <ShieldCheck size={20} className="rotate-180" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Geospatial Textures Restricted</h4>
              <p className="text-xs text-slate-500 font-bold tracking-tight">Mapbox Token missing. Simulation layer active. High-fidelity rendering requires VITE_MAPBOX_TOKEN.</p>
            </div>
          </div>
          <button className="px-5 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
            Configuration Guide
          </button>
        </div>
      )}
      {/* News-Style Alert Ticker */}
      <div className="w-full bg-slate-900 border-y border-yellow-500/30 overflow-hidden py-3 flex items-center shadow-2xl">
        <div className="flex items-center gap-4 px-6 border-r border-yellow-500/30 bg-slate-900 z-10 shrink-0">
          <div className={clsx(
            "w-2 h-2 rounded-full",
            isSparkGPSActive ? "bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-red-500"
          )} />
          <span className="text-yellow-500 text-[10px] font-black tracking-widest uppercase">
            {isSparkGPSActive ? "SparkGPS // Live Stream" : "System // Offline"}
          </span>
        </div>
        <div className="flex animate-infinite-scroll whitespace-nowrap gap-12 items-center px-12">
          {tickerAlerts.concat(tickerAlerts).map((alert: string, i: number) => (
            <span key={i} className="text-white/80 text-xs font-bold tracking-tight flex items-center gap-3">

              <div className="w-1 h-1 rounded-full bg-yellow-500" />
              {alert}
            </span>
          ))}
        </div>
      </div>

      {/* Header with Pulse Animation */}
      <div className="relative p-10 rounded-[2.5rem] bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 p-8">
          <Cpu className="w-24 h-24 text-yellow-500/20 animate-pulse" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-4 py-1.5 rounded-full bg-slate-900 text-yellow-400 text-[10px] font-black tracking-[0.2em] uppercase shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
              Phase 5 Intelligence // Active
            </span>
            <button 
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black tracking-[0.1em] uppercase shadow-lg hover:scale-105 transition-all disabled:opacity-50"
            >
              <RotateCw size={10} className={clsx(syncMutation.isPending && "animate-spin")} />
              Sync Hardware
            </button>
            <button 
              onClick={() => trafficMutation.mutate()}
              disabled={trafficMutation.isPending}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500 text-white text-[10px] font-black tracking-[0.1em] uppercase shadow-lg hover:scale-105 transition-all disabled:opacity-50"
            >
              <Zap size={10} className="fill-current" />
              Simulate Traffic Event
            </button>
          </div>
          
          <h1 className="text-6xl font-black text-slate-900 font-display tracking-tighter uppercase mb-4 leading-[0.9]">
            AI <span className="text-yellow-500">Intelligence</span> Hub
          </h1>
          <p className="max-w-xl text-slate-500 font-bold text-lg leading-relaxed tracking-tight">
            Real-time neural synthesis processing live telemetry. Autonomous risk detection and dynamic re-routing active.
          </p>
        </div>

        {/* 3D Grid Overlay Effect */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#EAB308 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>

      {/* Dynamic Reroute Center */}
      {rerouteSuggestions.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-4">
            Dynamic Reroute Center
            <div className="flex-1 h-px bg-slate-200" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rerouteSuggestions.map((s: any) => (
              <div key={s.id} className="p-8 rounded-[2rem] bg-slate-900 border border-yellow-500/30 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                  <RotateCw className="w-32 h-32 text-yellow-500" />
                </div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="px-3 py-1 rounded-full bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                      <Zap size={10} className="fill-current" /> High ROI Decision
                    </div>
                    <span className="text-yellow-500/50 font-mono text-[10px]">VEHICLE: {s.vehicle_id.slice(0,8)}</span>
                  </div>

                  <h4 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-2">
                    Potential Savings: <span className="text-yellow-500">-{s.saved_mins} Mins</span>
                  </h4>
                  <p className="text-slate-400 font-bold text-sm mb-8">{s.insight}</p>

                  <div className="mt-auto flex gap-3">
                    <button 
                      onClick={() => rerouteMutation.mutate({ routeId: s.route_id, newSequence: s.new_sequence })}
                      disabled={rerouteMutation.isPending}
                      className="flex-1 h-14 bg-yellow-500 text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-yellow-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {rerouteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply New Vector"}
                    </button>
                    <button className="flex-1 h-14 bg-white/5 text-white/50 border border-white/10 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-white/10 transition-all">
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.length > 0 ? (
          insights.filter((i: any) => i.type !== 'reroute_suggestion').slice(0, 3).map((ins: any) => (
            <AIInsightCard 
              key={ins.id}
              title={ins.title}
              insight={ins.insight}
              score={ins.score}
              trend={ins.trend}
            />
          ))
        ) : (
          <>
            <AIInsightCard 
              title="Global Optimization"
              insight="Analyzing route clusters for efficiency leaks. Current aggregate performance: 94.2%."
              score={94.2}
              trend="up"
            />
            <div className="rounded-[2.5rem] bg-slate-50 border border-slate-200 border-dashed p-10 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-slate-300 animate-spin mb-3" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scanning next sector...</p>
            </div>
          </>
        )}
      </div>

      {/* System Status Table */}
      <div className="rounded-[2.5rem] bg-white border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-yellow-400 text-slate-900 shadow-sm border border-yellow-500/20">
              <BarChart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 font-display tracking-tight uppercase">Decision Stream</h2>
              <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">Live Heuristic Logs</p>
            </div>
          </div>
          <button className="px-6 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors uppercase tracking-widest">
            Export Model Data
          </button>
        </div>

        <div className="space-y-4">
          {insights.length > 0 ? insights.map((log: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200 group hover:border-yellow-400/50 transition-colors">
              <div className="flex items-center gap-4">
                <span className={clsx(
                  "font-mono text-[10px] font-bold px-2 py-0.5 rounded border",
                  log.severity === 'high' ? "bg-red-500/10 text-red-600 border-red-500/20" : 
                  log.severity === 'medium' ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                )}>
                  {log.type.toUpperCase()}
                </span>
                <span className="text-slate-700 font-bold text-sm tracking-tight group-hover:text-slate-900 transition-colors">{log.insight}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span className="text-slate-400 font-mono text-xs uppercase tracking-tighter">verified</span>
              </div>
            </div>
          )) : (
            <p className="text-center py-10 text-slate-400 uppercase font-black text-[10px] tracking-widest">No active anomalies detected.</p>
          )}
        </div>
      </div>

      {/* Mission Control: Real-time Incubator */}
      <div className="space-y-6">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-4 px-2">
            Mission Control: Real-time Incubator
            <div className="flex-1 h-px bg-slate-200" />
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeMissions.length > 0 ? activeMissions.map((mission: any) => (
              <ActiveMissionCard 
                key={mission.vehicle_id} 
                mission={mission} 
                onIncubate={() => incubateMutation.mutate(mission.vehicle_id)}
                isPending={incubateMutation.isPending && incubateMutation.variables === mission.vehicle_id}
              />
            )) : (
              <div className="lg:col-span-2 py-12 rounded-[2.5rem] bg-slate-50 border border-slate-200 border-dashed flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 text-slate-300 animate-spin mb-3" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Active Ground Vectors...</p>
              </div>
            )}
          </div>
      </div>


      {/* Custom Styles for Animation */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        @keyframes infiniteScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-infinite-scroll {
          animation: infiniteScroll 60s linear infinite;
        }
      `}</style>
    </div>
  );
}

function ActiveMissionCard({ mission, onIncubate, isPending }: { mission: any, onIncubate: () => void, isPending: boolean }) {
  const isOptimizable = mission.has_suggestion || mission.status === 'optimization_available';
  
  return (
    <div className={clsx(
      "p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm transition-all group",
      isOptimizable ? "ring-2 ring-yellow-400 ring-offset-4 ring-offset-slate-50 border-yellow-200" : "hover:shadow-md"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.1)] transition-colors",
            isOptimizable ? "bg-yellow-400 text-slate-900" : "bg-slate-900 text-yellow-500"
          )}>
            <Zap size={18} className={clsx((mission.sync_pulse === 'active' || isOptimizable) && "animate-pulse")} />
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{mission.plate_number}</div>
            <div className={clsx(
              "text-[10px] font-bold uppercase tracking-widest",
              isOptimizable ? "text-yellow-600" : "text-slate-400"
            )}>
              {isOptimizable ? "Optimization Available" : (mission.status === 'on_route' ? 'LIVE // IN TRANSIT' : 'PENDING')}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={clsx(
            "text-lg font-black leading-none",
            isOptimizable ? "text-yellow-500" : "text-slate-900"
          )}>
            {mission.ai_efficiency_score.toFixed(1)}%
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Efficiency</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-slate-400">Mission Progress</span>
          <span className="text-slate-900">{Math.round(mission.progress_pct)}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={clsx("h-full transition-all duration-1000", isOptimizable ? "bg-yellow-400" : "bg-slate-900")} 
            style={{ width: `${mission.progress_pct}%` }} 
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Speed</div>
            <div className="text-sm font-black text-slate-900">{mission.speed} <span className="text-[10px] text-slate-400">km/h</span></div>
          </div>
          <div className={clsx(
            "p-3 rounded-xl border",
            isOptimizable ? "bg-yellow-500/10 border-yellow-200" : "bg-slate-50 border-slate-100"
          )}>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              {isOptimizable ? "Savings" : "Stops Left"}
            </div>
            <div className={clsx(
              "text-sm font-black",
              isOptimizable ? "text-yellow-600" : "text-slate-900"
            )}>
              {isOptimizable ? `~${mission.potential_savings} min` : mission.remaining_stops}
            </div>
          </div>
        </div>

        <button 
          onClick={onIncubate}
          disabled={isPending}
          className={clsx(
            "w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
            isOptimizable 
              ? "bg-yellow-400 text-slate-900 hover:bg-yellow-500 shadow-lg shadow-yellow-400/20" 
              : "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          )}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            isOptimizable ? <RotateCw size={14} className="animate-spin-slow" /> : <ShieldCheck size={14} className="text-yellow-500" />
          )}
          {isOptimizable ? "Apply Neural Reroute" : "Incubate Planning"}
        </button>
      </div>
    </div>
  );
}
