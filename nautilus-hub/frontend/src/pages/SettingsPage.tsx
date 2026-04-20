import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Save, Info } from 'lucide-react'
import { settingsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

export function SettingsPage() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll,
  })

  const [form, setForm] = useState({
    company_name: '',
    probe_interval_minutes: '15',
    log_retention_days: '30',
    theme: 'dark',
  })

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || '',
        probe_interval_minutes: settings.probe_interval_minutes || '15',
        log_retention_days: settings.log_retention_days || '30',
        theme: settings.theme || 'dark',
      })
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.update(form),
    onSuccess: () => {
      toast({ title: 'Settings saved', variant: 'default' })
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to save settings', description: err.message, variant: 'destructive' })
    },
  })

  if (isLoading) {
    return <div className="h-64 rounded-xl bg-card border animate-pulse" />
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">Configure Nautilus Hub preferences</p>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Basic configuration for your Nautilus Hub instance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input
              value={form.company_name}
              onChange={(e) => setForm(prev => ({ ...prev, company_name: e.target.value }))}
              placeholder="Rolosa"
            />
          </div>
        </CardContent>
      </Card>

      {/* Probing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connectivity Probing</CardTitle>
          <CardDescription>Control how often connectors are automatically probed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Auto-probe Interval (minutes)</Label>
            <Input
              type="number"
              value={form.probe_interval_minutes}
              onChange={(e) => setForm(prev => ({ ...prev, probe_interval_minutes: e.target.value }))}
              min={1}
              max={1440}
            />
            <p className="text-xs text-muted-foreground">
              How often to automatically check connector status. Set to 0 to disable.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Retention</CardTitle>
          <CardDescription>Control how long activity logs are kept</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Log Retention (days)</Label>
            <Input
              type="number"
              value={form.log_retention_days}
              onChange={(e) => setForm(prev => ({ ...prev, log_retention_days: e.target.value }))}
              min={1}
              max={365}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">About Nautilus Hub</p>
              <p>Version 1.0.0 — Developed by Rolosa for internal use and client deployments.</p>
              <p className="mt-1">Credentials are encrypted using AES-256-GCM with PBKDF2 key derivation and are never exposed to the frontend.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
