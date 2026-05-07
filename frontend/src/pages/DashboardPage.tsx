import { useEffect, useState } from 'react'
import Grid from '@mui/material/Grid2'
import {
  Card, CardContent, Typography, Box, Chip,
  Table, TableBody, TableCell, TableHead, TableRow,
  TableContainer, CircularProgress, LinearProgress,
} from '@mui/material'
import TireRepairIcon from '@mui/icons-material/TireRepair'
import ScienceIcon from '@mui/icons-material/Science'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SpeedIcon from '@mui/icons-material/Speed'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

interface Stats {
  totalTires: number; activeTires: number; testingTires: number
  totalSessions: number; passedSessions: number; failedSessions: number
  activeSessions: number; passRate: number; recentSessions: any[]
}

const statusColor: Record<string, string> = {
  COMPLETED: 'success', IN_PROGRESS: 'warning',
  PLANNED: 'info', FAILED: 'error',
}

function StatCard({ title, value, subtitle, icon, color }: any) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
            <Typography variant="h4" fontWeight={700}>{value}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}18` }}>
            <Box sx={{ color }}>{icon}</Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/dashboard/stats').then(r => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', mt:8 }}><CircularProgress /></Box>
  if (!stats)  return <Typography color="error">Failed to load dashboard</Typography>

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        Welcome back, {user?.fullName?.split(' ')[0]} 👋
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Here's what's happening in your tire testing lab today.
      </Typography>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Total Tires" value={stats.totalTires}
            subtitle={`${stats.activeTires} active · ${stats.testingTires} in testing`}
            icon={<TireRepairIcon />} color="#FF6600" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Test Sessions" value={stats.totalSessions}
            subtitle={`${stats.activeSessions} currently running`}
            icon={<ScienceIcon />} color="#2196F3" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Passed Tests" value={stats.passedSessions}
            subtitle={`${stats.failedSessions} failed`}
            icon={<CheckCircleIcon />} color="#4CAF50" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Pass Rate" value={`${stats.passRate}%`}
            subtitle="Overall success rate"
            icon={<SpeedIcon />} color="#9C27B0" />
        </Grid>
      </Grid>

      {/* Pass Rate Bar + Recent Sessions */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" mb={3}>Test Results Overview</Typography>
              {[
                { label: 'Pass Rate', value: stats.passRate, color: '#4CAF50' },
                { label: 'Active Sessions', value: stats.totalSessions > 0 ? (stats.activeSessions / stats.totalSessions) * 100 : 0, color: '#FF9800' },
                { label: 'Tire Utilization', value: stats.totalTires > 0 ? ((stats.activeTires + stats.testingTires) / stats.totalTires) * 100 : 0, color: '#2196F3' },
              ].map(item => (
                <Box key={item.label} mb={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{item.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{item.value.toFixed(1)}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={item.value}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#eee',
                      '& .MuiLinearProgress-bar': { bgcolor: item.color, borderRadius: 4 } }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Recent Test Sessions</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><b>Tire</b></TableCell>
                      <TableCell><b>Test Type</b></TableCell>
                      <TableCell><b>Status</b></TableCell>
                      <TableCell><b>Score</b></TableCell>
                      <TableCell><b>Result</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.recentSessions.map((s: any) => (
                      <TableRow key={s.id} hover>
                        <TableCell>{s.tireBrand} {s.tireModel}</TableCell>
                        <TableCell>{s.testType}</TableCell>
                        <TableCell>
                          <Chip label={s.status} size="small"
                            color={statusColor[s.status] as any ?? 'default'} />
                        </TableCell>
                        <TableCell>{s.score != null ? `${s.score}` : '—'}</TableCell>
                        <TableCell>
                          {s.passed === true  && <Chip label="PASS" size="small" color="success" />}
                          {s.passed === false && <Chip label="FAIL" size="small" color="error" />}
                          {s.passed === null  && <Typography variant="caption" color="text.secondary">Pending</Typography>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
