'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  DashboardShell,
  DashboardHeader,
  Card,
  CardContent,
  CardHeader,
  Button,
  Input,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@fabrk/components'
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'
import {
  GitBranch,
  ShieldAlert,
  GitPullRequest,
  Settings,
  LayoutDashboard,
  TrendingUp,
  Bell,
  KeyRound,
  Users,
  Webhook,
  Trash2,
  Plus,
  Check,
  Copy,
} from 'lucide-react'

const sidebarItems = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="size-4" />, href: '/dashboard' },
  { id: 'repos', label: 'Repositories', icon: <GitBranch className="size-4" />, href: '/dashboard', badge: 8 },
  { id: 'security', label: 'Security', icon: <ShieldAlert className="size-4" />, href: '/dashboard', badge: 3 },
  { id: 'prs', label: 'Pull Requests', icon: <GitPullRequest className="size-4" />, href: '/dashboard' },
  { id: 'trends', label: 'Trends', icon: <TrendingUp className="size-4" />, href: '/dashboard' },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="size-4" />,
    href: '/dashboard/settings',
    active: true,
  },
]

const teamMembers = [
  { name: 'Alex Rivera', email: 'alex@acmecorp.io', role: 'Owner', avatar: 'A', lastActive: 'Just now' },
  { name: 'Jamie Lee', email: 'jamie@acmecorp.io', role: 'Admin', avatar: 'J', lastActive: '2 hours ago' },
  { name: 'Sam Patel', email: 'sam@acmecorp.io', role: 'Member', avatar: 'S', lastActive: 'Yesterday' },
  { name: 'Dana Kim', email: 'dana@acmecorp.io', role: 'Member', avatar: 'D', lastActive: '3 days ago' },
]

const apiKeys = [
  { name: 'CI / GitHub Actions', prefix: 'cs_live_xxxx...4a8f', created: 'Jan 12, 2026', lastUsed: '3 min ago' },
  { name: 'Local dev — Alex', prefix: 'cs_live_xxxx...9c2b', created: 'Dec 3, 2025', lastUsed: '1 day ago' },
]

export default function SettingsPage() {
  const [slackEnabled, setSlackEnabled] = useState(true)
  const [emailDigest, setEmailDigest] = useState(true)
  const [prComments, setPrComments] = useState(true)
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback for non-HTTPS environments
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(text)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      title="CodeScan"
      logo={
        <div className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground text-[10px] font-bold">
          CS
        </div>
      }
      user={{ name: 'Alex Rivera', tier: 'pro' }}
      onSignOut={() => {}}
      linkComponent={Link}
    >
      <DashboardHeader
        title="SETTINGS"
        subtitle="Manage your workspace, notifications, team, and API access"
      />

      <div className="p-4">
        <Tabs defaultValue="workspace">
          <TabsList>
            <TabsTrigger value="workspace">WORKSPACE</TabsTrigger>
            <TabsTrigger value="notifications">NOTIFICATIONS</TabsTrigger>
            <TabsTrigger value="team">TEAM</TabsTrigger>
            <TabsTrigger value="api">API KEYS</TabsTrigger>
          </TabsList>

          {/* WORKSPACE */}
          <TabsContent value="workspace">
            <div className="space-y-4 mt-2">
              {/* Profile */}
              <Card size="auto">
                <CardHeader title="WORKSPACE PROFILE" icon={<Settings className="size-3.5 text-muted-foreground" />} />
                <CardContent padding="md">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className={cn('text-xs font-medium', mode.font)}>WORKSPACE NAME</label>
                      <Input defaultValue="Acme Engineering" />
                    </div>
                    <div className="space-y-1.5">
                      <label className={cn('text-xs font-medium', mode.font)}>SLUG</label>
                      <Input defaultValue="acme-engineering" />
                      <p className="text-xs text-muted-foreground">
                        codescan.io/<strong>acme-engineering</strong>
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className={cn('text-xs font-medium', mode.font)}>DEFAULT BRANCH</label>
                      <Select defaultValue="main">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="main">main</SelectItem>
                          <SelectItem value="master">master</SelectItem>
                          <SelectItem value="develop">develop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className={cn('text-xs font-medium', mode.font)}>SCAN FREQUENCY</label>
                      <Select defaultValue="on-push">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on-push">On every push</SelectItem>
                          <SelectItem value="on-pr">On PR open/update</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button size="sm" className="mt-6">&gt; SAVE CHANGES</Button>
                </CardContent>
              </Card>

              {/* Scan thresholds */}
              <Card size="auto">
                <CardHeader title="QUALITY GATE THRESHOLDS" icon={<ShieldAlert className="size-3.5 text-muted-foreground" />} />
                <CardContent padding="md">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className={cn('text-xs font-medium', mode.font)}>MIN COVERAGE %</label>
                      <Input type="number" defaultValue="75" min="0" max="100" />
                    </div>
                    <div className="space-y-1.5">
                      <label className={cn('text-xs font-medium', mode.font)}>MAX COMPLEXITY SCORE</label>
                      <Input type="number" defaultValue="20" min="1" max="100" />
                    </div>
                    <div className="space-y-1.5">
                      <label className={cn('text-xs font-medium', mode.font)}>FAIL ON CRITICAL</label>
                      <Select defaultValue="yes">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes — block merge</SelectItem>
                          <SelectItem value="warn">Warn only</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button size="sm" className="mt-6">&gt; UPDATE THRESHOLDS</Button>
                </CardContent>
              </Card>

              {/* Danger zone */}
              <Card size="auto" className="border-destructive/30">
                <CardHeader title="DANGER ZONE" icon={<Trash2 className="size-3.5 text-destructive" />} />
                <CardContent padding="md">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Delete Workspace</div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Permanently delete this workspace and all scan history. This cannot be undone.
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      &gt; DELETE WORKSPACE
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* NOTIFICATIONS */}
          <TabsContent value="notifications">
            <div className="space-y-4 mt-2">
              <Card size="auto">
                <CardHeader title="ALERT CHANNELS" icon={<Bell className="size-3.5 text-muted-foreground" />} />
                <CardContent padding="md">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Slack Alerts</div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Post scan results to #eng-alerts
                        </p>
                      </div>
                      <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Weekly Email Digest</div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Summary of trends and new issues every Monday
                        </p>
                      </div>
                      <Switch checked={emailDigest} onCheckedChange={setEmailDigest} />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">PR Comment Bot</div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Automatically comment scan results on pull requests
                        </p>
                      </div>
                      <Switch checked={prComments} onCheckedChange={setPrComments} />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Critical Issues Only</div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Only notify on critical severity findings (suppress medium/high)
                        </p>
                      </div>
                      <Switch checked={criticalOnly} onCheckedChange={setCriticalOnly} />
                    </div>
                  </div>
                  <Button size="sm" className="mt-6">&gt; SAVE PREFERENCES</Button>
                </CardContent>
              </Card>

              <Card size="auto">
                <CardHeader title="SLACK INTEGRATION" icon={<Webhook className="size-3.5 text-muted-foreground" />} />
                <CardContent padding="md">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className={cn('text-xs font-medium', mode.font)}>WEBHOOK URL</label>
                      <Input
                        type="url"
                        defaultValue="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX"
                        placeholder="https://hooks.slack.com/services/..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={cn('text-xs font-medium', mode.font)}>CHANNEL</label>
                      <Input defaultValue="#eng-alerts" placeholder="#channel-name" />
                    </div>
                  </div>
                  <Button size="sm" className="mt-4">&gt; TEST & SAVE WEBHOOK</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TEAM */}
          <TabsContent value="team">
            <div className="space-y-4 mt-2">
              <Card size="auto">
                <CardHeader
                  title="TEAM MEMBERS"
                  icon={<Users className="size-3.5 text-muted-foreground" />}
                  meta={`${teamMembers.length} members`}
                />
                <CardContent padding="sm">
                  <div className="space-y-1">
                    {teamMembers.map((member) => (
                      <div
                        key={member.email}
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                          {member.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{member.name}</span>
                            <Badge variant={member.role === 'Owner' ? 'default' : 'secondary'}>
                              {member.role.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">{member.lastActive}</div>
                        {member.role !== 'Owner' && (
                          <Button variant="ghost" size="icon" aria-label="Remove member">
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Invite */}
              <Card size="auto">
                <CardHeader title="INVITE MEMBER" icon={<Plus className="size-3.5 text-muted-foreground" />} />
                <CardContent padding="md">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className={cn('text-xs font-medium', mode.font)}>EMAIL ADDRESS</label>
                      <Input type="email" placeholder="colleague@yourcompany.com" />
                    </div>
                    <div className="space-y-1.5">
                      <label className={cn('text-xs font-medium', mode.font)}>ROLE</label>
                      <Select defaultValue="member">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button size="sm" className="mt-4">
                    <Plus className="size-3.5" />
                    &gt; SEND INVITE
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* API KEYS */}
          <TabsContent value="api">
            <div className="space-y-4 mt-2">
              <Card size="auto">
                <CardHeader title="API KEYS" icon={<KeyRound className="size-3.5 text-muted-foreground" />} meta={`${apiKeys.length} keys`} />
                <CardContent padding="sm">
                  <div className="space-y-1">
                    {apiKeys.map((key) => (
                      <div
                        key={key.name}
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <KeyRound className="size-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{key.name}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            {key.prefix}
                          </div>
                        </div>
                        <div className="hidden text-right text-xs text-muted-foreground sm:block shrink-0">
                          <div>Created {key.created}</div>
                          <div>Last used {key.lastUsed}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(key.name)}
                          aria-label="Copy key"
                        >
                          {copied === key.name ? (
                            <Check className="size-3.5 text-success" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Revoke key">
                          <Trash2 className="size-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Create new key */}
              <Card size="auto">
                <CardHeader title="CREATE API KEY" icon={<Plus className="size-3.5 text-muted-foreground" />} />
                <CardContent padding="md">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className={cn('text-xs font-medium', mode.font)}>KEY NAME</label>
                      <Input placeholder="e.g. GitHub Actions — prod" />
                    </div>
                    <div className="space-y-1.5">
                      <label className={cn('text-xs font-medium', mode.font)}>EXPIRATION</label>
                      <Select defaultValue="never">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30d">30 days</SelectItem>
                          <SelectItem value="90d">90 days</SelectItem>
                          <SelectItem value="1y">1 year</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    The key will only be shown once. Store it somewhere safe immediately.
                  </p>
                  <Button size="sm" className="mt-4">
                    <KeyRound className="size-3.5" />
                    &gt; GENERATE KEY
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
