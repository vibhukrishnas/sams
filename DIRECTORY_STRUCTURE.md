# SAMS Directory Structure

## 📁 Organized Project Layout

```
SAMS/
├── 🏗️ Core Applications
│   ├── sams-backend/          # Spring Boot API server
│   ├── sams-mobile/           # React Native mobile app
│   ├── web/                   # React web frontend
│   └── mobile-app/           # Additional mobile components
│
├── 🖥️ Servers
│   ├── windows_sams_server.py        # Windows monitoring server
│   ├── windows_vm_sams_server.py     # VM monitoring server
│   ├── linux_sams_server.py          # Linux monitoring server
│   ├── demo_server.py                # Demo server
│   ├── start_windows_monitor.bat     # Windows monitor launcher
│   ├── start_windows_monitor_192.168.1.10.bat
│   └── verify_sams_installation.py   # Installation verifier
│
├── 📜 Scripts
│   ├── deployment/           # Build & deployment scripts
│   │   ├── build_native_sams.bat
│   │   ├── create_real_native_sams.bat
│   │   ├── create_simple_rn_app.bat
│   │   ├── create_working_sams_app.bat
│   │   ├── deploy_sams_to_server.bat
│   │   ├── deploy.sh
│   │   └── FINAL_NATIVE_SAMS_DEPLOYMENT.bat
│   │
│   ├── android/              # Android-specific scripts
│   │   ├── find-android-and-launch-sams.bat
│   │   ├── launch-android-emulator.bat
│   │   ├── move-android-sdk.bat
│   │   └── quick-android-setup.bat
│   │
│   ├── launch/               # App launch scripts
│   │   ├── launch-mobile-demo.bat
│   │   ├── launch-mobile-demo.ps1
│   │   ├── launch-sams-in-emulator.bat
│   │   ├── Launch-SAMS.ps1
│   │   ├── launch_sams_mobile.bat
│   │   ├── direct-launch-sams.bat
│   │   ├── quick-launch-sams.bat
│   │   └── start-sams-emulator.bat
│   │
│   ├── setup/                # Setup & configuration scripts
│   │   ├── git-setup.sh
│   │   ├── setup-and-launch-sams.bat
│   │   ├── setup-github-repo.sh
│   │   └── quick-start.sh
│   │
│   ├── emergency-cleanup.bat  # Utility scripts
│   └── fix_metro_and_launch.bat
│
├── 🏗️ Infrastructure
│   ├── infrastructure/       # Monitoring stack (Prometheus, Grafana)
│   ├── k8s/                 # Kubernetes configurations
│   ├── terraform/           # Infrastructure as Code
│   └── docker-compose.yml   # Container orchestration
│
├── 🗄️ Data
│   ├── database/            # Database schemas & migrations
│   └── migrations/          # Database migration files
│
├── 📚 Documentation
│   ├── docs/                # Technical documentation
│   ├── CONTRIBUTING.md      # Contribution guidelines
│   ├── GITHUB_SETUP_COMPLETE.md
│   ├── LIVE_DEMO_SCRIPT.md
│   ├── MOBILE_APP_GUIDE.md
│   ├── NATIVE_MOBILE_APP_SOLUTION_SUMMARY.md
│   └── mobile_app_simulator.html
│
├── 🔧 Configuration
│   ├── .env.example         # Environment template
│   ├── .gitignore          # Git ignore rules
│   ├── .vscode/            # VS Code settings
│   ├── .github/            # GitHub workflows
│   ├── .idea/              # IntelliJ settings
│   ├── package.json        # Node.js dependencies
│   ├── package-lock.json   # Dependency lock file
│   └── alembic.ini        # Database migration config
│
├── 📦 Backups
│   └── archive/            # Archived files
│
└── 📋 Project Files
    ├── README.md           # Main project documentation
    └── DIRECTORY_STRUCTURE.md  # This file
```

## 🚀 Quick Start

1. **Setup**: Use scripts in `scripts/setup/`
2. **Development**: Core apps in root directories
3. **Deployment**: Use scripts in `scripts/deployment/`
4. **Launch**: Use scripts in `scripts/launch/`

## 📝 Notes

- All scripts are organized by purpose
- Server files are in dedicated `servers/` directory  
- Documentation is centralized in `documentation/`
- Infrastructure code is properly grouped
- Clean separation of concerns maintained
