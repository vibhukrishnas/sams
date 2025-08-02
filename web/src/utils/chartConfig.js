import Chart from 'chart.js/auto';
import { formatBytes, formatPercentage } from './formatters';

// Common chart colors
export const colors = {
  primary: '#2196f3',
  secondary: '#f50057',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  background: 'rgba(255, 255, 255, 0.1)'
};

// Base chart configuration
const baseConfig = {
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 250
    },
    plugins: {
      legend: {
        position: 'bottom'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    }
  }
};

// Real-time line chart configuration
export const createLineChartConfig = (labels = [], datasets = []) => ({
  type: 'line',
  data: { labels, datasets },
  options: {
    ...baseConfig.options,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          displayFormats: {
            minute: 'HH:mm'
          }
        },
        ticks: {
          source: 'auto',
          maxRotation: 0
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            if (typeof value === 'number') {
              return formatPercentage(value / 100);
            }
            return value;
          }
        }
      }
    }
  }
});

// Real-time gauge chart configuration
export const createGaugeChartConfig = (value, label, maxValue = 100) => ({
  type: 'doughnut',
  data: {
    datasets: [{
      data: [value, maxValue - value],
      backgroundColor: [colors.primary, colors.background],
      circumference: 180,
      rotation: 270
    }]
  },
  options: {
    ...baseConfig.options,
    plugins: {
      tooltip: { enabled: false },
      legend: { display: false }
    },
    cutout: '75%'
  }
});

// Memory usage chart configuration
export const createMemoryChartConfig = (used, total, label = 'Memory Usage') => ({
  type: 'bar',
  data: {
    labels: [label],
    datasets: [
      {
        label: 'Used',
        data: [used],
        backgroundColor: colors.warning
      },
      {
        label: 'Available',
        data: [total - used],
        backgroundColor: colors.success
      }
    ]
  },
  options: {
    ...baseConfig.options,
    indexAxis: 'y',
    scales: {
      x: {
        stacked: true,
        ticks: {
          callback: (value) => formatBytes(Number(value))
        }
      },
      y: {
        stacked: true
      }
    }
  }
});

// Initialize Chart.js plugins
Chart.register({
  id: 'customBackgroundColor',
  beforeDraw: (chart) => {
    const ctx = chart.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  }
});

export const updateChartData = (chart, newData, label = '') => {
  const timestamp = new Date();
  
  if (chart.data.labels) {
    chart.data.labels.push(timestamp);
    if (chart.data.labels.length > 60) { // Keep last 60 data points
      chart.data.labels.shift();
    }
  }

  chart.data.datasets.forEach((dataset, index) => {
    if (dataset.data) {
      dataset.data.push(newData[index]);
      if (dataset.data.length > 60) {
        dataset.data.shift();
      }
    }
  });

  chart.update('none'); // Update without animation for real-time data
};
