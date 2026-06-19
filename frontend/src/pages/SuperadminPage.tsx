import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Search, User } from 'lucide-react'
import { usersAPI, analyticsAPI } from '@/services/api'
import { Card, Badge, Button, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const ROLE_OPTIONS = ['admin', 'manager', 'driver', 'superadmin']

export default function SuperadminPage() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users')
  const queryClient = useQueryClient()

  const { data: users = [] as any[], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: usersAPI.list,
  })

  const { data: auditLogs = [] as any[], isLoading: auditLoading } = useQuery<any[]>({
    queryKey: ['audit-logs'],
    queryFn: () => analyticsAPI.auditLogs(),
    enabled: activeTab === 'audit'
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated successfully')
    },
  })

  const filtered = users.filter((u: any) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const handleRoleChange = (userId: string, newRole: string) => {
    updateMutation.mutate({ id: userId, data: { role: newRole } })
  }

  const toggleActive = (userId: string, currentStatus: boolean) => {
    updateMutation.mutate({ id: userId, data: { is_active: !currentStatus } })
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="font-heading font-bold text-3xl text-text tracking-tight">Platform Administration</h1>
          <p className="text-muted text-sm flex items-center gap-2">
            <Shield size={14} className="text-purple-500" />
            Manage system users, access levels, and security policies
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-px">
        {['users', 'audit'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t as any)}
            className={clsx(
              "px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
              activeTab === t ? "text-primary bg-primary/5" : "text-muted hover:text-text"
            )}
          >
            {t}
            {activeTab === t && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(79,172,254,0.6)]" />
            )}
          </button>
        ))}
      </div>

      {/* Filters + Search */}
      {activeTab === 'users' && (
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2 bg-surface2 border border-border rounded-xl px-4 py-2 w-full max-w-sm focus-within:border-primary/30 transition-colors">
            <Search size={16} className="text-muted" />
            <input
              placeholder="Search users by email or name..."
              className="bg-transparent border-none outline-none text-sm text-text w-full placeholder:text-muted"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Content Table */}
      <Card className="border-border shadow-2xl relative overflow-hidden">
        {activeTab === 'users' ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {['User', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <Spinner size={32} />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-muted text-xs">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filtered.map((u: any) => (
                    <tr key={u.id} className="border-b border-border hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-muted border border-border">
                            <User size={14} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-text">{u.full_name}</div>
                            <div className="text-[10px] text-muted mono">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-text outline-none focus:border-primary/50"
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={updateMutation.isPending}
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={r} value={r}>{r.toUpperCase()}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={u.is_active ? 'green' : 'orange'}>
                          {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-[10px] text-muted mono">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          variant={u.is_active ? 'ghost' : 'accent'}
                          className="text-[10px]"
                          onClick={() => toggleActive(u.id, u.is_active)}
                          disabled={updateMutation.isPending}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  {['Timestamp', 'Agent', 'Task', 'Status', 'Result'].map(h => (
                    <th key={h} className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr><td colSpan={5} className="py-20 text-center"><Spinner size={32} /></td></tr>
                ) : auditLogs.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-muted text-xs">No audit logs recorded</td></tr>
                ) : (
                  auditLogs.map((log: any) => (
                    <tr key={log.id} className="border-b border-border hover:bg-white/[0.02] transition-colors text-xs font-bold">
                      <td className="px-6 py-4 text-muted mono text-[10px]">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 text-primary uppercase tracking-tight">{log.agent}</td>
                      <td className="px-6 py-4 text-text max-w-xs truncate">{log.task}</td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                          log.status === 'success' ? "bg-success/10 text-success border-success/20" : "bg-error/10 text-error border-error/20"
                        )}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted font-medium truncate max-w-xs">{log.result}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
