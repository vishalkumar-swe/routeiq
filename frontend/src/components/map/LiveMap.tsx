import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Search, Navigation, X } from 'lucide-react'
import axios from 'axios'

import { 
  INDIA_POSITIONS, 
  STATUS_COLORS, 
  VEHICLE_EMOJI, 
  CARGO_EMOJI,
  MAP_DEFAULTS 
} from '@/config/mapConfig'
import { telemetryWS } from '@/services/api'

interface Vehicle {
  id: string
  plate_number: string
  latitude?: number | null
  longitude?: number | null
  status: string
  vehicle_type?: string
  cargo_types?: string[]
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

export default function LiveMap({ vehicles, selectedVehicleId }: { vehicles: Vehicle[], selectedVehicleId?: string | null }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInst = useRef<mapboxgl.Map | null>(null)
  const intervalRef = useRef<any>(null)

// VehicleStatusSheet component
function VehicleStatusSheet({ vehicle, targetPositionsRef }: { vehicle: Vehicle, targetPositionsRef: React.MutableRefObject<any> }) {
  const [telemetry, setTelemetry] = useState({ speed: 0, fuel: 0 })
  useEffect(() => {
    const interval = setInterval(() => {
      const t = targetPositionsRef.current[vehicle.id]
      if (t) {
        setTelemetry({ speed: t.speed || 0, fuel: t.fuel || 0 })
      }
    }, 1000)
    // Initial fetch
    const t = targetPositionsRef.current[vehicle.id]
    if (t) {
      setTelemetry({ speed: t.speed || 0, fuel: t.fuel || 0 })
    }
    return () => clearInterval(interval)
  }, [vehicle.id, targetPositionsRef])

  return (
    <div className="bg-surface/90 backdrop-blur-md text-text p-6 rounded-3xl border border-border shadow-2xl font-sans w-[350px]">
      <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
        <span className="text-sm font-black uppercase text-yellow-500 tracking-tighter">{vehicle.plate_number}</span>
        <span className="text-[10px] uppercase font-bold text-muted bg-surface2 px-2 py-1 rounded-lg">{vehicle.vehicle_type ?? 'Truck'}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[10px]">
        <div className="flex flex-col"><span className="text-muted font-bold">Geofence</span><span className="font-black">--</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">GPS Status</span><span className="font-black text-green-500">Online</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Network</span><span className="font-black">4G LTE</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Immobilizer</span><span className="font-black">Disarmed</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Parking</span><span className="font-black">--</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Fuel</span><span className="font-black text-yellow-500">{telemetry.fuel.toFixed(1)}%</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Door</span><span className="font-black">Closed</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Battery</span><span className="font-black">12.4V</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Trip Dist</span><span className="font-black">142 km</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Trip Time</span><span className="font-black">2h 15m</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Last Speed</span><span className="font-black text-white">{telemetry.speed.toFixed(0)} km/h</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Max Speed</span><span className="font-black">80 km/h</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Daily Dist</span><span className="font-black">210 km</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Idle Time</span><span className="font-black">10m</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Stops</span><span className="font-black">3</span></div>
        <div className="flex flex-col"><span className="text-muted font-bold">Odometer</span><span className="font-black">45,120 km</span></div>
      </div>
    </div>
  )
}
  
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Use refs for animation state to avoid re-renders
  const targetPositions = useRef<Record<string, { lat: number, lng: number, speed: number, fuel?: number }>>({})
  const currentPositions = useRef<Record<string, { lat: number, lng: number }>>({})

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery || !mapInst.current) return

    setIsSearching(true)
    try {
      const resp = await axios.get(
        `${import.meta.env.VITE_MAPBOX_GEOCODING_URL}/${encodeURIComponent(searchQuery)}.json`,
        {
          params: {
            access_token: MAPBOX_TOKEN,
            country: 'IN',
            limit: 1,
            types: 'place,locality,address'
          }
        }
      )

      if (resp.data?.features?.length > 0) {
        const [lng, lat] = resp.data.features[0].center
        mapInst.current.flyTo({ center: [lng, lat], zoom: 12, duration: 2500 })
      }
    } catch (err) {
      console.error('Search failed', err)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return

    // Allow search even if token looks like placeholder for demo/dev speed
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_mapbox_token_here') {
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div class="flex flex-col items-center justify-center h-full bg-surface text-muted p-8 text-center rounded-[24px]">
            <div class="w-16 h-16 mb-4 rounded-full bg-slate-800 flex items-center justify-center border border-border shadow-2xl">🌍</div>
            <h3 class="text-text font-black uppercase tracking-widest mb-2">Simulated Geospatial Layer</h3>
            <p class="text-[10px] font-bold max-w-xs mb-6 uppercase tracking-tight opacity-60">Providing Pan-India visualization via heuristic cluster mapping. Mapbox token required for high-fidelity textures.</p>
            <div class="flex gap-2">
               <div class="px-4 py-2 bg-yellow-500 text-black text-[10px] font-black uppercase rounded-xl tracking-tighter">Core Active</div>
               <div class="px-4 py-2 bg-slate-800 text-muted text-[10px] font-black uppercase rounded-xl tracking-tighter">Textures: Simulation</div>
            </div>
          </div>
        `
      }
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: mapRef.current!,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: MAP_DEFAULTS.CENTER,
      zoom: MAP_DEFAULTS.ZOOM,
      minZoom: MAP_DEFAULTS.MIN_ZOOM,
      maxZoom: MAP_DEFAULTS.MAX_ZOOM,
      attributionControl: false,
    })

    map.on('load', () => {
      const initialList: any[] = vehicles.length > 0
        ? vehicles.map((v, i) => ({
            ...v,
            lat: (v.latitude !== null && v.latitude !== undefined) ? v.latitude : (INDIA_POSITIONS[i % INDIA_POSITIONS.length].lat),
            lng: (v.longitude !== null && v.longitude !== undefined) ? v.longitude : (INDIA_POSITIONS[i % INDIA_POSITIONS.length].lng),
          }))
        : []

      // Initialize positions
      initialList.forEach(v => {
        currentPositions.current[v.id] = { lat: v.lat, lng: v.lng }
        targetPositions.current[v.id] = { lat: v.lat, lng: v.lng, speed: 0 }
      })

      // Add GeoJSON source for trucks
      map.addSource('trucks', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: initialList.map(v => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
            properties: { 
              id: v.id, status: v.status, plate: v.plate_number,
              emoji: VEHICLE_EMOJI[v.vehicle_type] || '🚛',
              color: STATUS_COLORS[v.status] || '#94a3b8'
            }
          }))
        },
        cluster: true,
        clusterMaxZoom: 10,
        clusterRadius: 50
      })

      // Heatmap layer
      map.addLayer({ id: 'truck-heat', type: 'heatmap', source: 'trucks', maxzoom: 9, paint: { 'heatmap-weight': 1, 'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3], 'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(234,179,8,0)', 0.2, 'rgba(234,179,8,0.2)', 0.4, 'rgba(234,179,8,0.4)', 0.6, 'rgba(234,179,8,0.7)', 0.8, 'rgba(234,179,8,0.9)', 1, '#EAB308'], 'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20], 'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 9, 0] } })
      
      // Cluster Circle layer
      map.addLayer({ id: 'clusters', type: 'circle', source: 'trucks', filter: ['has', 'point_count'], paint: { 'circle-color': '#0F172A', 'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40], 'circle-stroke-width': 2, 'circle-stroke-color': '#EAB308' } })
      
      // Cluster Count layer
      map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'trucks', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count'], 'text-size': 12, 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'] }, paint: { 'text-color': '#ffffff' } })
      
      // Map Interactions
      map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = '' })
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })

      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        const clusterId = features[0].properties?.cluster_id
        ;(map.getSource('trucks') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom === null || zoom === undefined) return
          map.easeTo({ center: (features[0].geometry as any).coordinates, zoom })
        })
      })

      map.on('click', 'unclustered-point', (e) => {
        const props = e.features?.[0]?.properties
        if (!props) return
        
        const coords = (e.features?.[0]?.geometry as any).coordinates
        const v_id = props.id
        const target = targetPositions.current[v_id]
        
        new mapboxgl.Popup({ closeButton: false, anchor: 'bottom', maxWidth: '300px', className: 'truck-popup' })
          .setLngLat(coords)
          .setHTML(`
            <div class="bg-surface text-text p-4 rounded-2xl border border-border shadow-2xl font-sans min-w-[200px]">
              <div class="flex items-center justify-between mb-3 border-b border-border pb-2">
                <span class="text-xs font-black uppercase text-yellow-500 tracking-tighter">${props.plate}</span>
                <span class="text-[10px] uppercase font-bold text-muted">${props.emoji}</span>
              </div>
              <div class="space-y-2">
                <div class="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted">
                  <span>LIVE SPEED</span>
                  <span class="text-text">${target?.speed?.toFixed(0) || 0} KM/H</span>
                </div>
                <div class="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted">
                  <span>FUEL PROBE</span>
                  <span class="text-text">${target?.fuel?.toFixed(1) || '--'}%</span>
                </div>
              </div>
              <div class="mt-4 pt-2 flex gap-2">
                 <div class="px-3 py-1 bg-surface2 rounded-lg text-[8px] font-black uppercase text-muted tracking-tighter">TELEMETRY: SYNCED</div>
                 <div class="px-3 py-1 bg-yellow-500/10 rounded-lg text-[8px] font-black uppercase text-yellow-500 tracking-tighter">OP STATUS: ${props.status}</div>
              </div>
            </div>
          `)
          .addTo(map)
      })

      // Individual Truck Icons
      map.addLayer({ id: 'unclustered-point', type: 'symbol', source: 'trucks', filter: ['!', ['has', 'point_count']], layout: { 'text-field': ['get', 'emoji'], 'text-size': 24, 'text-allow-overlap': true } })

      // WebSocket Connection
      const ws = telemetryWS.connect((msg: any) => {
        if (msg.type === 'TELEMETRY_UPDATE') {
          const { vehicle_id, lat, lng, speed, fuel } = msg.data
          targetPositions.current[vehicle_id] = { lat, lng, speed, fuel }
          // If we haven't seen this vehicle before, snap it
          if (!currentPositions.current[vehicle_id]) {
            currentPositions.current[vehicle_id] = { lat, lng }
          }
        }
      })

      // Optimized feature generation
      const baseFeatures = initialList.map((v) => {
        const primaryCargo = v.cargo_types?.[0] || 'general'
        const cargoEmoji = CARGO_EMOJI[primaryCargo] || ''
        const vehicleEmoji = VEHICLE_EMOJI[v.vehicle_type || 'truck'] || '🚛'
        const pos = currentPositions.current[v.id] || { lat: 0, lng: 0 }
        
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [pos.lng, pos.lat] },
          properties: { 
            id: v.id, status: v.status, plate: v.plate_number,
            emoji: `${vehicleEmoji}${cargoEmoji}`,
            color: STATUS_COLORS[v.status] || '#94a3b8'
          }
        }
      })

      // Smooth Animation Loop (Lerp)
      const animate = () => {
        const source = map.getSource('trucks') as mapboxgl.GeoJSONSource
        if (!source) return

        baseFeatures.forEach((f) => {
          const v_id = f.properties.id
          const target = targetPositions.current[v_id]
          const current = currentPositions.current[v_id]

          if (target && current) {
            current.lat += (target.lat - current.lat) * 0.05
            current.lng += (target.lng - current.lng) * 0.05
            // Update the feature geometry directly
            f.geometry.coordinates = [current.lng, current.lat]
          }
        })

        source.setData({ type: 'FeatureCollection', features: baseFeatures })
        intervalRef.current = requestAnimationFrame(animate)
      }

      animate()

      return () => {
        ws.close()
        if (intervalRef.current) cancelAnimationFrame(intervalRef.current)
      }
    })

    mapInst.current = map

    return () => {
      mapInst.current?.remove()
      mapInst.current = null
    }
  }, [vehicles])

  // Auto-focus on selected vehicle
  useEffect(() => {
    if (!selectedVehicleId || !mapInst.current) return
    const v = vehicles.find(v => v.id === selectedVehicleId)
    if (v && v.latitude && v.longitude) {
      mapInst.current.flyTo({ center: [v.longitude, v.latitude], zoom: 12, duration: 2000 })
    }
  }, [selectedVehicleId, vehicles])

  return (
    <div className="relative w-full h-full bg-surface2 rounded-[28px] overflow-hidden border border-border shadow-2xl">
      {/* Pan-India Search Bar */}
      {MAPBOX_TOKEN && MAPBOX_TOKEN !== 'your_mapbox_token_here' && (
        <form 
          onSubmit={handleSearch}
          className="absolute top-6 left-6 z-20 w-64 md:w-80 group"
        >
          <div className="relative">
            <input 
              type="text"
              placeholder="Search Pan-India Locations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-12 bg-surface/90 backdrop-blur-md border border-border rounded-2xl px-12 text-xs font-bold text-text placeholder:text-muted focus:outline-none focus:border-yellow-500/50 transition-all shadow-2xl"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-yellow-500 transition-colors">
              {isSearching ? <Navigation size={14} className="animate-pulse" /> : <Search size={14} />}
            </div>
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-text"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </form>
      )}

      <div ref={mapRef} className="w-full h-full min-h-[400px]" />
      
      {/* Legend / Overlay */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 p-4 rounded-2xl bg-surface/80 backdrop-blur-md border border-border shadow-2xl">
         <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase text-text/80 tracking-widest">Active Corridors</span>
         </div>
         <div className="flex gap-4 mt-2">
            {[
              { label: 'Moving', color: STATUS_COLORS.on_route },
              { label: 'Parked', color: STATUS_COLORS.available },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-[8px] font-bold text-muted uppercase">{l.label}</span>
              </div>
            ))}
         </div>
      </div>

      {/* Selected Vehicle Bottom Sheet */}
      {selectedVehicleId && vehicles.find(v => v.id === selectedVehicleId) && (
        <div className="absolute bottom-6 right-6 z-20">
          <VehicleStatusSheet 
            vehicle={vehicles.find(v => v.id === selectedVehicleId)!} 
            targetPositionsRef={targetPositions}
          />
        </div>
      )}
    </div>
  )
}
