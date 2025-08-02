# SAMS (Server and Application Monitoring System)

## 🚀 Overview

SAMS is a comprehensive server and application monitoring system that combines robust backend monitoring capabilities with an intuitive mobile interface. It provides real-time monitoring, alerts, and server management capabilities.

## 🛠️ Core Components

- `SAMSMobileExpo/` - React Native mobile application
- `backend/` - Server implementations (Node.js, Java, Python)
- `infrastructure-monitoring-system/` - Core monitoring infrastructure
- `config/` - Configuration templates and examples

## 🏗️ Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Python >= 3.8
- Java >= 17
- PostgreSQL >= 13
- Redis >= 6

## 🚀 Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/vibhukrishnas/sams.git
   cd sams
   ```

2. Copy environment template:
   ```bash
   cp .env.example .env
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development servers:
   ```bash
   # Start the mobile app
   npm run start:mobile

   # Start the backend
   npm run start:backend

   # Start the monitoring system
   npm run start:monitoring
   ```

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

- [API Documentation](docs/API_DOCUMENTATION_README.md)
- [Architecture Overview](docs/architecture.md)
- [Deployment Guide](docs/production-deployment-guide.md)
- [Monitoring Guide](docs/monitoring-guide.md)

## 🔒 Security

Please ensure you:
1. Never commit `.env` files
2. Keep all credentials secure
3. Follow security best practices in `docs/security-guide.md`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
