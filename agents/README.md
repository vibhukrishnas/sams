# SAMS Monitoring Agent

## Overview

The SAMS Monitoring Agent is a cross-platform system monitoring solution that provides real-time metrics collection and secure data transmission to the SAMS backend infrastructure.

## Features

- Real-time system metrics collection
- Configurable collection intervals
- Secure authentication and data transmission
- Automatic retry logic for failed transmissions
- Data compression
- Cross-platform support (Windows, Linux, macOS)

## Supported Metrics

- CPU Usage and Information
- Memory Statistics
- Disk I/O Monitoring
- Network Traffic Analysis
- Process Monitoring

## Prerequisites

### Python Agent
```bash
# Install required packages
pip install -r requirements.txt

# Required system libraries
sudo apt-get install python3-dev  # For Linux
```

### Node.js Agent
```bash
# Install dependencies
npm install

# Required system access
# Windows: Run as Administrator
# Linux: Run with sudo
```

## Configuration

1. Copy the example configuration:
```bash
cp config/agent.config.example.json config/agent.config.json
```

2. Update the configuration with your settings:
```json
{
  "auth": {
    "api_key": "your-api-key",
    "server_url": "https://your-sams-server.com"
  },
  "collection_interval": 60,
  "retry_attempts": 3,
  "compress_data": true,
  "log_level": "INFO"
}
```

## Usage

### Python Agent
```bash
python sams_agent.py
```

### Node.js Agent
```bash
node sams_agent.js
```

## Directory Structure

```
.
├── README.md                 # This file
├── requirements.txt          # Python dependencies
├── package.json             # Node.js dependencies
├── config/
│   └── agent.config.example.json
├── collectors/              # System metric collectors
│   ├── cpu.js/py           # CPU metrics
│   ├── memory.js/py        # Memory metrics
│   ├── disk.js/py          # Disk I/O metrics
│   ├── network.js/py       # Network metrics
│   └── process.js/py       # Process metrics
└── utils/
    ├── auth.js/py          # Authentication
    └── transport.js/py     # Data transmission
```

## Security Considerations

1. Always use secure communication (HTTPS)
2. Protect API keys and credentials
3. Run with minimal required privileges
4. Validate all collected data
5. Implement rate limiting

## Troubleshooting

### Common Issues

1. Permission Denied
```bash
# Linux/macOS
sudo chmod +x sams_agent.py
sudo ./sams_agent.py

# Windows
# Run PowerShell as Administrator
```

2. Missing Dependencies
```bash
# Python
pip install -r requirements.txt

# Node.js
npm install
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - See LICENSE file for details
