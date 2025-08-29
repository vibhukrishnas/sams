import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface HardwareInfo {
  cpu: {
    name: string;
    cores: number;
    threads: number;
    maxClockSpeed: number;
    architecture: string;
  };
  memory: {
    totalGB: number;
    availableGB: number;
    modules: MemoryModule[];
  };
  storage: StorageDevice[];
  network: NetworkAdapter[];
  motherboard: {
    manufacturer: string;
    model: string;
    serialNumber: string;
  };
}

export interface SoftwareInfo {
  os: {
    name: string;
    version: string;
    buildNumber: string;
    architecture: string;
    installDate: string;
  };
  installedApps: Application[];
  services: WindowsService[];
  drivers: Driver[];
}

export interface Application {
  name: string;
  version: string;
  publisher: string;
  installDate: string;
  installLocation: string;
  size?: number;
}

export interface WindowsService {
  name: string;
  displayName: string;
  status: string;
  startType: string;
  pathName: string;
}

export interface Driver {
  name: string;
  version: string;
  date: string;
  provider: string;
  signed: boolean;
}

export interface StorageDevice {
  model: string;
  size: number;
  type: 'HDD' | 'SSD' | 'Unknown';
  health: string;
  serialNumber: string;
}

export interface NetworkAdapter {
  name: string;
  macAddress: string;
  ipAddress: string;
  speed: number;
  type: string;
}

export interface MemoryModule {
  capacity: number;
  speed: number;
  type: string;
  manufacturer: string;
}

export interface ChangeEvent {
  timestamp: string;
  type: 'software_installed' | 'software_removed' | 'hardware_added' | 'hardware_removed' | 'config_changed';
  description: string;
  details: any;
}

export interface AssetInventory {
  deviceId: string;
  hostname: string;
  lastScanned: string;
  hardware: HardwareInfo;
  software: SoftwareInfo;
  changes: ChangeEvent[];
}

export class AssetInventoryService {
  private static instance: AssetInventoryService;
  private inventoryCache: Map<string, AssetInventory> = new Map();

  public static getInstance(): AssetInventoryService {
    if (!AssetInventoryService.instance) {
      AssetInventoryService.instance = new AssetInventoryService();
    }
    return AssetInventoryService.instance;
  }

  /**
   * Perform full asset discovery for a device
   */
  async performAssetDiscovery(deviceId: string): Promise<AssetInventory> {
    try {
      console.log(`Starting asset discovery for device: ${deviceId}`);
      
      const [hardware, software] = await Promise.all([
        this.discoverHardware(),
        this.discoverSoftware()
      ]);

      const hostname = await this.getHostname();
      
      const inventory: AssetInventory = {
        deviceId,
        hostname,
        lastScanned: new Date().toISOString(),
        hardware,
        software,
        changes: await this.detectChanges(deviceId, { hardware, software })
      };

      // Cache the inventory
      this.inventoryCache.set(deviceId, inventory);
      
      // Persist to storage
      await this.saveInventory(inventory);

      console.log(`Asset discovery completed for device: ${deviceId}`);
      return inventory;
    } catch (error) {
      console.error(`Asset discovery failed for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Discover hardware information using WMI
   */
  private async discoverHardware(): Promise<HardwareInfo> {
    const [cpu, memory, storage, network, motherboard] = await Promise.all([
      this.getCPUInfo(),
      this.getMemoryInfo(),
      this.getStorageInfo(),
      this.getNetworkInfo(),
      this.getMotherboardInfo()
    ]);

    return {
      cpu,
      memory,
      storage,
      network,
      motherboard
    };
  }

  /**
   * Discover software information
   */
  private async discoverSoftware(): Promise<SoftwareInfo> {
    const [os, installedApps, services, drivers] = await Promise.all([
      this.getOSInfo(),
      this.getInstalledApplications(),
      this.getWindowsServices(),
      this.getDrivers()
    ]);

    return {
      os,
      installedApps,
      services,
      drivers
    };
  }

  /**
   * Get CPU information via WMI
   */
  private async getCPUInfo(): Promise<HardwareInfo['cpu']> {
    try {
      const { stdout } = await execAsync(`
        powershell -Command "
        Get-WmiObject -Class Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed, Architecture | ConvertTo-Json
        "
      `);
      
      const cpuData = JSON.parse(stdout);
      const cpu = Array.isArray(cpuData) ? cpuData[0] : cpuData;
      
      return {
        name: cpu.Name?.trim() || 'Unknown',
        cores: cpu.NumberOfCores || 0,
        threads: cpu.NumberOfLogicalProcessors || 0,
        maxClockSpeed: cpu.MaxClockSpeed || 0,
        architecture: this.getArchitectureString(cpu.Architecture)
      };
    } catch (error) {
      console.error('Failed to get CPU info:', error);
      return {
        name: 'Unknown',
        cores: 0,
        threads: 0,
        maxClockSpeed: 0,
        architecture: 'Unknown'
      };
    }
  }

  /**
   * Get memory information via WMI
   */
  private async getMemoryInfo(): Promise<HardwareInfo['memory']> {
    try {
      const { stdout } = await execAsync(`
        powershell -Command "
        $totalMem = (Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory;
        $availMem = (Get-WmiObject -Class Win32_OperatingSystem).AvailablePhysicalMemory;
        $modules = Get-WmiObject -Class Win32_PhysicalMemory | Select-Object Capacity, Speed, MemoryType, Manufacturer;
        @{
          TotalBytes = $totalMem;
          AvailableBytes = $availMem;
          Modules = $modules
        } | ConvertTo-Json -Depth 3
        "
      `);
      
      const memData = JSON.parse(stdout);
      
      return {
        totalGB: Math.round((memData.TotalBytes || 0) / (1024 * 1024 * 1024)),
        availableGB: Math.round((memData.AvailableBytes || 0) / (1024 * 1024 * 1024)),
        modules: (memData.Modules || []).map((module: any) => ({
          capacity: Math.round((module.Capacity || 0) / (1024 * 1024 * 1024)),
          speed: module.Speed || 0,
          type: this.getMemoryTypeString(module.MemoryType),
          manufacturer: module.Manufacturer?.trim() || 'Unknown'
        }))
      };
    } catch (error) {
      console.error('Failed to get memory info:', error);
      return {
        totalGB: 0,
        availableGB: 0,
        modules: []
      };
    }
  }

  /**
   * Get storage information via WMI
   */
  private async getStorageInfo(): Promise<StorageDevice[]> {
    try {
      const { stdout } = await execAsync(`
        powershell -Command "
        Get-WmiObject -Class Win32_DiskDrive | Select-Object Model, Size, MediaType, SerialNumber | ConvertTo-Json
        "
      `);
      
      const storageData = JSON.parse(stdout);
      const drives = Array.isArray(storageData) ? storageData : [storageData];
      
      return drives.map((drive: any) => ({
        model: drive.Model?.trim() || 'Unknown',
        size: Math.round((drive.Size || 0) / (1024 * 1024 * 1024)),
        type: this.getStorageType(drive.MediaType),
        health: 'Unknown', // Would need SMART data for real health
        serialNumber: drive.SerialNumber?.trim() || 'Unknown'
      }));
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return [];
    }
  }

  /**
   * Get network adapter information
   */
  private async getNetworkInfo(): Promise<NetworkAdapter[]> {
    try {
      const { stdout } = await execAsync(`
        powershell -Command "
        Get-WmiObject -Class Win32_NetworkAdapter | Where-Object {$_.NetConnectionStatus -eq 2} | Select-Object Name, MACAddress, Speed, AdapterType | ConvertTo-Json
        "
      `);
      
      const networkData = JSON.parse(stdout);
      const adapters = Array.isArray(networkData) ? networkData : [networkData];
      
      return adapters.map((adapter: any) => ({
        name: adapter.Name?.trim() || 'Unknown',
        macAddress: adapter.MACAddress || 'Unknown',
        ipAddress: 'Unknown', // Would need additional query for IP
        speed: adapter.Speed || 0,
        type: adapter.AdapterType || 'Unknown'
      }));
    } catch (error) {
      console.error('Failed to get network info:', error);
      return [];
    }
  }

  /**
   * Get motherboard information
   */
  private async getMotherboardInfo(): Promise<HardwareInfo['motherboard']> {
    try {
      const { stdout } = await execAsync(`
        powershell -Command "
        Get-WmiObject -Class Win32_BaseBoard | Select-Object Manufacturer, Product, SerialNumber | ConvertTo-Json
        "
      `);
      
      const mbData = JSON.parse(stdout);
      const mb = Array.isArray(mbData) ? mbData[0] : mbData;
      
      return {
        manufacturer: mb.Manufacturer?.trim() || 'Unknown',
        model: mb.Product?.trim() || 'Unknown',
        serialNumber: mb.SerialNumber?.trim() || 'Unknown'
      };
    } catch (error) {
      console.error('Failed to get motherboard info:', error);
      return {
        manufacturer: 'Unknown',
        model: 'Unknown',
        serialNumber: 'Unknown'
      };
    }
  }

  /**
   * Get operating system information
   */
  private async getOSInfo(): Promise<SoftwareInfo['os']> {
    try {
      const { stdout } = await execAsync(`
        powershell -Command "
        Get-WmiObject -Class Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, OSArchitecture, InstallDate | ConvertTo-Json
        "
      `);
      
      const osData = JSON.parse(stdout);
      
      return {
        name: osData.Caption?.trim() || 'Unknown',
        version: osData.Version || 'Unknown',
        buildNumber: osData.BuildNumber || 'Unknown',
        architecture: osData.OSArchitecture || 'Unknown',
        installDate: osData.InstallDate ? this.convertWMIDate(osData.InstallDate) : 'Unknown'
      };
    } catch (error) {
      console.error('Failed to get OS info:', error);
      return {
        name: 'Unknown',
        version: 'Unknown',
        buildNumber: 'Unknown',
        architecture: 'Unknown',
        installDate: 'Unknown'
      };
    }
  }

  /**
   * Get installed applications from registry
   */
  private async getInstalledApplications(): Promise<Application[]> {
    try {
      const { stdout } = await execAsync(`
        powershell -Command "
        Get-ItemProperty 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' | 
        Where-Object {$_.DisplayName -and $_.DisplayName -ne ''} | 
        Select-Object DisplayName, DisplayVersion, Publisher, InstallDate, InstallLocation, EstimatedSize | 
        ConvertTo-Json
        "
      `);
      
      const appsData = JSON.parse(stdout);
      const apps = Array.isArray(appsData) ? appsData : [appsData];
      
      return apps.map((app: any) => ({
        name: app.DisplayName?.trim() || 'Unknown',
        version: app.DisplayVersion?.trim() || 'Unknown',
        publisher: app.Publisher?.trim() || 'Unknown',
        installDate: app.InstallDate ? this.formatInstallDate(app.InstallDate) : 'Unknown',
        installLocation: app.InstallLocation?.trim() || 'Unknown',
        size: app.EstimatedSize ? Math.round(app.EstimatedSize / 1024) : undefined // Convert to MB
      }));
    } catch (error) {
      console.error('Failed to get installed applications:', error);
      return [];
    }
  }

  /**
   * Get Windows services
   */
  private async getWindowsServices(): Promise<WindowsService[]> {
    try {
      const { stdout } = await execAsync(`
        powershell -Command "
        Get-Service | Select-Object Name, DisplayName, Status, StartType, @{Name='PathName';Expression={(Get-WmiObject -Class Win32_Service -Filter \\\"Name='$($_.Name)'\\\").PathName}} | ConvertTo-Json
        "
      `);
      
      const servicesData = JSON.parse(stdout);
      const services = Array.isArray(servicesData) ? servicesData : [servicesData];
      
      return services.slice(0, 100).map((service: any) => ({ // Limit to first 100 services
        name: service.Name || 'Unknown',
        displayName: service.DisplayName || 'Unknown',
        status: service.Status || 'Unknown',
        startType: service.StartType || 'Unknown',
        pathName: service.PathName || 'Unknown'
      }));
    } catch (error) {
      console.error('Failed to get Windows services:', error);
      return [];
    }
  }

  /**
   * Get system drivers
   */
  private async getDrivers(): Promise<Driver[]> {
    try {
      const { stdout } = await execAsync(`
        powershell -Command "
        Get-WmiObject -Class Win32_PnPSignedDriver | Select-Object DeviceName, DriverVersion, DriverDate, DriverProviderName, IsSigned | ConvertTo-Json
        "
      `);
      
      const driversData = JSON.parse(stdout);
      const drivers = Array.isArray(driversData) ? driversData : [driversData];
      
      return drivers.slice(0, 50).map((driver: any) => ({ // Limit to first 50 drivers
        name: driver.DeviceName?.trim() || 'Unknown',
        version: driver.DriverVersion || 'Unknown',
        date: driver.DriverDate ? this.convertWMIDate(driver.DriverDate) : 'Unknown',
        provider: driver.DriverProviderName?.trim() || 'Unknown',
        signed: Boolean(driver.IsSigned)
      }));
    } catch (error) {
      console.error('Failed to get drivers:', error);
      return [];
    }
  }

  /**
   * Detect changes by comparing with previous inventory
   */
  private async detectChanges(deviceId: string, currentInventory: { hardware: HardwareInfo; software: SoftwareInfo }): Promise<ChangeEvent[]> {
    try {
      const previousInventory = await this.loadPreviousInventory(deviceId);
      if (!previousInventory) {
        return [{
          timestamp: new Date().toISOString(),
          type: 'config_changed',
          description: 'Initial inventory scan',
          details: { reason: 'first_scan' }
        }];
      }

      const changes: ChangeEvent[] = [];

      // Compare installed applications
      const prevApps = new Set(previousInventory.software.installedApps.map(app => `${app.name}:${app.version}`));
      const currentApps = new Set(currentInventory.software.installedApps.map(app => `${app.name}:${app.version}`));

      // New applications
      for (const app of currentInventory.software.installedApps) {
        const appKey = `${app.name}:${app.version}`;
        if (!prevApps.has(appKey)) {
          changes.push({
            timestamp: new Date().toISOString(),
            type: 'software_installed',
            description: `New application installed: ${app.name} v${app.version}`,
            details: app
          });
        }
      }

      // Removed applications
      for (const app of previousInventory.software.installedApps) {
        const appKey = `${app.name}:${app.version}`;
        if (!currentApps.has(appKey)) {
          changes.push({
            timestamp: new Date().toISOString(),
            type: 'software_removed',
            description: `Application removed: ${app.name} v${app.version}`,
            details: app
          });
        }
      }

      // Hardware changes (basic comparison)
      if (previousInventory.hardware.memory.totalGB !== currentInventory.hardware.memory.totalGB) {
        changes.push({
          timestamp: new Date().toISOString(),
          type: 'hardware_added',
          description: `Memory change detected: ${previousInventory.hardware.memory.totalGB}GB → ${currentInventory.hardware.memory.totalGB}GB`,
          details: {
            previous: previousInventory.hardware.memory.totalGB,
            current: currentInventory.hardware.memory.totalGB
          }
        });
      }

      return changes;
    } catch (error) {
      console.error('Failed to detect changes:', error);
      return [];
    }
  }

  /**
   * Get hostname
   */
  private async getHostname(): Promise<string> {
    try {
      const { stdout } = await execAsync('hostname');
      return stdout.trim();
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Save inventory to file
   */
  private async saveInventory(inventory: AssetInventory): Promise<void> {
    try {
      const inventoryDir = path.join(process.cwd(), 'data', 'inventory');
      await fs.mkdir(inventoryDir, { recursive: true });
      
      const filePath = path.join(inventoryDir, `${inventory.deviceId}.json`);
      await fs.writeFile(filePath, JSON.stringify(inventory, null, 2));
    } catch (error) {
      console.error('Failed to save inventory:', error);
    }
  }

  /**
   * Load previous inventory from file
   */
  private async loadPreviousInventory(deviceId: string): Promise<AssetInventory | null> {
    try {
      const filePath = path.join(process.cwd(), 'data', 'inventory', `${deviceId}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get cached inventory
   */
  getInventory(deviceId: string): AssetInventory | undefined {
    return this.inventoryCache.get(deviceId);
  }

  /**
   * Get all cached inventories
   */
  getAllInventories(): AssetInventory[] {
    return Array.from(this.inventoryCache.values());
  }

  // Helper methods
  private getArchitectureString(arch: number): string {
    const architectures: { [key: number]: string } = {
      0: 'x86',
      1: 'MIPS',
      2: 'Alpha',
      3: 'PowerPC',
      6: 'ia64',
      9: 'x64'
    };
    return architectures[arch] || 'Unknown';
  }

  private getMemoryTypeString(type: number): string {
    const types: { [key: number]: string } = {
      20: 'DDR',
      21: 'DDR2',
      22: 'DDR2 FB-DIMM',
      24: 'DDR3',
      26: 'DDR4'
    };
    return types[type] || 'Unknown';
  }

  private getStorageType(mediaType: string): 'HDD' | 'SSD' | 'Unknown' {
    if (!mediaType) return 'Unknown';
    const type = mediaType.toLowerCase();
    if (type.includes('ssd') || type.includes('solid')) return 'SSD';
    if (type.includes('hard') || type.includes('fixed')) return 'HDD';
    return 'Unknown';
  }

  private convertWMIDate(wmiDate: string): string {
    try {
      // WMI dates are in format: 20210115123045.000000-480
      const year = wmiDate.substr(0, 4);
      const month = wmiDate.substr(4, 2);
      const day = wmiDate.substr(6, 2);
      return `${year}-${month}-${day}`;
    } catch {
      return 'Unknown';
    }
  }

  private formatInstallDate(installDate: string): string {
    try {
      // Registry install dates are in format: 20210115
      if (installDate.length === 8) {
        const year = installDate.substr(0, 4);
        const month = installDate.substr(4, 2);
        const day = installDate.substr(6, 2);
        return `${year}-${month}-${day}`;
      }
      return installDate;
    } catch {
      return 'Unknown';
    }
  }
}
