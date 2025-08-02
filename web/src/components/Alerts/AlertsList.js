import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import websocketService from '../../services/websocket';

const severityIcons = {
  error: <ErrorIcon color="error" />,
  warning: <WarningIcon color="warning" />,
  info: <InfoIcon color="info" />,
  success: <CheckIcon color="success" />,
};

const severityColors = {
  error: 'error',
  warning: 'warning',
  info: 'info',
  success: 'success',
};

const AlertsList = () => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const unsubscribe = websocketService.subscribe('alerts', (newAlert) => {
      setAlerts((prevAlerts) => [newAlert, ...prevAlerts].slice(0, 100)); // Keep last 100 alerts
    });

    return () => unsubscribe();
  }, []);

  const handleDismiss = (alertId) => {
    setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== alertId));
    websocketService.emit('dismiss_alert', { alertId });
  };

  return (
    <Paper elevation={2}>
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          System Alerts
        </Typography>
        <List>
          {alerts.map((alert) => (
            <ListItem
              key={alert.id}
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="dismiss"
                  onClick={() => handleDismiss(alert.id)}
                >
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemIcon>{severityIcons[alert.severity]}</ListItemIcon>
              <ListItemText
                primary={alert.message}
                secondary={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mt: 0.5,
                    }}
                  >
                    <Chip
                      label={alert.source}
                      size="small"
                      color={severityColors[alert.severity]}
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(alert.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
          {alerts.length === 0 && (
            <ListItem>
              <ListItemText
                primary={
                  <Typography color="text.secondary">
                    No alerts to display
                  </Typography>
                }
              />
            </ListItem>
          )}
        </List>
      </Box>
    </Paper>
  );
};

export default AlertsList;
