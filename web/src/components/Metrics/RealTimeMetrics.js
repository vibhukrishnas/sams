import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography, Grid } from '@mui/material';
import Chart from 'chart.js/auto';
import { colors, createLineChartConfig, createGaugeChartConfig, updateChartData } from '../../utils/chartConfig';
import websocketService from '../../services/websocket';

const RealTimeMetrics = () => {
  const cpuChartRef = useRef(null);
  const memoryChartRef = useRef(null);
  const networkChartRef = useRef(null);
  const diskChartRef = useRef(null);

  useEffect(() => {
    // Initialize charts
    const cpuChart = new Chart(cpuChartRef.current, createLineChartConfig([], [{
      label: 'CPU Usage',
      data: [],
      borderColor: colors.primary,
      backgroundColor: colors.background,
      tension: 0.4
    }]));

    const memoryChart = new Chart(memoryChartRef.current, createLineChartConfig([], [{
      label: 'Memory Usage',
      data: [],
      borderColor: colors.warning,
      backgroundColor: colors.background,
      tension: 0.4
    }]));

    const networkChart = new Chart(networkChartRef.current, createLineChartConfig([], [
      {
        label: 'Network In',
        data: [],
        borderColor: colors.success,
        backgroundColor: colors.background,
        tension: 0.4
      },
      {
        label: 'Network Out',
        data: [],
        borderColor: colors.error,
        backgroundColor: colors.background,
        tension: 0.4
      }
    ]));

    const diskChart = new Chart(diskChartRef.current, createGaugeChartConfig(0, 'Disk Usage'));

    // Subscribe to WebSocket events
    const unsubscribeSystemMetrics = websocketService.subscribe(
      'system_metrics',
      (data) => {
        updateChartData(cpuChart, [data.cpu.usage]);
        updateChartData(memoryChart, [data.memory.usedPercentage]);
        updateChartData(networkChart, [data.network.bytesIn, data.network.bytesOut]);
        
        const diskUsage = data.disk.used / data.disk.total * 100;
        diskChart.data.datasets[0].data = [diskUsage, 100 - diskUsage];
        diskChart.update();
      }
    );

    return () => {
      // Cleanup
      cpuChart.destroy();
      memoryChart.destroy();
      networkChart.destroy();
      diskChart.destroy();
      unsubscribeSystemMetrics();
    };
  }, []);

  return (
    <Box p={3}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              CPU Usage
            </Typography>
            <Box height={300}>
              <canvas ref={cpuChartRef} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Memory Usage
            </Typography>
            <Box height={300}>
              <canvas ref={memoryChartRef} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Network Traffic
            </Typography>
            <Box height={300}>
              <canvas ref={networkChartRef} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Disk Usage
            </Typography>
            <Box height={300}>
              <canvas ref={diskChartRef} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RealTimeMetrics;
