import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0B1419',
            color: '#E8F4F0',
            border: '1px solid #1A2D38',
            borderRadius: '8px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#00E5A0', secondary: '#050A0E' } },
          error: { iconTheme: { primary: '#FF6B35', secondary: '#050A0E' } },
        }}
      />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
)
