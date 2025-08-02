import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Box, Container, Paper, Typography } from '@mui/material';
import RealTimeMetrics from '../Metrics/RealTimeMetrics';
import AlertsList from '../Alerts/AlertsList';

const ErrorFallback = ({ error }) => (
  <Paper
    sx={{
      p: 3,
      backgroundColor: (theme) => theme.palette.error.light,
      color: (theme) => theme.palette.error.contrastText,
    }}
  >
    <Typography variant="h6" gutterBottom>
      Something went wrong:
    </Typography>
    <Typography variant="body1">{error.message}</Typography>
  </Paper>
);

const Dashboard = () => {
  return (
    <Container maxWidth="xl">
      <Box py={4}>
        <Typography variant="h4" gutterBottom>
          System Monitoring Dashboard
        </Typography>
        
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Box mb={4}>
            <RealTimeMetrics />
          </Box>
        </ErrorBoundary>

        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Box>
            <AlertsList />
          </Box>
        </ErrorBoundary>
      </Box>
    </Container>
  );
};

export default Dashboard;
