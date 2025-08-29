import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface RemoteActionResult {
  success: boolean;
  message: string;
  output?: string;
  error?: string;
  timestamp: string;
  duration?: number;
}

export interface PowerAction {
  type: 'restart' | 'shutdown' | 'sleep' | 'hibernate';
  delay?: number; // in seconds
  force?: boolean;
  message?: string;
}

export interface ProcessAction {
  type: 'start' | 'stop' | 'restart' | 'kill';
  processName: string;
  arguments?: string[];
}

export interface ScriptExecution {
  scriptPath?: string;
  scriptContent?: string;
  type: 'powershell' | 'batch' | 'python' | 'nodejs';
  arguments?: string[];
  workingDirectory?: string;
  timeout?: number; // in milliseconds
}

export interface FileTransfer {
  type: 'upload' | 'download';
  localPath: string;
  remotePath: string;
  overwrite?: boolean;
}

export interface ServiceAction {
  serviceName: string;
  action: 'start' | 'stop' | 'restart' | 'status';
}

export interface RegistryAction {
  action: 'read' | 'write' | 'delete';
  keyPath: string;
  valueName?: string;
  value?: string;
  valueType?: 'string' | 'dword' | 'binary';
}

export class RemoteActionsService {
  private static instance: RemoteActionsService;
  private actionHistory: Map<string, RemoteActionResult[]> = new Map();

  public static getInstance(): RemoteActionsService {
    if (!RemoteActionsService.instance) {
      RemoteActionsService.instance = new RemoteActionsService();
    }
    return RemoteActionsService.instance;
  }

  /**
   * Execute power management actions
   */
  async executePowerAction(deviceId: string, action: PowerAction): Promise<RemoteActionResult> {
    const startTime = Date.now();
    console.log(`Executing power action ${action.type} on device: ${deviceId}`);

    try {
      let command = '';
      
      switch (action.type) {
        case 'restart':
          command = `shutdown /r ${action.delay ? `/t ${action.delay}` : '/t 0'} ${action.force ? '/f' : ''} ${action.message ? `/c "${action.message}"` : ''}`;
          break;
        case 'shutdown':
          command = `shutdown /s ${action.delay ? `/t ${action.delay}` : '/t 0'} ${action.force ? '/f' : ''} ${action.message ? `/c "${action.message}"` : ''}`;
          break;
        case 'sleep':
          command = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0';
          break;
        case 'hibernate':
          command = 'rundll32.exe powrprof.dll,SetSuspendState 1,1,0';
          break;
        default:
          throw new Error(`Unknown power action: ${action.type}`);
      }

      const { stdout, stderr } = await execAsync(command);
      
      const result: RemoteActionResult = {
        success: true,
        message: `Power action ${action.type} executed successfully`,
        output: stdout,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      this.addToHistory(deviceId, result);
      return result;
    } catch (error) {
      const result: RemoteActionResult = {
        success: false,
        message: `Failed to execute power action ${action.type}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      this.addToHistory(deviceId, result);
      return result;
    }
  }

  /**
   * Execute process management actions
   */
  async executeProcessAction(deviceId: string, action: ProcessAction): Promise<RemoteActionResult> {
    const startTime = Date.now();
    console.log(`Executing process action ${action.type} for ${action.processName} on device: ${deviceId}`);

    try {
      let command = '';
      
      switch (action.type) {
        case 'start':
          command = `start "${action.processName}" ${action.arguments?.join(' ') || ''}`;
          break;
        case 'stop':
          command = `taskkill /im "${action.processName}" /f`;
          break;
        case 'kill':
          command = `taskkill /im "${action.processName}" /f /t`;
          break;
        case 'restart':
          // First kill, then start
          await execAsync(`taskkill /im "${action.processName}" /f`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          command = `start "${action.processName}" ${action.arguments?.join(' ') || ''}`;
          break;
        default:
          throw new Error(`Unknown process action: ${action.type}`);
      }

      const { stdout, stderr } = await execAsync(command);
      
      const result: RemoteActionResult = {
        success: true,
        message: `Process action ${action.type} for ${action.processName} executed successfully`,
        output: stdout,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      this.addToHistory(deviceId, result);
      return result;
    } catch (error) {
      const result: RemoteActionResult = {
        success: false,
        message: `Failed to execute process action ${action.type} for ${action.processName}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      this.addToHistory(deviceId, result);
      return result;
    }
  }

  /**
   * Execute scripts remotely
   */
  async executeScript(deviceId: string, script: ScriptExecution): Promise<RemoteActionResult> {
    const startTime = Date.now();
    console.log(`Executing ${script.type} script on device: ${deviceId}`);

    try {
      let command = '';
      let tempFilePath = '';

      // If script content is provided, create a temporary file
      if (script.scriptContent) {
        const tempDir = path.join(process.cwd(), 'temp');
        await fs.mkdir(tempDir, { recursive: true });
        
        const extension = this.getScriptExtension(script.type);
        tempFilePath = path.join(tempDir, `temp_script_${Date.now()}${extension}`);
        
        await fs.writeFile(tempFilePath, script.scriptContent);
        script.scriptPath = tempFilePath;
      }

      if (!script.scriptPath) {
        throw new Error('Script path or content must be provided');
      }

      // Build command based on script type
      switch (script.type) {
        case 'powershell':
          command = `powershell -ExecutionPolicy Bypass -File "${script.scriptPath}" ${script.arguments?.join(' ') || ''}`;
          break;
        case 'batch':
          command = `"${script.scriptPath}" ${script.arguments?.join(' ') || ''}`;
          break;
        case 'python':
          command = `python "${script.scriptPath}" ${script.arguments?.join(' ') || ''}`;
          break;
        case 'nodejs':
          command = `node "${script.scriptPath}" ${script.arguments?.join(' ') || ''}`;
          break;
        default:
          throw new Error(`Unsupported script type: ${script.type}`);
      }

      // Set working directory if specified
      const options: any = {};
      if (script.workingDirectory) {
        options.cwd = script.workingDirectory;
      }

      // Execute with timeout
      const timeoutMs = script.timeout || 30000; // Default 30 seconds
      const { stdout, stderr } = await this.execWithTimeout(command, timeoutMs, options);

      // Clean up temporary file
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temporary script file:', cleanupError);
        }
      }

      const result: RemoteActionResult = {
        success: true,
        message: `Script executed successfully`,
        output: stdout,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      this.addToHistory(deviceId, result);
      return result;
    } catch (error) {
      const result: RemoteActionResult = {
        success: false,
        message: `Failed to execute script`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      this.addToHistory(deviceId, result);
      return result;
    }
  }

  /**
   * Execute Windows service actions
   */
  async executeServiceAction(deviceId: string, action: ServiceAction): Promise<RemoteActionResult> {
    const startTime = Date.now();
    console.log(`Executing service action ${action.action} for ${action.serviceName} on device: ${deviceId}`);

    try {
      let command = '';
      
      switch (action.action) {
        case 'start':
          command = `sc start "${action.serviceName}"`;
          break;
        case 'stop':
          command = `sc stop "${action.serviceName}"`;
          break;
        case 'restart':
          // Stop then start
          await execAsync(`sc stop "${action.serviceName}"`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          command = `sc start "${action.serviceName}"`;
          break;
        case 'status':
          command = `sc query "${action.serviceName}"`;
          break;
        default:
          throw new Error(`Unknown service action: ${action.action}`);
      }

      const { stdout, stderr } = await execAsync(command);
      
      const result: RemoteActionResult = {
        success: true,
        message: `Service action ${action.action} for ${action.serviceName} executed successfully`,
        output: stdout,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      this.addToHistory(deviceId, result);
      return result;
    } catch (error) {
      const result: RemoteActionResult = {
        success: false,
        message: `Failed to execute service action ${action.action} for ${action.serviceName}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      this.addToHistory(deviceId, result);
      return result;
    }
  }

  /**
   * Execute file transfer operations
   */
  async executeFileTransfer(deviceId: string, transfer: FileTransfer): Promise<RemoteActionResult> {
    const startTime = Date.now();
    console.log(`Executing file transfer ${transfer.type} on device: ${deviceId}`);

    try {
      let command = '';
      
      if (transfer.type === 'upload') {
        // For local file operations, use copy command
        command = `copy "${transfer.localPath}" "${transfer.remotePath}" ${transfer.overwrite ? '/Y' : ''}`;
      } else if (transfer.type === 'download') {
        command = `copy "${transfer.remotePath}" "${transfer.localPath}" ${transfer.overwrite ? '/Y' : ''}`;
      } else {
        throw new Error(`Unknown transfer type: ${transfer.type}`);
      }

      const { stdout, stderr } = await execAsync(command);
      
      const result: RemoteActionResult = {
        success: true,
        message: `File transfer ${transfer.type} completed successfully`,
        output: stdout,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      this.addToHistory(deviceId, result);
      return result;
    } catch (error) {
      const result: RemoteActionResult = {
        success: false,
        message: `Failed to execute file transfer ${transfer.type}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      this.addToHistory(deviceId, result);
      return result;
    }
  }

  /**
   * Execute registry operations
   */
  async executeRegistryAction(deviceId: string, action: RegistryAction): Promise<RemoteActionResult> {
    const startTime = Date.now();
    console.log(`Executing registry action ${action.action} on device: ${deviceId}`);

    try {
      let command = '';
      
      switch (action.action) {
        case 'read':
          command = `reg query "${action.keyPath}" ${action.valueName ? `/v "${action.valueName}"` : ''}`;
          break;
        case 'write':
          if (!action.valueName || action.value === undefined) {
            throw new Error('Value name and value are required for write operations');
          }
          const regType = action.valueType === 'dword' ? 'REG_DWORD' : 
                         action.valueType === 'binary' ? 'REG_BINARY' : 'REG_SZ';
          command = `reg add "${action.keyPath}" /v "${action.valueName}" /t ${regType} /d "${action.value}" /f`;
          break;
        case 'delete':
          command = `reg delete "${action.keyPath}" ${action.valueName ? `/v "${action.valueName}"` : ''} /f`;
          break;
        default:
          throw new Error(`Unknown registry action: ${action.action}`);
      }

      const { stdout, stderr } = await execAsync(command);
      
      const result: RemoteActionResult = {
        success: true,
        message: `Registry action ${action.action} executed successfully`,
        output: stdout,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      this.addToHistory(deviceId, result);
      return result;
    } catch (error) {
      const result: RemoteActionResult = {
        success: false,
        message: `Failed to execute registry action ${action.action}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      this.addToHistory(deviceId, result);
      return result;
    }
  }

  /**
   * Get action history for a device
   */
  getActionHistory(deviceId: string): RemoteActionResult[] {
    return this.actionHistory.get(deviceId) || [];
  }

  /**
   * Get all action history
   */
  getAllActionHistory(): { [deviceId: string]: RemoteActionResult[] } {
    const result: { [deviceId: string]: RemoteActionResult[] } = {};
    for (const [deviceId, history] of this.actionHistory.entries()) {
      result[deviceId] = history;
    }
    return result;
  }

  /**
   * Clear action history for a device
   */
  clearActionHistory(deviceId: string): void {
    this.actionHistory.delete(deviceId);
  }

  // Private helper methods

  private addToHistory(deviceId: string, result: RemoteActionResult): void {
    if (!this.actionHistory.has(deviceId)) {
      this.actionHistory.set(deviceId, []);
    }
    
    const history = this.actionHistory.get(deviceId)!;
    history.push(result);
    
    // Keep only last 100 actions
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  private getScriptExtension(type: string): string {
    switch (type) {
      case 'powershell': return '.ps1';
      case 'batch': return '.bat';
      case 'python': return '.py';
      case 'nodejs': return '.js';
      default: return '.txt';
    }
  }

  private async execWithTimeout(command: string, timeoutMs: number, options: any = {}): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn('cmd', ['/c', command], {
        ...options,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }
}
