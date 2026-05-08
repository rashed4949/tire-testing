import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, InputAdornment, IconButton, Divider, Chip,
} from '@mui/material'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError('Invalid email or password. Try admin@continental.com / admin123')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (e: string, p: string) => { setEmail(e); setPassword(p) }

  return (
      <Box sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
      }}>
        <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#FFD100' }}>🔧 TireTest</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                ABC Tire Company — Tire Testing Management
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <form onSubmit={handleLogin}>
              <TextField fullWidth label="Email" type="email" value={email}
                         onChange={e => setEmail(e.target.value)} required sx={{ mb: 2 }}
                         InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon color="action" /></InputAdornment> }} />

              <TextField fullWidth label="Password" type={showPw ? 'text' : 'password'}
                         value={password} onChange={e => setPassword(e.target.value)} required sx={{ mb: 3 }}
                         InputProps={{
                           startAdornment: <InputAdornment position="start"><LockIcon color="action" /></InputAdornment>,
                           endAdornment: (
                               <InputAdornment position="end">
                                 <IconButton onClick={() => setShowPw(!showPw)} edge="end">
                                   {showPw ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                 </IconButton>
                               </InputAdornment>
                           ),
                         }} />

              <Button fullWidth type="submit" variant="contained" size="large"
                      disabled={loading} sx={{ py: 1.5, fontSize: 16 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
            </form>

            <Divider sx={{ my: 3 }}><Typography variant="caption" color="text.secondary">Accounts</Typography></Divider>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Chip label="Admin" size="small" onClick={() => quickLogin('admin@continental.com','admin123')}
                    sx={{ cursor: 'pointer', bgcolor: '#FFD100', color: '#000' }} />
              <Chip label="Tester" size="small" onClick={() => quickLogin('tester@continental.com','tester123')}
                    sx={{ cursor: 'pointer' }} variant="outlined" />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              Click a chip to auto-fill credentials
            </Typography>
          </CardContent>
        </Card>
      </Box>
  )
}
