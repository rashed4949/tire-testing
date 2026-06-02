import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton,
  Avatar, Menu, MenuItem, Divider, useTheme, Tooltip,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import TireRepairIcon from '@mui/icons-material/TireRepair'
import ScienceIcon from '@mui/icons-material/Science'
import LogoutIcon from '@mui/icons-material/Logout'
import PersonIcon from '@mui/icons-material/Person'
import { useAuth } from '../context/AuthContext'

const DRAWER_WIDTH = 240

const navItems = [
  { label: 'Dashboard',     path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Tires',         path: '/tires',     icon: <TireRepairIcon /> },
  { label: 'Test Sessions', path: '/sessions',  icon: <ScienceIcon /> },
]

export default function Layout() {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer variant="permanent" sx={{
        width: DRAWER_WIDTH,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          background: '#1A1A2E',
          color: '#fff',
          border: 'none',
        },
      }}>
        {/* Logo */}
        <Box sx={{ p: 3, pb: 2 }}>
          <Typography variant="h6" sx={{ color: '#FFD100', fontWeight: 800, letterSpacing: 1 }}>
            🔧 TireTest PROD TEST
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
           ABC Tire Company
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

        <List sx={{ pt: 2 }}>
          {navItems.map(item => {
            const active = location.pathname === item.path
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    mx: 1, borderRadius: 2,
                    backgroundColor: active ? 'rgba(255,102,0,0.15)' : 'transparent',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  <ListItemIcon sx={{ color: active ? '#FFD100' : 'rgba(255,255,255,0.6)', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{
                    color: active ? '#FFD100' : 'rgba(255,255,255,0.85)',
                    fontWeight: active ? 600 : 400,
                    fontSize: 14,
                  }} />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" elevation={0} sx={{
          background: '#fff',
          borderBottom: '1px solid #eee',
        }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1, color: '#1A1A2E', fontWeight: 700 }}>
              {navItems.find(n => n.path === location.pathname)?.label ?? 'Tire Testing System'}
            </Typography>
            <Tooltip title={user?.fullName ?? ''}>
              <IconButton onClick={e => setAnchorEl(e.currentTarget)}>
                <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 36, height: 36, fontSize: 14 }}>
                  {user?.fullName?.charAt(0) ?? 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem disabled>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                {user?.fullName} ({user?.role})
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { logout(); navigate('/login') }}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, p: 3, background: '#F5F6FA' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
