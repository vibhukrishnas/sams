import AsyncStorage from '@react-native-async-storage/async-storage';

class CommandService {
  constructor() {
    this.commandHistory = [];
    this.commandTemplates = [
      {
        id: '1',
        name: 'Check Server Status',
        command: 'systemctl status',
        description: 'Check the status of system services',
        category: 'system'
      },
      {
        id: '2',
        name: 'Check Disk Usage',
        command: 'df -h',
        description: 'Display disk space usage',
        category: 'storage'
      },
      {
        id: '3',
        name: 'Check Memory Usage',
        command: 'free -h',
        description: 'Display memory usage information',
        category: 'memory'
      },
      {
        id: '4',
        name: 'Check CPU Load',
        command: 'top -n 1',
        description: 'Display CPU and process information',
        category: 'cpu'
      },
      {
        id: '5',
        name: 'Check Network Connections',
        command: 'netstat -tuln',
        description: 'Display active network connections',
        category: 'network'
      },
      {
        id: '6',
        name: 'Check System Logs',
        command: 'journalctl --since "1 hour ago"',
        description: 'Display recent system logs',
        category: 'logs'
      },
      {
        id: '7',
        name: 'Restart Service',
        command: 'systemctl restart {service_name}',
        description: 'Restart a specific service',
        category: 'maintenance',
        requiresParams: true
      },
      {
        id: '8',
        name: 'Check Process Status',
        command: 'ps aux | grep {process_name}',
        description: 'Check if a specific process is running',
        category: 'processes',
        requiresParams: true
      }
    ];
  }

  /**
   * Execute a command on a server
   * @param {string} serverId - Server identifier
   * @param {string} command - Command to execute
   * @param {object} options - Execution options
   * @returns {Promise<{success: boolean, output: string, error?: string, executionTime: number}>}
   */
  async executeCommand(serverId, command, options = {}) {
    const startTime = Date.now();
    
    try {
      // Simulate command execution (in real app, this would connect to server)
      const result = await this.simulateCommandExecution(serverId, command, options);
      
      const executionTime = Date.now() - startTime;
      
      // Save to command history
      const historyEntry = {
        id: Date.now().toString(),
        serverId,
        command,
        output: result.output,
        error: result.error,
        executionTime,
        timestamp: new Date().toISOString(),
        status: result.success ? 'success' : 'error'
      };
      
      this.commandHistory.unshift(historyEntry);
      await this.saveCommandHistory();
      
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        executionTime
      };
    } catch (error) {
      console.error('CommandService executeCommand error:', error);
      return {
        success: false,
        output: '',
        error: 'Command execution failed',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Simulate command execution (mock implementation)
   * @param {string} serverId - Server identifier
   * @param {string} command - Command to execute
   * @param {object} options - Execution options
   * @returns {Promise<{success: boolean, output: string, error?: string}>}
   */
  async simulateCommandExecution(serverId, command, options) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Mock responses based on command
    const commandLower = command.toLowerCase();
    
    if (commandLower.includes('systemctl status')) {
      return {
        success: true,
        output: `● systemd - The init system for Linux
   Loaded: loaded (/lib/systemd/system/systemd; vendor preset: enabled)
   Active: active (running) since Mon 2024-01-15 10:30:00 UTC; 2h 30min ago
     Docs: man:systemd(1)
 Main PID: 1 (systemd)
    Tasks: 234 (limit: 4915)
   Memory: 23.4M
   CGroup: /system.slice/systemd
           ├─1 /lib/systemd/systemd --system --deserialize 33
           ├─2 [kthreadd]
           └─3 [ksoftirqd/0]`
      };
    } else if (commandLower.includes('df -h')) {
      return {
        success: true,
        output: `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        20G   12G  7.2G  62% /
tmpfs           3.2G     0  3.2G   0% /dev/shm
/dev/sdb1       100G   45G   50G  47% /data`
      };
    } else if (commandLower.includes('free -h')) {
      return {
        success: true,
        output: `              total        used        free      shared  buff/cache   available
Mem:           15Gi       8.2Gi       2.1Gi       1.2Gi       4.7Gi       5.8Gi
Swap:         2.0Gi       0.0Gi       2.0Gi`
      };
    } else if (commandLower.includes('top -n 1')) {
      return {
        success: true,
        output: `top - 14:30:00 up 2:30,  1 user,  load average: 0.52, 0.48, 0.45
Tasks: 234 total,   1 running, 233 sleeping,   0 stopped,   0 zombie
%Cpu(s):  2.3 us,  1.2 sy,  0.0 ni, 96.3 id,  0.2 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :  15360.0 total,   8192.0 free,   2048.0 used,   5120.0 buff/cache
MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.  12288.0 avail Mem`
      };
    } else if (commandLower.includes('netstat -tuln')) {
      return {
        success: true,
        output: `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN
tcp6       0      0 :::22                   :::*                    LISTEN`
      };
    } else if (commandLower.includes('journalctl')) {
      return {
        success: true,
        output: `-- Logs begin at Mon 2024-01-15 10:30:00 UTC. --
Jan 15 14:25:00 server1 systemd[1]: Started Daily apt download activities.
Jan 15 14:25:01 server1 systemd[1]: Reloading.
Jan 15 14:26:00 server1 systemd[1]: Started Daily apt download activities.
Jan 15 14:27:00 server1 systemd[1]: Started Daily apt download activities.`
      };
    } else if (commandLower.includes('systemctl restart')) {
      return {
        success: true,
        output: `Service restarted successfully`
      };
    } else if (commandLower.includes('ps aux')) {
      return {
        success: true,
        output: `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1 225940  9168 ?        Ss   10:30   0:01 /lib/systemd/systemd --system --deserialize 33
root         2  0.0  0.0      0     0 ?        S    10:30   0:00 [kthreadd]
root         3  0.0  0.0      0     0 ?        I<   10:30   0:00 [ksoftirqd/0]`
      };
    } else {
      // Generic command response
      return {
        success: true,
        output: `Command executed successfully on server ${serverId}\nOutput: ${command}`
      };
    }
  }

  /**
   * Get command history
   * @param {number} limit - Number of entries to return
   * @returns {Array}
   */
  getCommandHistory(limit = 50) {
    return this.commandHistory.slice(0, limit);
  }

  /**
   * Get command templates
   * @param {string} category - Filter by category
   * @returns {Array}
   */
  getCommandTemplates(category = null) {
    if (category) {
      return this.commandTemplates.filter(template => template.category === category);
    }
    return this.commandTemplates;
  }

  /**
   * Get command template by ID
   * @param {string} templateId - Template ID
   * @returns {object|null}
   */
  getCommandTemplate(templateId) {
    return this.commandTemplates.find(template => template.id === templateId) || null;
  }

  /**
   * Add custom command template
   * @param {object} template - Command template object
   * @returns {Promise<boolean>}
   */
  async addCommandTemplate(template) {
    try {
      const newTemplate = {
        id: Date.now().toString(),
        ...template,
        timestamp: new Date().toISOString()
      };
      
      this.commandTemplates.push(newTemplate);
      await this.saveCommandTemplates();
      return true;
    } catch (error) {
      console.error('CommandService addCommandTemplate error:', error);
      return false;
    }
  }

  /**
   * Delete command template
   * @param {string} templateId - Template ID to delete
   * @returns {Promise<boolean>}
   */
  async deleteCommandTemplate(templateId) {
    try {
      this.commandTemplates = this.commandTemplates.filter(template => template.id !== templateId);
      await this.saveCommandTemplates();
      return true;
    } catch (error) {
      console.error('CommandService deleteCommandTemplate error:', error);
      return false;
    }
  }

  /**
   * Clear command history
   * @returns {Promise<boolean>}
   */
  async clearCommandHistory() {
    try {
      this.commandHistory = [];
      await this.saveCommandHistory();
      return true;
    } catch (error) {
      console.error('CommandService clearCommandHistory error:', error);
      return false;
    }
  }

  /**
   * Get command categories
   * @returns {Array}
   */
  getCommandCategories() {
    const categories = [...new Set(this.commandTemplates.map(template => template.category))];
    return categories.sort();
  }

  /**
   * Save command history to storage
   * @returns {Promise<void>}
   */
  async saveCommandHistory() {
    try {
      await AsyncStorage.setItem('commandHistory', JSON.stringify(this.commandHistory));
    } catch (error) {
      console.error('CommandService saveCommandHistory error:', error);
    }
  }

  /**
   * Load command history from storage
   * @returns {Promise<void>}
   */
  async loadCommandHistory() {
    try {
      const history = await AsyncStorage.getItem('commandHistory');
      if (history) {
        this.commandHistory = JSON.parse(history);
      }
    } catch (error) {
      console.error('CommandService loadCommandHistory error:', error);
    }
  }

  /**
   * Save command templates to storage
   * @returns {Promise<void>}
   */
  async saveCommandTemplates() {
    try {
      await AsyncStorage.setItem('commandTemplates', JSON.stringify(this.commandTemplates));
    } catch (error) {
      console.error('CommandService saveCommandTemplates error:', error);
    }
  }

  /**
   * Load command templates from storage
   * @returns {Promise<void>}
   */
  async loadCommandTemplates() {
    try {
      const templates = await AsyncStorage.getItem('commandTemplates');
      if (templates) {
        this.commandTemplates = JSON.parse(templates);
      }
    } catch (error) {
      console.error('CommandService loadCommandTemplates error:', error);
    }
  }

  /**
   * Initialize command service
   * @returns {Promise<void>}
   */
  async initialize() {
    await this.loadCommandHistory();
    await this.loadCommandTemplates();
  }
}

export default new CommandService(); 