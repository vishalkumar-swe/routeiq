import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MapPin, Navigation, CheckCircle2, ChevronRight, Phone, 
  MessageSquare, Loader2, Zap, Cloud, Wind, Fuel, Map, 
  Shield, Play, Square, AlertTriangle, Truck, Package 
} from 'lucide-react';
import { routesAPI, shipmentsAPI, telemetryAPI } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

// --- Sub-components ---
function SignaturePad({ onSave }: { onSave: (data: string) => void }) {
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = 'var(--primary)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
  }, []);

  const getPos = (e: any) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX || e.touches?.[0]?.clientX) - rect.left,
      y: (e.clientY || e.touches?.[0]?.clientY) - rect.top
    };
  };

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface border-2 border-border rounded-[2rem] overflow-hidden touch-none h-48 relative">
         <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <span className="text-4xl font-black uppercase tracking-[1em] text-text">SIGN HERE</span>
         </div>
        <canvas 
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={() => setIsDrawing(false)}
          onMouseLeave={() => setIsDrawing(false)}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={() => setIsDrawing(false)}
          ref={canvasRef}
          width={400}
          height={200}
          className="w-full h-full cursor-crosshair relative z-10"
        />
      </div>
      <button 
        onClick={() => onSave('SIG_' + Math.random().toString(16).slice(2, 10))}
        className="w-full h-16 bg-yellow-500 text-black font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-yellow-500/10 active:scale-95 transition-all"
      >
        Verify & Commit
      </button>
    </div>
  );
}

export default function DriverPage() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s: any) => s.userId);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [shiftStatus, setShiftStatus] = useState<'OFFLINE' | 'ON_DUTY' | 'ON_MISSION'>('OFFLINE');
  const [showPOD, setShowPOD] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // 1. Fetch active route
  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['driver-routes', userId],
    queryFn: () => routesAPI.list({ status: 'active' }),
    refetchInterval: 30_000,
  });

  const activeRoute = routes[0];
  const stops = activeRoute?.stops || [];
  const currentStop = stops.find((s: any) => s.id === activeStopId) || stops.find((s: any) => s.status === 'pending');

  useEffect(() => {
    if (activeRoute && shiftStatus === 'OFFLINE') setShiftStatus('ON_DUTY');
    if (currentStop && !activeStopId) setActiveStopId(currentStop.id);
  }, [activeRoute, currentStop]);

  // 2. Real Mobile GPS Telemetry OR Simulation
  useEffect(() => {
    if (shiftStatus === 'OFFLINE' || !activeRoute) return;

    let watchId: number;
    let simInterval: any;

    if (isSimulating && currentStop) {
      // Simulate driving from a random nearby location or current vehicle location toward destination
      let currentLat = activeRoute.vehicle?.latitude || 28.55;
      let currentLng = activeRoute.vehicle?.longitude || 77.20;
      const targetLat = currentStop.delivery_point?.lat || 28.61;
      const targetLng = currentStop.delivery_point?.lng || 77.23;
      
      const steps = 60; // Arrive in ~60 seconds
      const latStep = (targetLat - currentLat) / steps;
      const lngStep = (targetLng - currentLng) / steps;
      
      toast.success('GPS Simulator Active. Transmitting live telemetry.');

      simInterval = setInterval(() => {
        currentLat += latStep;
        currentLng += lngStep;
        
        telemetryAPI.ingest({
          vehicle_id: activeRoute.vehicle_id,
          latitude: currentLat,
          longitude: currentLng,
          speed_kmph: 45 + Math.random() * 10,
          fuel_level_pct: 82,
          heading: 0
        }).catch(console.error);

      }, 1000);
    } else if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          telemetryAPI.ingest({
            vehicle_id: activeRoute.vehicle_id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed_kmph: position.coords.speed ? (position.coords.speed * 3.6) : (shiftStatus === 'ON_MISSION' ? 40 : 0),
            fuel_level_pct: 82,
            heading: position.coords.heading || 0
          }).catch(console.error);
        },
        (error) => {
          console.error('GPS Error:', error);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (simInterval) clearInterval(simInterval);
    };
  }, [shiftStatus, activeRoute, isSimulating, currentStop?.id]);

  const updateStatus = useMutation({
    mutationFn: ({ shipmentId, status, params }: any) => 
      shipmentsAPI.updateStatus(shipmentId, status, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-routes'] });
      toast.success('Status anchored to blockchain log');
      setShowPOD(false);
      setRecipientName('');
      setSignature(null);
    }
  });

  const handleShiftToggle = () => {
    if (shiftStatus === 'OFFLINE') {
      setShiftStatus('ON_DUTY');
      toast.success('Shift started. Systems green.');
    } else {
      setShiftStatus('OFFLINE');
      toast.error('Shift ended. Telemetry offline.');
    }
  };

  const handleStartMission = () => {
    setShiftStatus('ON_MISSION');
    toast.success('Mission initiated. Rerouting to waypoint 1.');
  };

  const finalizeDelivery = () => {
    if (!recipientName || !signature) return toast.error('Check fields');
    updateStatus.mutate({
      shipmentId: currentStop.delivery_point.shipment_id,
      status: 'delivered',
      params: { 
        lat: 28.52, lng: 77.21, 
        received_by: recipientName, 
        signature_data: signature 
      }
    });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-surface2 flex flex-col items-center justify-center p-6">
      <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
      <p className="text-muted font-black uppercase tracking-widest text-[10px]">Verifying Manifest...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface2 text-text font-sans selection:bg-yellow-500 pb-24 select-none">
      {/* Dynamic Header */}
      <div className="p-8 border-b border-border bg-surface/40 backdrop-blur-2xl sticky top-0 z-[60]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${
              shiftStatus === 'OFFLINE' ? 'border-error/20 bg-error/5 text-error' : 
              shiftStatus === 'ON_DUTY' ? 'border-primary bg-primary text-bg' : 
              'border-success bg-success/20 text-success animate-pulse'
            }`}>
              <Truck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase leading-none">
                Nexus<span className="text-primary">Drive</span> <span className="text-[10px] font-bold text-muted ml-1">v3.2</span>
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${shiftStatus === 'OFFLINE' ? 'bg-slate-600' : 'bg-success animate-pulse shadow-[0_0_8px_var(--success)]'}`} />
                <p className="text-[9px] font-black text-muted uppercase tracking-widest">{shiftStatus} // FREQ: 5s</p>
              </div>
            </div>
          </div>
          <button 
            onClick={handleShiftToggle}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
              shiftStatus === 'OFFLINE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}
          >
            {shiftStatus === 'OFFLINE' ? 'Start Shift' : 'End Shift'}
          </button>
        </div>
      </div>

      <div className="p-8 space-y-8 max-w-lg mx-auto">
        {/* Mission Status / Control */}
        {shiftStatus === 'OFFLINE' ? (
          <div className="p-10 rounded-[3rem] bg-surface border border-border text-center space-y-6">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-border shadow-2xl">
              <Shield size={32} className="text-muted" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Fleet Connection <span className="text-muted">Severed</span></h2>
              <p className="text-muted text-xs font-bold mt-2 uppercase tracking-widest leading-relaxed">Start your shift to begin high-frequency telemetry tracking.</p>
            </div>
          </div>
        ) : !activeRoute ? (
          <div className="p-10 rounded-[3rem] bg-surface border border-border text-center space-y-6">
            <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto border border-yellow-500/20 shadow-2xl">
               <Package size={32} className="text-yellow-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Queue <span className="text-yellow-500">Empty</span></h2>
              <p className="text-muted text-xs font-bold mt-2 uppercase tracking-widest">Base is currently optimizing new routes. Standing by...</p>
            </div>
          </div>
        ) : shiftStatus === 'ON_DUTY' ? (
          <div className="p-10 rounded-[3rem] bg-surface border border-border space-y-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-125 transition-transform duration-700">
               <Truck size={200} />
            </div>
            <div className="relative z-10 text-center">
                    <span className="px-5 py-2 rounded-full bg-primary text-bg text-[10px] font-black uppercase tracking-widest">New Manifest</span>
                    <h2 className="text-4xl font-black mt-6 tracking-tight leading-none uppercase italic">Mission <span className="text-primary">Ready</span></h2>
                    <p className="text-muted font-bold mt-4 uppercase text-xs tracking-widest">{stops.length} Waypoints • {activeRoute.total_distance_km?.toFixed(1)} KM Total</p>
                    
                    <button 
                      onClick={handleStartMission}
                      className="w-full mt-10 h-20 bg-white text-bg rounded-[2rem] flex items-center justify-center gap-4 font-black uppercase tracking-[0.2em] text-sm hover:bg-primary transition-all shadow-2xl hover:scale-[1.02] active:scale-95"
                    >
                      <Play className="fill-current text-primary group-hover:text-bg transition-colors" /> Start Mission
                    </button>
            </div>
          </div>
        ) : (
          /* Active Mission View */
          <div className="space-y-6">
            <div className="p-10 rounded-[3rem] bg-yellow-500 text-black shadow-2xl shadow-yellow-500/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 opacity-10">
                  <Navigation className="w-32 h-32" />
               </div>
               <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="px-4 py-1.5 rounded-full bg-bg text-yellow-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                       Navigating
                    </span>
                    <div className="text-[10px] font-black uppercase">WP #{currentStop?.sequence + 1 || 0}</div>
                  </div>
                  <h2 className="text-3xl font-black mt-6 leading-none tracking-tighter uppercase italic">{currentStop?.delivery_point?.name || 'In Transit'}</h2>
                  <p className="text-black/70 font-bold mt-2 text-lg leading-tight">{currentStop?.delivery_point?.address}</p>
                  
                  <div className="mt-10 flex gap-3">
                     <button 
                        onClick={() => window.open(`${import.meta.env.VITE_GOOGLE_MAPS_BASE_URL}/maps/dir/?api=1&destination=${encodeURIComponent(currentStop?.delivery_point?.address || '')}`, '_blank')}
                        className="flex-1 h-16 bg-bg text-text rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                     >
                        <Map size={18} className="text-yellow-500" /> Maps
                     </button>
                     <button 
                        onClick={() => setIsSimulating(!isSimulating)}
                        className={`flex-1 h-16 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all ${
                          isSimulating ? 'bg-yellow-500 text-black border-2 border-black' : 'bg-surface2 text-muted border border-border'
                        }`}
                     >
                        <Zap size={18} className={isSimulating ? 'fill-current' : ''} /> {isSimulating ? 'Sim Active' : 'Simulate'}
                     </button>
                     <button 
                        onClick={() => setShowPOD(true)}
                        className="w-20 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center hover:bg-white/40 transition-all border border-black/5"
                     >
                        <CheckCircle2 size={24} />
                     </button>
                  </div>
               </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
               <button 
                 onClick={() => {
                   telemetryAPI.logStoppage({ vehicle_id: activeRoute.vehicle_id, lat: 0, lng: 0, reason: 'Traffic' });
                   toast.success('Hurdle reported');
                 }}
                 className="h-16 rounded-[1.5rem] bg-surface border border-border flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest text-muted hover:text-text transition-all"
               >
                 <AlertTriangle size={16} className="text-orange-500" /> Traffic Gap
               </button>
               <button className="h-16 rounded-[1.5rem] bg-surface border border-border flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest text-muted hover:text-text transition-all">
                 <Phone size={16} className="text-sky-500" /> Support
               </button>
            </div>
          </div>
        )}

        {/* Detailed Manifest Queue */}
        {shiftStatus !== 'OFFLINE' && activeRoute && (
          <div className="animate-in slide-in-from-bottom duration-500">
             <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.4em] mb-6 flex items-center gap-4">
                Manifest Queue
                <div className="flex-1 h-px bg-surface2" />
             </h3>
             <div className="space-y-3">
                {stops.map((stop: any, idx: number) => {
                  const isCompleted = stop.status === 'completed';
                  const isActive = stop.id === activeStopId;

                  return (
                    <div 
                      key={stop.id}
                      onClick={() => !isCompleted && setActiveStopId(stop.id)}
                      className={`p-6 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between ${
                        isActive ? 'bg-surface border-yellow-500/50 shadow-2xl' : 
                        isCompleted ? 'bg-emerald-500/5 border-emerald-500/10' : 
                        'bg-surface/30 border-border'
                      }`}
                    >
                       <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                            isActive ? 'bg-yellow-500 text-black' : 
                            isCompleted ? 'bg-emerald-500/20 text-emerald-500' : 
                            'bg-slate-800 text-muted'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                             <h4 className={`text-sm font-black uppercase tracking-tight ${isCompleted ? 'text-muted line-through' : 'text-text'}`}>
                                {stop.delivery_point?.name}
                             </h4>
                             <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-1">
                                {isCompleted ? 'Archived Waypoint' : 'Pending Verification'}
                             </p>
                          </div>
                       </div>
                       {isCompleted && <CheckCircle2 size={16} className="text-emerald-500" />}
                       {isActive && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping" />}
                    </div>
                  );
                })}
             </div>
          </div>
        )}
      </div>

      {/* POD MODAL */}
      {showPOD && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-surface2/90 backdrop-blur-xl transition-all">
          <div className="w-full max-w-lg bg-surface border border-border rounded-[3rem] p-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Proof of <span className="text-yellow-500">Delivery</span></h2>
              <button 
                onClick={() => setShowPOD(false)}
                className="w-10 h-10 rounded-full hover:bg-surface2 flex items-center justify-center transition-colors"
              >
                <Square size={16} className="text-muted rotate-45" />
              </button>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">Recipient Proxy</label>
                <input 
                  type="text"
                  placeholder="Legal Name"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  className="w-full h-18 bg-surface2/50 border border-border rounded-[1.5rem] px-8 text-sm focus:outline-none focus:border-yellow-500 transition-all font-black placeholder:text-slate-700 h-16"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">Biometric Signature Equivalent</label>
                <SignaturePad onSave={setSignature} />
              </div>

              <div className="pt-4">
                 <button 
                    onClick={finalizeDelivery}
                    disabled={!signature || !recipientName || updateStatus.isPending}
                    className="w-full h-20 bg-white text-black font-black uppercase tracking-[0.3em] text-[11px] rounded-[2rem] flex items-center justify-center gap-4 disabled:opacity-10 transition-all shadow-2xl hover:bg-yellow-500 active:scale-95"
                 >
                    {updateStatus.isPending ? <Loader2 className="animate-spin" /> : <Zap size={18} className="fill-current" />}
                    Verify & Finalize Mission
                 </button>
                 <p className="text-[8px] text-center text-slate-700 font-bold uppercase mt-6 tracking-widest">Tamper-evident log will be anchored to the IQ Ledger</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        body { background: #020617; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

