import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Info, Eye, EyeOff, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { connectorsApi, probeApi, type ConnectorType, type AuthType } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { ConnectorIcon } from '@/components/connectors/ConnectorIcon'
import { toast } from '@/hooks/use-toast'

function CredentialFields({ authType, onChange }: {
  authType: AuthType
  onChange: (field: string, value: string) => void
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  if (authType === 'none') return null

  return (
    <div className="space-y-3">
      {authType === 'basic' && (
        <>
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input placeholder="admin" onChange={(e) => onChange('username', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                onChange={(e) => onChange('password', e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      )}

      {authType === 'apikey' && (
        <>
          <div className="space-y-1.5">
            <Label>Username (optional)</Label>
            <Input placeholder="apitoken" onChange={(e) => onChange('username', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>API Key / Token</Label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder="your-api-key"
                onChange={(e) => onChange('apiKey', e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>API Key Header (optional)</Label>
            <Input
              placeholder="X-API-Key"
              onChange={(e) => onChange('apiKeyHeader', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Default: X-API-Key</p>
          </div>
        </>
      )}

      {authType === 'bearer' && (
        <div className="space-y-1.5">
          <Label>Bearer Token</Label>
          <div className="relative">
            <Input
              type={showApiKey ? 'text' : 'password'}
              placeholder="eyJ..."
              onChange={(e) => onChange('token', e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
{authType === 'passhash' && (
  <>
    <div className="space-y-1.5">
      <Label>Username</Label>
      <Input
        placeholder="admin"
        onChange={(e) => onChange('username', e.target.value)}
      />
    </div>
    <div className="space-y-1.5">
      <Label>Passhash</Label>
      <div className="relative">
        <Input
          type={showApiKey ? 'text' : 'password'}
          placeholder="1234567890"
          onChange={(e) => onChange('passhash', e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setShowApiKey(!showApiKey)}
        >
          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Obtén tu passhash en PRTG → Setup → My Account
      </p>
    </div>
  </>
)}

    </div>

    
  )
}

export function AddConnectorPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedType, setSelectedType] = useState<ConnectorType | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    base_url: '',
    auth_type: 'basic' as AuthType,
    verify_ssl: true,
    timeout: 10000,
  })
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [probeResult, setProbeResult] = useState<{ online: boolean; capabilities: string[]; error?: string } | null>(null)

  const { data: types = [] } = useQuery({
    queryKey: ['connector-types'],
    queryFn: connectorsApi.types,
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form & { credentials: Record<string, string>; type: string }) =>
      connectorsApi.create(data),
    onSuccess: (connector) => {
      queryClient.invalidateQueries({ queryKey: ['connectors'] })
      toast({ title: 'Connector created!', description: `${connector.name} has been added.` })
      // Auto-probe the new connector
      probeApi.probe(connector.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['connectors'] })
      })
      navigate('/connectors')
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create connector', description: err.message, variant: 'destructive' })
    },
  })

  const probeMutation = useMutation({
    mutationFn: async () => {
      // Create temp connector to test
      const connector = await connectorsApi.create({
        ...form,
        type: selectedType?.type || 'generic',
        credentials,
      })
      try {
        const result = await probeApi.probe(connector.id)
        setProbeResult(result)
        return { connector, result }
      } finally {
        // Clean up temp connector if probe fails
        if (!probeResult?.online) {
          // Keep it - user will decide
        }
      }
    },
    onError: (err: Error) => {
      toast({ title: 'Test failed', description: err.message, variant: 'destructive' })
    },
  })

  const handleSelectType = (type: ConnectorType) => {
    setSelectedType(type)
    setForm(prev => ({
      ...prev,
      auth_type: type.authTypes[0] as AuthType,
      base_url: prev.base_url || `https://`,
    }))
  }

  const handleCredentialChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType) {
      toast({ title: 'Please select a connector type', variant: 'destructive' })
      return
    }
    createMutation.mutate({
      ...form,
      type: selectedType.type,
      credentials,
    })
  }

  const categories = [...new Set(types.map(t => t.category))]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/connectors">
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold">Add New Connector</h2>
          <p className="text-sm text-muted-foreground">Connect a new tool to Nautilus Hub</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Choose Integration Type</CardTitle>
            <CardDescription>Select the tool you want to connect</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map(category => (
                <div key={category}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 capitalize">
                    {category}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {types.filter(t => t.category === category).map(type => (
                      <button
                        key={type.type}
                        type="button"
                        onClick={() => handleSelectType(type)}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          selectedType?.type === type.type
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40 hover:bg-secondary/50'
                        }`}
                      >
                        <ConnectorIcon icon={type.icon} category={type.category} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{type.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{type.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Configure */}
        {selectedType && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Configure Connection</CardTitle>
              <CardDescription>
                Enter the connection details for {selectedType.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Connector Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder={`My ${selectedType.label}`}
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input
                    placeholder="Optional description"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Base URL <span className="text-destructive">*</span></Label>
                <Input
                  placeholder={`https://prtg.company.com`}
                  value={form.base_url}
                  onChange={(e) => setForm(prev => ({ ...prev, base_url: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Include protocol (https://) and port if needed (default: {selectedType.defaultPort})
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Authentication Type</Label>
                  <Select
                    value={form.auth_type}
                    onValueChange={(v) => setForm(prev => ({ ...prev, auth_type: v as AuthType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                   <SelectContent>
                      {selectedType.authTypes.map(authType => (
                    <SelectItem key={authType} value={authType}>
                      {authType === 'basic' ? 'Basic Auth (username/password)' :
                      authType === 'apikey' ? 'API Key / Token' :
                      authType === 'bearer' ? 'Bearer Token' : 
                      authType === 'passhash' ? 'PRTG (username/passhash)' : // <--- AGREGA ESTA LÍNEA
                      'None'}
                    </SelectItem>
                  ))}
                </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={form.timeout}
                    onChange={(e) => setForm(prev => ({ ...prev, timeout: parseInt(e.target.value) || 10000 }))}
                    min={1000}
                    max={60000}
                  />
                </div>
              </div>

              {/* Credentials */}
              <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Credentials</p>
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Encrypted and stored securely</p>
                </div>
                <CredentialFields authType={form.auth_type} onChange={handleCredentialChange} />
              </div>

              {/* SSL */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="verify_ssl"
                  checked={form.verify_ssl}
                  onChange={(e) => setForm(prev => ({ ...prev, verify_ssl: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <Label htmlFor="verify_ssl" className="font-normal cursor-pointer">
                  Verify SSL certificate
                </Label>
              </div>

              {/* Probe result */}
              {probeResult && (
                <div className={`p-3 rounded-lg border text-sm ${
                  probeResult.online
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border-red-500/20 bg-red-500/10 text-red-400'
                }`}>
                  {probeResult.online ? (
                    <p>✓ Connected! Detected capabilities: {probeResult.capabilities.join(', ')}</p>
                  ) : (
                    <p>✗ Connection failed: {probeResult.error}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {selectedType && (
          <div className="flex items-center gap-3 justify-end">
            <Link to="/connectors">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending ? (
                <>Creating...</>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Connector
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
