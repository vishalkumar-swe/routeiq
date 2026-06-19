import { useState, useRef, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Package, MapPin, Clock, CheckCircle2,
  Search, Shield, Phone, AlertCircle,
  Truck, Box, Zap, Navigation, ArrowRight,
  FileText, Activity
} from 'lucide-react'
import { shipmentsAPI, telemetryWS } from '@/services/api'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

/* ─── Nexus Light Theme (Off-white/Grey & Yellow) ──────────────── */
const T = {
  bg:         '#F4F4F5',  // Off-white/light gray background
  card:       '#FFFFFF',  // White cards
  cardAlt:    '#FAFAFA',  // Slightly offset gray for inner cards
  primary:    '#FFC107',  // Yellow accent
  primaryDk:  '#B38700',
  textHigh:   '#18181B',  // Near black for high contrast text
  textMed:    '#52525B',  // Medium gray for secondary text
  textLow:    '#A1A1AA',  // Light gray for tertiary text
  border:     '#E4E4E7',  // Light gray borders
  green:      '#10B981',
  blue:       '#3B82F6',
}

const S = {
  page: {
    minHeight: '100vh',
    background: T.bg,
    fontFamily: "'Inter', sans-serif",
    color: T.textHigh,
  } as React.CSSProperties,

  nav: {
    background: T.card,
    borderBottom: `1px solid ${T.border}`,
    position: 'sticky' as const,
    top: 0,
    zIndex: 50,
  },
  navInner: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '0 24px',
    height: 72,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    textDecoration: 'none',
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: T.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: 20,
    color: '#000',
  },
  logoText: {
    color: T.textHigh,
    fontWeight: 900,
    fontSize: 20,
    letterSpacing: '1px',
  },
  logoSub: {
    color: T.primaryDk,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
  },

  main: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '48px 24px 80px',
  },

  /* ── Search ───────────────────────────────── */
  searchWrap: {
    marginBottom: 48,
  },
  searchHeader: {
    fontSize: 56,
    fontWeight: 900,
    color: T.textHigh,
    letterSpacing: '-2px',
    textTransform: 'uppercase' as const,
    lineHeight: 1.1,
    marginBottom: 8,
  },
  searchHeaderSub: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: T.textMed,
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 32,
  },
  searchBox: {
    position: 'relative' as const,
    display: 'flex',
    maxWidth: 600,
  },
  searchInput: {
    flex: 1,
    height: 64,
    border: `1px solid ${T.border}`,
    borderRadius: '12px',
    padding: '0 24px 0 60px',
    fontSize: 16,
    fontWeight: 600,
    color: T.textHigh,
    background: T.card,
    outline: 'none',
  },
  searchIcon: {
    position: 'absolute' as const,
    left: 20,
    top: '50%',
    transform: 'translateY(-50%)',
    color: T.textLow,
  },
  searchBtn: {
    position: 'absolute' as const,
    right: 8,
    top: 8,
    bottom: 8,
    padding: '0 24px',
    background: T.primary,
    border: 'none',
    borderRadius: 8,
    fontWeight: 800,
    fontSize: 13,
    color: '#000',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    transition: 'all 0.2s',
  },

  /* ── Grid Layout ──────────────────────────── */
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 420px',
    gap: 32,
    alignItems: 'start',
  } as React.CSSProperties,

  card: {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 0, // Sharper corners for aggressive look
    padding: 32,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  },

  /* ── Status Badge ─────────────────────────── */
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 100,
    background: T.cardAlt,
    border: `1px solid ${T.border}`,
    color: T.primaryDk,
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
  },

  trackingIdLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: T.textLow,
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    marginBottom: 8,
  },
  trackingIdValue: {
    fontSize: 48,
    fontWeight: 900,
    color: T.textHigh,
    letterSpacing: '-1px',
    lineHeight: 1,
    marginBottom: 40,
  },

  /* ── Progress Tracker ─────────────────────── */
  progressWrap: {
    display: 'flex',
    justifyContent: 'space-between',
    position: 'relative' as const,
    marginBottom: 48,
  },
  progressLineBg: {
    position: 'absolute' as const,
    top: 14,
    left: 20,
    right: 20,
    height: 2,
    background: T.border,
    zIndex: 0,
  },
  progressLineFill: (percent: number) => ({
    position: 'absolute' as const,
    top: 14,
    left: 20,
    height: 2,
    background: T.primary,
    width: `calc(${percent}% - 40px)`,
    transition: 'width 0.5s ease',
    zIndex: 1,
    boxShadow: `0 0 10px ${T.primary}`,
  }),
  stepItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 16,
    zIndex: 2,
    width: 80,
  },
  stepDot: (active: boolean, passed: boolean) => ({
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: passed || active ? T.primary : T.card,
    border: `2px solid ${passed || active ? T.primary : T.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: passed || active ? '#000' : T.textLow,
    boxShadow: active ? `0 0 20px ${T.primary}60` : 'none',
    transition: 'all 0.3s ease',
  }),
  stepLabel: (active: boolean, passed: boolean) => ({
    fontSize: 11,
    fontWeight: active ? 800 : 700,
    color: active ? T.textHigh : passed ? T.textMed : T.textLow,
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  }),

  /* ── Info Rows ────────────────────────────── */
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 32,
    borderTop: `1px solid ${T.border}`,
    paddingTop: 32,
  },
  infoCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: T.textLow,
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 700,
    color: T.textHigh,
  },
  infoSub: {
    fontSize: 13,
    color: T.textMed,
    fontWeight: 500,
  },

  /* ── Right Panel Cards ────────────────────── */
  sideCard: {
    background: T.card,
    border: `1px solid ${T.border}`,
    padding: 24,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  sideCardTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: T.textHigh,
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  /* ── ETA ──────────────────────────────────── */
  etaBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  etaNumber: {
    fontSize: 48,
    fontWeight: 900,
    color: T.primary,
    lineHeight: 1,
  },
  etaUnit: {
    fontSize: 14,
    fontWeight: 800,
    color: T.textHigh,
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
  },

  /* ── Vehicle Info ─────────────────────────── */
  vehicleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px',
    background: T.cardAlt,
    border: `1px solid ${T.border}`,
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    background: T.bg,
    border: `1px solid ${T.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: T.primaryDk,
  },

  /* ── Map ─────────────────────────────────── */
  mapInner: {
    width: '100%',
    height: 300,
    background: T.cardAlt,
    border: `1px solid ${T.border}`,
  },
}

/* ─── TrackingMap ──────────────────────────────────────────────── */
function TrackingMap({ vehicle: initialVehicle, destination }: { vehicle: any; destination: any }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<mapboxgl.Map | null>(null)
  const vMarker      = useRef<mapboxgl.Marker | null>(null)
  const dMarker      = useRef<mapboxgl.Marker | null>(null)
  const [liveVehicle, setLiveVehicle] = useState(initialVehicle)

  useEffect(() => {
    if (!initialVehicle?.id) return;
    const ws = telemetryWS.connect((data) => {
      if (data.type === 'TELEMETRY_UPDATE' && data.data.vehicle_id === initialVehicle.id) {
        setLiveVehicle((prev: any) => ({
          ...prev,
          lat: data.data.lat,
          lng: data.data.lng
        }))
      }
    })
    return () => { ws.close() }
  }, [initialVehicle?.id])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_mapbox_token_here') return

    mapboxgl.accessToken = MAPBOX_TOKEN
    const cx = liveVehicle?.lng || destination?.lng || 77.209
    const cy = liveVehicle?.lat || destination?.lat || 28.613

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11', // Light map style
      center: [cx, cy],
      zoom: 13,
      attributionControl: false,
    })

    map.on('load', () => {
      if (destination?.lat && destination?.lng) {
        const el = document.createElement('div')
        el.style.cssText = `
          width:24px;height:24px;border-radius:50%;
          background:#EF4444;border:2px solid #fff;
          box-shadow: 0 0 10px rgba(239,68,68,0.3);`
        dMarker.current = new mapboxgl.Marker(el)
          .setLngLat([destination.lng, destination.lat])
          .addTo(map)
      }

      if (liveVehicle?.lat && liveVehicle?.lng) {
        const el = document.createElement('div')
        el.style.cssText = `
          width:32px;height:32px;border-radius:50%;
          background:${T.primary};border:2px solid #fff;
          display:flex;align-items:center;justify-content:center;
          color:#000; box-shadow:0 0 20px ${T.primary}80;
          transition: all 1s linear;` // Smooth 1s CSS transition for marker!
        el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v5c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>'
        vMarker.current = new mapboxgl.Marker(el)
          .setLngLat([liveVehicle.lng, liveVehicle.lat])
          .addTo(map)
      }

      if (destination?.lat && destination?.lng && liveVehicle?.lat && liveVehicle?.lng) {
        const bounds = new mapboxgl.LngLatBounds()
        bounds.extend([destination.lng, destination.lat])
        bounds.extend([liveVehicle.lng, liveVehicle.lat])
        map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 1500 })
      }
    })

    mapRef.current = map
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !liveVehicle?.lat || !liveVehicle?.lng) return
    if (vMarker.current) {
      vMarker.current.setLngLat([liveVehicle.lng, liveVehicle.lat])
      // Smoothly pan map to follow vehicle if tracking is highly active
      // mapRef.current.panTo([liveVehicle.lng, liveVehicle.lat], { duration: 1000 })
    }
  }, [liveVehicle?.lat, liveVehicle?.lng])

  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_mapbox_token_here') {
    return (
      <div style={{...S.mapInner, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
         <Activity size={32} color={T.textLow} />
         <p style={{marginTop: 12, color: T.textLow, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '2px'}}>Telemetry Offline</p>
      </div>
    )
  }

  return <div ref={containerRef} style={S.mapInner} />
}

/* ─── Steps config ─────────────────────────────────────────────── */
const STEPS = [
  { key: 'created',    label: 'Booked' },
  { key: 'picked_up',  label: 'Picked Up' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered',  label: 'Delivered' },
]

/* ─── Main Page ────────────────────────────────────────────────── */
export default function CustomerTrackingPage() {
  const { trackingId } = useParams()
  const navigate = useNavigate()
  const [searchId, setSearchId] = useState(trackingId || '')

  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ['tracking', trackingId],
    queryFn: () => trackingId ? shipmentsAPI.trackPublicly(trackingId) : null,
    enabled: !!trackingId,
    refetchInterval: (query) => {
      const d = query?.state?.data as any
      return d && ['in_transit', 'picked_up'].includes(d.status) ? 5000 : false
    },
  })

  const currentStepIdx = STEPS.findIndex(s => s.key === (shipment as any)?.status)
  const progressPercent = currentStepIdx === -1 ? 0 : (currentStepIdx / (STEPS.length - 1)) * 100

  return (
    <div style={S.page}>
      {/* ── Navbar ── */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <Link to="/" style={S.logo}>
            <div style={S.logoBox}>RI</div>
            <div>
              <div style={S.logoText}>ROUTEIQ</div>
              <div style={S.logoSub}>by Prudata Logistics</div>
            </div>
          </Link>
          <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
             <Link to="/login" style={{ color: T.textMed, fontWeight: 700, fontSize: 12, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '2px' }}>
               Command Center
             </Link>
          </div>
        </div>
      </nav>

      <main style={S.main}>

        {/* ── Search ── */}
        <div style={S.searchWrap}>
          <h1 style={S.searchHeader}>
            CARGO <span style={{color: T.primaryDk}}>TRACKER</span>
          </h1>
          <div style={S.searchHeaderSub}>
             <Activity size={16} color={T.primaryDk} />
             Enterprise Multi-Agent AI Ecosystem
          </div>
          
          <form
            onSubmit={e => { e.preventDefault(); if (searchId) navigate(`/track/${searchId}`) }}
            style={S.searchBox}
          >
            <span style={S.searchIcon}><Search size={20} /></span>
            <input
              style={S.searchInput}
              type="text"
              placeholder="ENTER SHIPMENT ID..."
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
            />
            <button type="submit" style={S.searchBtn}>
              Track Cargo
            </button>
          </form>
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <div style={{ padding: '64px 0' }}>
             <div style={{color: T.primaryDk, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: 12}}>
               <Activity size={20} className="animate-pulse" />
               Locating shipment telemetry...
             </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.05)', border: '1px solid #EF4444', 
            padding: '24px', display: 'flex', alignItems: 'center', gap: 16,
            maxWidth: 600
          }}>
            <AlertCircle size={32} color="#EF4444" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '1px' }}>Signal Lost</div>
              <div style={{ color: T.textMed, fontSize: 14, marginTop: 4 }}>
                Unable to locate shipment data. Verify the ID and try again.
              </div>
            </div>
          </div>
        )}

        {/* ── Shipment Data ── */}
        {shipment && (
          <div style={S.grid}>

            {/* ── LEFT COLUMN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              
              <div style={S.card}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <div>
                    <div style={S.trackingIdLabel}>Tracking ID</div>
                    <div style={S.trackingIdValue}>{(shipment as any).tracking_id}</div>
                  </div>
                  <div style={S.statusPill}>
                    <span style={{width: 8, height: 8, borderRadius: '50%', background: T.primaryDk, boxShadow: `0 0 10px ${T.primary}`}} />
                    {(shipment as any).status.replace('_', ' ')}
                  </div>
                </div>

                {/* Progress Tracker */}
                <div style={S.progressWrap}>
                  <div style={S.progressLineBg} />
                  <div style={S.progressLineFill(progressPercent)} />
                  
                  {STEPS.map((step, idx) => {
                    const passed = idx < currentStepIdx
                    const active = idx === currentStepIdx
                    return (
                      <div key={step.key} style={S.stepItem}>
                        <div style={S.stepDot(active, passed)}>
                          {passed && <CheckCircle2 size={16} />}
                        </div>
                        <div style={S.stepLabel(active, passed)}>{step.label}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Details Grid */}
                <div style={S.infoGrid}>
                  <div style={S.infoCol}>
                    <div style={S.infoLabel}><MapPin size={14} color={T.primaryDk} /> Origin</div>
                    <div style={S.infoValue}>{(shipment as any).origin_name || 'Terminal Alpha'}</div>
                    <div style={S.infoSub}>{(shipment as any).origin_address || 'N/A'}</div>
                  </div>
                  <div style={S.infoCol}>
                    <div style={S.infoLabel}><Navigation size={14} color={T.primaryDk} /> Destination</div>
                    <div style={S.infoValue}>{(shipment as any).destination?.name || 'Customer Site'}</div>
                    <div style={S.infoSub}>{(shipment as any).destination?.address || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Cargo Specs */}
              <div style={{...S.card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24}}>
                 <div style={S.infoCol}>
                    <div style={S.infoLabel}>Weight</div>
                    <div style={S.infoValue}>{(shipment as any).total_weight_kg || 0} KG</div>
                 </div>
                 <div style={S.infoCol}>
                    <div style={S.infoLabel}>Items</div>
                    <div style={S.infoValue}>{(shipment as any).total_items || 0}</div>
                 </div>
                 <div style={S.infoCol}>
                    <div style={S.infoLabel}>Priority</div>
                    <div style={{...S.infoValue, color: T.primaryDk}}>{(shipment as any).priority?.toUpperCase() || 'STD'}</div>
                 </div>
              </div>

            </div>

            {/* ── RIGHT COLUMN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
               
               {/* ETA */}
               <div style={S.sideCard}>
                 <div style={S.sideCardTitle}>
                   <span>Estimated Arrival</span>
                   <Clock size={16} color={T.primaryDk} />
                 </div>
                 <div style={S.etaBox}>
                   <div style={S.etaNumber}>
                     {(shipment as any).eta_minutes ? Math.round((shipment as any).eta_minutes) : '--'}
                   </div>
                   <div style={S.etaUnit}>
                     <div style={{color: T.textHigh}}>Minutes</div>
                     <div style={{color: T.textLow, fontSize: 11, marginTop: 4}}>Calculated by AI</div>
                   </div>
                 </div>
               </div>

               {/* Map */}
               <div style={{...S.sideCard, padding: 0}}>
                 <TrackingMap vehicle={(shipment as any).vehicle} destination={(shipment as any).destination} />
                 <div style={{padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.cardAlt}}>
                   <div style={{fontSize: 11, fontWeight: 800, color: T.primaryDk, textTransform: 'uppercase', letterSpacing: '2px'}}>Live Telemetry Pipe</div>
                   <div style={{fontSize: 11, color: T.textMed}}>GPS Sync: Active</div>
                 </div>
               </div>

               {/* Vehicle Info */}
               <div style={S.sideCard}>
                 <div style={S.sideCardTitle}>Carrier Details</div>
                 <div style={S.vehicleRow}>
                   <div style={S.vehicleIcon}>
                     <Truck size={24} />
                   </div>
                   <div>
                     <div style={{fontSize: 18, fontWeight: 800, color: T.textHigh}}>
                       {(shipment as any).vehicle?.plate_number || 'Awaiting Assignment'}
                     </div>
                     <div style={{fontSize: 12, color: T.textMed, marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px'}}>
                       {(shipment as any).vehicle?.type || 'Vehicle'} • {(shipment as any).vehicle?.status?.replace('_', ' ') || 'Standby'}
                     </div>
                   </div>
                 </div>
               </div>

            </div>
          </div>
        )}

      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      `}</style>
    </div>
  )
}
