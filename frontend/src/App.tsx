import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppLayout from '@/components/ui/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import FleetPage from '@/pages/FleetPage'
import RoutesPage from '@/pages/RoutesPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import OptimizePage from '@/pages/OptimizePage'
import SuperadminPage from '@/pages/SuperadminPage'
import AIHubPage from '@/pages/AIHubPage'
import CargoNetworkPage from '@/pages/CargoNetworkPage'
import ShipmentsPage from '@/pages/ShipmentsPage'
import DriverPage from '@/pages/DriverPage'
import CustomerTrackingPage from '@/pages/CustomerTrackingPage'
import LiveBiddingPage from '@/pages/LiveBiddingPage'
import LiveMapPage from '@/pages/LiveMapPage'

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const token = useAuthStore(s => s.token)
  const role = useAuthStore(s => s.role)
  
  if (!token) return <Navigate to="/login" replace />
  
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === 'driver') return <Navigate to="/driver" replace />
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/track" element={<CustomerTrackingPage />} />
        <Route path="/track/:trackingId" element={<CustomerTrackingPage />} />
        <Route path="/driver" element={
          <PrivateRoute allowedRoles={['superadmin', 'admin', 'driver']}>
            <DriverPage />
          </PrivateRoute>
        } />
        <Route path="/driver/dashboard" element={
          <PrivateRoute allowedRoles={['superadmin', 'admin', 'driver']}>
            <DriverPage />
          </PrivateRoute>
        } />
        <Route path="/" element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={
            <PrivateRoute allowedRoles={['superadmin', 'admin']}>
              <DashboardPage />
            </PrivateRoute>
          } />
          <Route path="shipments" element={
            <PrivateRoute allowedRoles={['superadmin', 'admin']}>
              <ShipmentsPage />
            </PrivateRoute>
          } />
          <Route path="fleet" element={
            <PrivateRoute allowedRoles={['superadmin', 'admin']}>
              <FleetPage />
            </PrivateRoute>
          } />
          <Route path="routes" element={
            <PrivateRoute allowedRoles={['superadmin', 'admin']}>
              <RoutesPage />
            </PrivateRoute>
          } />
          <Route path="optimize" element={
            <PrivateRoute allowedRoles={['superadmin', 'admin']}>
              <OptimizePage />
            </PrivateRoute>
          } />
          <Route path="analytics" element={
            <PrivateRoute allowedRoles={['superadmin', 'admin']}>
              <AnalyticsPage />
            </PrivateRoute>
          } />
          <Route path="superadmin" element={
            <PrivateRoute allowedRoles={['superadmin']}>
              <SuperadminPage />
            </PrivateRoute>
          } />
          <Route path="ai-hub" element={
            <PrivateRoute allowedRoles={['superadmin', 'admin']}>
              <AIHubPage />
            </PrivateRoute>
          } />
          <Route path="cargo-network" element={
            <PrivateRoute allowedRoles={['superadmin', 'admin']}>
              <CargoNetworkPage />
            </PrivateRoute>
          } />
          <Route path="bidding" element={
            <PrivateRoute allowedRoles={['superadmin', 'admin']}>
              <LiveBiddingPage />
            </PrivateRoute>
          } />
        </Route>
          <Route path="live-map" element={<PrivateRoute allowedRoles={['superadmin', 'admin']}><LiveMapPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
