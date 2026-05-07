import { useEffect, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Button, TextField, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, FormControl, InputLabel, Tooltip, CircularProgress,
  Stack,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import client from '../api/client'

interface Tire {
  id: number; brand: string; model: string; size: string
  serialNumber: string; productionYear: number
  type: string; status: string; notes: string
}

const typeColors: Record<string, string>   = { SUMMER:'warning', WINTER:'info', ALL_SEASON:'success', PERFORMANCE:'error' }
const statusColors: Record<string, string> = { ACTIVE:'success', TESTING:'warning', ARCHIVED:'default' }

const emptyTire = (): Partial<Tire> => ({ brand:'', model:'', size:'', serialNumber:'', type:'ALL_SEASON', status:'ACTIVE', notes:'' })

export default function TirePage() {
  const [tires, setTires]       = useState<Tire[]>([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [open, setOpen]         = useState(false)
  const [editing, setEditing]   = useState<Partial<Tire>>(emptyTire())
  const [isEdit, setIsEdit]     = useState(false)
  const [delId, setDelId]       = useState<number|null>(null)

  const load = () => {
    setLoading(true)
    client.get('/tires', { params: { search: search || undefined } })
      .then(r => setTires(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search])

  const openAdd  = () => { setEditing(emptyTire()); setIsEdit(false); setOpen(true) }
  const openEdit = (t: Tire) => { setEditing({ ...t }); setIsEdit(true); setOpen(true) }

  const save = async () => {
    if (isEdit) await client.put(`/tires/${editing.id}`, editing)
    else await client.post('/tires', editing)
    setOpen(false); load()
  }

  const confirmDelete = async () => {
    if (delId) { await client.delete(`/tires/${delId}`); setDelId(null); load() }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Tire Inventory</Typography>
          <Typography variant="body2" color="text.secondary">Manage and track all test tires</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Tire</Button>
      </Stack>

      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <TextField placeholder="Search by brand or model…" value={search}
            onChange={e => setSearch(e.target.value)} size="small" sx={{ mb: 2, minWidth: 280 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />

          {loading ? (
            <Box sx={{ display:'flex', justifyContent:'center', py:4 }}><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#fafafa' } }}>
                    <TableCell>Brand / Model</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Serial #</TableCell>
                    <TableCell>Year</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tires.map(t => (
                    <TableRow key={t.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{t.brand}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.model}</Typography>
                      </TableCell>
                      <TableCell><code>{t.size}</code></TableCell>
                      <TableCell>{t.serialNumber}</TableCell>
                      <TableCell>{t.productionYear}</TableCell>
                      <TableCell>
                        <Chip label={t.type} size="small" color={typeColors[t.type] as any ?? 'default'} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={t.status} size="small" color={statusColors[t.status] as any ?? 'default'} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(t)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDelId(t.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tires.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py:4, color:'text.secondary' }}>No tires found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? 'Edit Tire' : 'Add New Tire'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="Brand" value={editing.brand ?? ''} onChange={e => setEditing(p => ({...p, brand: e.target.value}))} />
              <TextField fullWidth label="Model" value={editing.model ?? ''} onChange={e => setEditing(p => ({...p, model: e.target.value}))} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="Size (e.g. 205/55R16)" value={editing.size ?? ''} onChange={e => setEditing(p => ({...p, size: e.target.value}))} />
              <TextField fullWidth label="Serial Number" value={editing.serialNumber ?? ''} onChange={e => setEditing(p => ({...p, serialNumber: e.target.value}))} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="Production Year" type="number" value={editing.productionYear ?? ''} onChange={e => setEditing(p => ({...p, productionYear: +e.target.value}))} />
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={editing.type ?? 'ALL_SEASON'} label="Type" onChange={e => setEditing(p => ({...p, type: e.target.value}))}>
                  {['SUMMER','WINTER','ALL_SEASON','PERFORMANCE'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={editing.status ?? 'ACTIVE'} label="Status" onChange={e => setEditing(p => ({...p, status: e.target.value}))}>
                {['ACTIVE','TESTING','ARCHIVED'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth multiline rows={2} label="Notes" value={editing.notes ?? ''} onChange={e => setEditing(p => ({...p, notes: e.target.value}))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={delId !== null} onClose={() => setDelId(null)}>
        <DialogTitle>Delete Tire?</DialogTitle>
        <DialogContent><Typography>This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDelId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
