import { useEffect, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Button, Stack, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip,
  CircularProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import client from '../api/client'

const statusColors: Record<string, any> = {
  COMPLETED:'success', IN_PROGRESS:'warning', PLANNED:'info', FAILED:'error',
}

export default function TestSessionPage() {
  const [sessions, setSessions]   = useState<any[]>([])
  const [tires, setTires]         = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [open, setOpen]           = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [selected, setSelected]   = useState<any>(null)
  const [form, setForm]           = useState({ tireId:'', testType:'', vehicle:'', testerName:'' })
  const [statusForm, setStatusForm] = useState({ status:'', score:'', passed:'', notes:'' })
  const [delId, setDelId]         = useState<number|null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([client.get('/sessions'), client.get('/tires')])
      .then(([s, t]) => { setSessions(s.data); setTires(t.data) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    await client.post('/sessions', { ...form, tireId: +form.tireId })
    setOpen(false); load()
  }

  const updateStatus = async () => {
    await client.patch(`/sessions/${selected.id}/status`, {
      status: statusForm.status,
      ...(statusForm.score   && { score: +statusForm.score }),
      ...(statusForm.passed !== '' && { passed: statusForm.passed === 'true' }),
      ...(statusForm.notes   && { notes: statusForm.notes }),
    })
    setStatusOpen(false); load()
  }

  const openStatus = (s: any) => {
    setSelected(s)
    setStatusForm({ status: s.status, score: s.score ?? '', passed: s.passed != null ? String(s.passed) : '', notes: s.notes ?? '' })
    setStatusOpen(true)
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Test Sessions</Typography>
          <Typography variant="body2" color="text.secondary">Track all tire testing activities</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New Session</Button>
      </Stack>

      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          {loading ? (
            <Box sx={{ display:'flex', justifyContent:'center', py:4 }}><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight:700, bgcolor:'#fafafa' } }}>
                    <TableCell>Tire</TableCell>
                    <TableCell>Test Type</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Tester</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((s: any) => (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <Typography fontWeight={600} fontSize={14}>{s.tire?.brand}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.tire?.model}</Typography>
                      </TableCell>
                      <TableCell>{s.testType}</TableCell>
                      <TableCell>{s.vehicle}</TableCell>
                      <TableCell>{s.testerName}</TableCell>
                      <TableCell>{s.sessionDate ?? '—'}</TableCell>
                      <TableCell><Chip label={s.status} size="small" color={statusColors[s.status]} /></TableCell>
                      <TableCell>{s.score != null ? s.score : '—'}</TableCell>
                      <TableCell>
                        {s.passed === true  && <Chip label="PASS" size="small" color="success" />}
                        {s.passed === false && <Chip label="FAIL" size="small" color="error" />}
                        {s.passed == null   && <Typography variant="caption" color="text.secondary">—</Typography>}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Update Status">
                          <IconButton size="small" onClick={() => openStatus(s)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => setDelId(s.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sessions.length === 0 && (
                    <TableRow><TableCell colSpan={9} align="center" sx={{ py:4, color:'text.secondary' }}>No sessions yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Test Session</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Tire</InputLabel>
              <Select value={form.tireId} label="Tire" onChange={e => setForm(p => ({...p, tireId: e.target.value}))}>
                {tires.map((t: any) => <MenuItem key={t.id} value={t.id}>{t.brand} {t.model} — {t.size}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth label="Test Type" value={form.testType}
              onChange={e => setForm(p => ({...p, testType: e.target.value}))}
              placeholder="e.g. Wet Braking, Snow Traction, Noise Level" />
            <TextField fullWidth label="Vehicle" value={form.vehicle}
              onChange={e => setForm(p => ({...p, vehicle: e.target.value}))}
              placeholder="e.g. VW Golf 8 2023" />
            <TextField fullWidth label="Tester Name" value={form.testerName}
              onChange={e => setForm(p => ({...p, testerName: e.target.value}))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={create}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={statusOpen} onClose={() => setStatusOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Session Status</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusForm.status} label="Status" onChange={e => setStatusForm(p => ({...p, status: e.target.value}))}>
                {['PLANNED','IN_PROGRESS','COMPLETED','FAILED'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth label="Score (0–100)" type="number" value={statusForm.score}
              onChange={e => setStatusForm(p => ({...p, score: e.target.value}))} />
            <FormControl fullWidth>
              <InputLabel>Result</InputLabel>
              <Select value={statusForm.passed} label="Result" onChange={e => setStatusForm(p => ({...p, passed: e.target.value}))}>
                <MenuItem value="">— Not set —</MenuItem>
                <MenuItem value="true">PASS</MenuItem>
                <MenuItem value="false">FAIL</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth multiline rows={2} label="Notes" value={statusForm.notes}
              onChange={e => setStatusForm(p => ({...p, notes: e.target.value}))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStatusOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={updateStatus}>Update</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={delId !== null} onClose={() => setDelId(null)}>
        <DialogTitle>Delete Session?</DialogTitle>
        <DialogContent><Typography>This cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDelId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={async () => { await client.delete(`/sessions/${delId}`); setDelId(null); load() }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
