/**
 * ⚡ Execute Commands Module
 * Secure remote command execution across servers with advanced features
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

interface CommandHistory {
  id: string;
  command: string;
  server: string;
  timestamp: Date;
  output: string;
  status: 'success' | 'error' | 'running';
  executionTime: number;
  user: string;
  category: string;
}

interface CommandTemplate {
  id: string;
  name: string;
  description: string;
  command: string;
  category: 'system' | 'maintenance' | 'monitoring' | 'security';
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'select';
    required: boolean;
    options?: string[];
    placeholder?: string;
  }>;
  requiresApproval: boolean;
  allowedRoles: string[];
}

interface CommandPermission {
  command: string;
  allowed: boolean;
  requiresApproval: boolean;
  roles: string[];
}

interface Server {
  id: string;
  name: string;
  hostname: string;
  status: 'online' | 'offline' | 'maintenance';
  osType: string;
}

const ExecuteCommandsScreen: React.FC = () => {
  const [selectedServer, setSelectedServer] = useState('web01');
  const [selectedServers, setSelectedServers] = useState<string[]>(['web01']);
  const [command, setCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'execute' | 'templates' | 'history' | 'scheduled'>('execute');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CommandTemplate | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [commandSuggestions, setCommandSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [multiServerMode, setMultiServerMode] = useState(false);

  const commandInputRef = useRef<TextInput>(null);

  // Available servers
  const [servers] = useState<Server[]>([
    { id: 'web01', name: 'Web Server 01', hostname: 'web01.company.com', status: 'online', osType: 'Ubuntu' },
    { id: 'web02', name: 'Web Server 02', hostname: 'web02.company.com', status: 'online', osType: 'Ubuntu' },
    { id: 'db01', name: 'Database Server', hostname: 'db01.company.com', status: 'online', osType: 'CentOS' },
    { id: 'app01', name: 'App Server 01', hostname: 'app01.company.com', status: 'maintenance', osType: 'Ubuntu' },
    { id: 'lb01', name: 'Load Balancer', hostname: 'lb01.company.com', status: 'offline', osType: 'Ubuntu' },
  ]);

  // Command history with enhanced data
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([
    {
      id: '1',
      command: 'systemctl status nginx',
      server: 'Web Server 01',
      timestamp: new Date(Date.now() - 300000),
      output: '● nginx.service - A high performance web server\n   Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)\n   Active: active (running) since Mon 2024-01-15 10:30:25 UTC; 2h 15min ago\n     Docs: man:nginx(8)\n Main PID: 1234 (nginx)\n    Tasks: 5 (limit: 4915)\n   Memory: 12.5M\n   CGroup: /system.slice/nginx.service\n           ├─1234 nginx: master process /usr/sbin/nginx -g daemon on; master_process on;\n           ├─1235 nginx: worker process\n           ├─1236 nginx: worker process\n           ├─1237 nginx: worker process\n           └─1238 nginx: worker process',
      status: 'success',
      executionTime: 0.245,
      user: 'admin',
      category: 'system'
    },
    {
      id: '2',
      command: 'df -h',
      server: 'Database Server',
      timestamp: new Date(Date.now() - 600000),
      output: 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        20G   15G  4.2G  79% /\n/dev/sda2       100G   45G   50G  48% /var\n/dev/sda3        50G   12G   35G  26% /home\ntmpfs           2.0G     0  2.0G   0% /dev/shm',
      status: 'success',
      executionTime: 0.156,
      user: 'admin',
      category: 'monitoring'
    },
    {
      id: '3',
      command: 'top -n 1 -b',
      server: 'App Server 01',
      timestamp: new Date(Date.now() - 900000),
      output: 'top - 12:45:30 up 15 days,  3:22,  2 users,  load average: 0.45, 0.52, 0.48\nTasks: 156 total,   1 running, 155 sleeping,   0 stopped,   0 zombie\n%Cpu(s):  2.3 us,  1.1 sy,  0.0 ni, 96.4 id,  0.2 wa,  0.0 hi,  0.0 si,  0.0 st\nMiB Mem :   3951.2 total,    245.8 free,   1456.7 used,   2248.7 buff/cache\nMiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   2234.2 avail Mem',
      status: 'success',
      executionTime: 1.023,
      user: 'admin',
      category: 'monitoring'
    },
    {
      id: '4',
      command: 'invalid-command',
      server: 'Web Server 01',
      timestamp: new Date(Date.now() - 1200000),
      output: 'bash: invalid-command: command not found',
      status: 'error',
      executionTime: 0.001,
      user: 'admin',
      category: 'system'
    }
  ]);

  // Command templates
  const [commandTemplates] = useState<CommandTemplate[]>([
    {
      id: '1',
      name: 'System Health Check',
      description: 'Comprehensive system health analysis',
      command: 'echo "=== System Health Check ===" && uptime && echo "" && df -h && echo "" && free -h && echo "" && ps aux --sort=-%cpu | head -10',
      category: 'system',
      parameters: [],
      requiresApproval: false,
      allowedRoles: ['admin', 'operator']
    },
    {
      id: '2',
      name: 'Service Management',
      description: 'Start, stop, restart, or check service status',
      command: 'systemctl {{action}} {{service}}',
      category: 'system',
      parameters: [
        { name: 'action', type: 'select', required: true, options: ['start', 'stop', 'restart', 'status', 'enable', 'disable'] },
        { name: 'service', type: 'string', required: true, placeholder: 'e.g., nginx, apache2, mysql' }
      ],
      requiresApproval: true,
      allowedRoles: ['admin']
    },
    {
      id: '3',
      name: 'Log Analysis',
      description: 'Analyze log files with grep patterns',
      command: 'tail -n {{lines}} {{logfile}} | grep "{{pattern}}"',
      category: 'monitoring',
      parameters: [
        { name: 'logfile', type: 'select', required: true, options: ['/var/log/syslog', '/var/log/nginx/access.log', '/var/log/nginx/error.log', '/var/log/auth.log'] },
        { name: 'pattern', type: 'string', required: true, placeholder: 'Search pattern' },
        { name: 'lines', type: 'number', required: false, placeholder: '100' }
      ],
      requiresApproval: false,
      allowedRoles: ['admin', 'operator', 'viewer']
    },
    {
      id: '4',
      name: 'Disk Cleanup',
      description: 'Clean temporary files and logs',
      command: 'find /tmp -type f -atime +7 -delete && find /var/log -name "*.log" -type f -size +100M -exec truncate -s 0 {} \\;',
      category: 'maintenance',
      parameters: [],
      requiresApproval: true,
      allowedRoles: ['admin']
    },
    {
      id: '5',
      name: 'Network Connectivity Test',
      description: 'Test network connectivity to specified host',
      command: 'ping -c {{count}} {{host}} && traceroute {{host}}',
      category: 'monitoring',
      parameters: [
        { name: 'host', type: 'string', required: true, placeholder: 'hostname or IP' },
        { name: 'count', type: 'number', required: false, placeholder: '4' }
      ],
      requiresApproval: false,
      allowedRoles: ['admin', 'operator', 'viewer']
    },
    {
      id: '6',
      name: 'Package Management',
      description: 'Install, update, or remove packages',
      command: 'apt {{action}} {{package}}',
      category: 'maintenance',
      parameters: [
        { name: 'action', type: 'select', required: true, options: ['install', 'remove', 'update', 'upgrade', 'search'] },
        { name: 'package', type: 'string', required: false, placeholder: 'package name' }
      ],
      requiresApproval: true,
      allowedRoles: ['admin']
    },
    {
      id: '7',
      name: 'Security Audit',
      description: 'Basic security audit checks',
      command: 'echo "=== Security Audit ===" && last -n 10 && echo "" && netstat -tuln | grep LISTEN && echo "" && ps aux | grep -E "(ssh|ftp|telnet)"',
      category: 'security',
      parameters: [],
      requiresApproval: false,
      allowedRoles: ['admin', 'security']
    },
    {
      id: '8',
      name: 'Database Health Check',
      description: 'Check database connectivity and status',
      command: 'systemctl status {{dbservice}} && {{dbclient}} -e "SELECT 1;" 2>/dev/null && echo "Database connection: OK" || echo "Database connection: FAILED"',
      category: 'monitoring',
      parameters: [
        { name: 'dbservice', type: 'select', required: true, options: ['mysql', 'postgresql', 'mongodb'] },
        { name: 'dbclient', type: 'select', required: true, options: ['mysql', 'psql', 'mongo'] }
      ],
      requiresApproval: false,
      allowedRoles: ['admin', 'dba', 'operator']
    }
  ]);

  // Command permissions and security
  const [commandPermissions] = useState<CommandPermission[]>([
    { command: 'rm', allowed: false, requiresApproval: true, roles: ['admin'] },
    { command: 'sudo', allowed: true, requiresApproval: true, roles: ['admin'] },
    { command: 'reboot', allowed: true, requiresApproval: true, roles: ['admin'] },
    { command: 'shutdown', allowed: true, requiresApproval: true, roles: ['admin'] },
    { command: 'systemctl', allowed: true, requiresApproval: true, roles: ['admin', 'operator'] },
    { command: 'service', allowed: true, requiresApproval: true, roles: ['admin', 'operator'] },
    { command: 'ps', allowed: true, requiresApproval: false, roles: ['admin', 'operator', 'viewer'] },
    { command: 'top', allowed: true, requiresApproval: false, roles: ['admin', 'operator', 'viewer'] },
    { command: 'df', allowed: true, requiresApproval: false, roles: ['admin', 'operator', 'viewer'] },
    { command: 'free', allowed: true, requiresApproval: false, roles: ['admin', 'operator', 'viewer'] },
    { command: 'netstat', allowed: true, requiresApproval: false, roles: ['admin', 'operator', 'viewer'] },
    { command: 'ping', allowed: true, requiresApproval: false, roles: ['admin', 'operator', 'viewer'] },
  ]);

  // Common command suggestions
  const commonCommands = [
    'systemctl status nginx',
    'df -h',
    'free -h',
    'ps aux',
    'netstat -tuln',
    'uptime',
    'top -n 1 -b',
    'tail -f /var/log/syslog',
    'grep -i error /var/log/nginx/error.log',
    'find /var/log -name "*.log" -mtime -1',
    'du -sh /var/log/*',
    'lsof -i :80',
    'ss -tuln',
    'journalctl -u nginx -n 50',
    'cat /proc/meminfo',
    'iostat -x 1 5'
  ];

  // Auto-complete functionality
  useEffect(() => {
    if (command.length > 2) {
      const suggestions = commonCommands.filter(cmd =>
        cmd.toLowerCase().includes(command.toLowerCase())
      ).slice(0, 5);
      setCommandSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [command]);

  const checkCommandPermissions = (cmd: string): { allowed: boolean; requiresApproval: boolean } => {
    const cmdWord = cmd.split(' ')[0];
    const permission = commandPermissions.find(p => p.command === cmdWord);

    if (!permission) {
      // Default: allow basic commands, require approval for unknown commands
      return { allowed: true, requiresApproval: true };
    }

    return { allowed: permission.allowed, requiresApproval: permission.requiresApproval };
  };

  const executeCommand = async (cmdToExecute: string = command, servers: string[] = [selectedServer]) => {
    if (!cmdToExecute.trim()) {
      Alert.alert('Error', 'Please enter a command');
      return;
    }

    const permissions = checkCommandPermissions(cmdToExecute);

    if (!permissions.allowed) {
      Alert.alert('Permission Denied', 'This command is not allowed.');
      return;
    }

    if (permissions.requiresApproval) {
      setShowApprovalModal(true);
      return;
    }

    await performCommandExecution(cmdToExecute, servers);
  };

  const performCommandExecution = async (cmdToExecute: string, servers: string[]) => {
    setIsExecuting(true);

    // Simulate command execution with realistic timing
    const executionTime = Math.random() * 2 + 0.5; // 0.5-2.5 seconds

    setTimeout(() => {
      servers.forEach((serverId, index) => {
        const server = servers.find(s => s.id === serverId);
        const serverName = server?.name || serverId;

        setTimeout(() => {
          const newCommand: CommandHistory = {
            id: `${Date.now()}-${index}`,
            command: cmdToExecute.trim(),
            server: serverName,
            timestamp: new Date(),
            output: generateCommandOutput(cmdToExecute, serverName),
            status: Math.random() > 0.1 ? 'success' : 'error', // 90% success rate
            executionTime: executionTime,
            user: 'admin',
            category: getCategoryFromCommand(cmdToExecute)
          };

          setCommandHistory(prev => [newCommand, ...prev]);
        }, index * 200); // Stagger multi-server execution
      });

      setCommand('');
      setIsExecuting(false);
    }, executionTime * 1000);
  };

  const generateCommandOutput = (cmd: string, serverName: string): string => {
    const cmdWord = cmd.split(' ')[0];

    switch (cmdWord) {
      case 'systemctl':
        return `● service.service - Service Description\n   Loaded: loaded\n   Active: active (running) since ${new Date().toLocaleString()}\n   Main PID: ${Math.floor(Math.random() * 10000)}\n   Memory: ${Math.floor(Math.random() * 100)}M`;

      case 'df':
        return `Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        20G   ${Math.floor(Math.random() * 15 + 5)}G  ${Math.floor(Math.random() * 10 + 2)}G  ${Math.floor(Math.random() * 30 + 50)}% /\n/dev/sda2       100G   ${Math.floor(Math.random() * 50 + 20)}G   ${Math.floor(Math.random() * 40 + 30)}G  ${Math.floor(Math.random() * 20 + 40)}% /var`;

      case 'free':
        return `              total        used        free      shared  buff/cache   available\nMem:        ${Math.floor(Math.random() * 4000 + 2000)}        ${Math.floor(Math.random() * 2000 + 500)}         ${Math.floor(Math.random() * 1000 + 200)}          ${Math.floor(Math.random() * 100)}        ${Math.floor(Math.random() * 500 + 200)}        ${Math.floor(Math.random() * 1500 + 500)}\nSwap:       ${Math.floor(Math.random() * 2000 + 1000)}           0        ${Math.floor(Math.random() * 2000 + 1000)}`;

      case 'ps':
        return `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1 225868  9876 ?        Ss   Jan15   0:02 /sbin/init\nroot       123  0.1  0.5 123456 12345 ?        S    Jan15   0:15 nginx: master process\nwww-data   456  0.0  0.3  98765  6789 ?        S    Jan15   0:05 nginx: worker process`;

      case 'uptime':
        return `${new Date().toLocaleTimeString()} up ${Math.floor(Math.random() * 30 + 1)} days, ${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}, ${Math.floor(Math.random() * 5 + 1)} users, load average: ${(Math.random() * 2).toFixed(2)}, ${(Math.random() * 2).toFixed(2)}, ${(Math.random() * 2).toFixed(2)}`;

      case 'ping':
        const host = cmd.split(' ').find(arg => !arg.startsWith('-')) || 'google.com';
        return `PING ${host} (8.8.8.8) 56(84) bytes of data.\n64 bytes from ${host}: icmp_seq=1 ttl=64 time=${(Math.random() * 50 + 10).toFixed(1)} ms\n64 bytes from ${host}: icmp_seq=2 ttl=64 time=${(Math.random() * 50 + 10).toFixed(1)} ms\n--- ${host} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss`;

      default:
        return `Command executed successfully on ${serverName}\nOutput: ${cmd}\nExecution completed at ${new Date().toLocaleString()}`;
    }
  };

  const getCategoryFromCommand = (cmd: string): string => {
    const cmdWord = cmd.split(' ')[0];

    if (['systemctl', 'service', 'ps', 'kill'].includes(cmdWord)) return 'system';
    if (['df', 'free', 'top', 'netstat', 'ping', 'uptime'].includes(cmdWord)) return 'monitoring';
    if (['apt', 'yum', 'find', 'rm', 'cp', 'mv'].includes(cmdWord)) return 'maintenance';
    if (['grep', 'tail', 'head', 'cat'].includes(cmdWord)) return 'monitoring';

    return 'system';
  };

  const handleTemplateSelect = (template: CommandTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateModal(true);
  };

  const applyTemplate = (template: CommandTemplate, parameters: Record<string, string>) => {
    let finalCommand = template.command;

    // Replace parameters in template
    Object.entries(parameters).forEach(([key, value]) => {
      finalCommand = finalCommand.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    setCommand(finalCommand);
    setShowTemplateModal(false);
  };

  const toggleFavorite = (cmd: string) => {
    setFavorites(prev =>
      prev.includes(cmd)
        ? prev.filter(f => f !== cmd)
        : [...prev, cmd]
    );
  };

  const handleServerSelection = (serverId: string) => {
    if (multiServerMode) {
      setSelectedServers(prev =>
        prev.includes(serverId)
          ? prev.filter(id => id !== serverId)
          : [...prev, serverId]
      );
    } else {
      setSelectedServer(serverId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': case 'online': return '#00FF88';
      case 'error': case 'offline': return '#FF3366';
      case 'running': case 'maintenance': return '#FFA500';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return 'check-circle';
      case 'error': return 'error';
      case 'running': return 'hourglass-empty';
      case 'online': return 'check-circle';
      case 'offline': return 'error';
      case 'maintenance': return 'build';
      default: return 'help';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'system': return '#00FF88';
      case 'monitoring': return '#00BFFF';
      case 'maintenance': return '#FFA500';
      case 'security': return '#FF3366';
      default: return '#666';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system': return 'settings';
      case 'monitoring': return 'visibility';
      case 'maintenance': return 'build';
      case 'security': return 'security';
      default: return 'code';
    }
  };

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: 'execute', label: 'Execute', icon: 'play-arrow' },
            { key: 'templates', label: 'Templates', icon: 'library-books' },
            { key: 'history', label: 'History', icon: 'history' },
            { key: 'scheduled', label: 'Scheduled', icon: 'schedule' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Icon name={tab.icon} size={18} color={activeTab === tab.key ? "#000" : "#FFF"} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'execute' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Server Selection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Target Servers</Text>
                <TouchableOpacity
                  style={[styles.multiServerToggle, multiServerMode && styles.multiServerToggleActive]}
                  onPress={() => setMultiServerMode(!multiServerMode)}
                >
                  <Icon name="dns" size={16} color={multiServerMode ? "#000" : "#00FF88"} />
                  <Text style={[styles.multiServerText, multiServerMode && styles.multiServerTextActive]}>
                    Multi-Server
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.serverTabs}>
                  {servers.map((server) => (
                    <TouchableOpacity
                      key={server.id}
                      style={[
                        styles.serverTab,
                        (multiServerMode ? selectedServers.includes(server.id) : selectedServer === server.id) && styles.serverTabActive,
                        server.status !== 'online' && styles.serverTabDisabled
                      ]}
                      onPress={() => handleServerSelection(server.id)}
                      disabled={server.status === 'offline'}
                    >
                      <Icon
                        name={getStatusIcon(server.status)}
                        size={14}
                        color={getStatusColor(server.status)}
                      />
                      <Text style={[
                        styles.serverTabText,
                        (multiServerMode ? selectedServers.includes(server.id) : selectedServer === server.id) && styles.serverTabTextActive
                      ]}>
                        {server.name}
                      </Text>
                      <Text style={styles.serverTabSubtext}>{server.osType}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {multiServerMode && selectedServers.length > 0 && (
                <Text style={styles.selectedServersText}>
                  {selectedServers.length} server(s) selected
                </Text>
              )}
            </View>

            {/* Command Input with Auto-completion */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Command Builder</Text>
              <View style={styles.commandInputContainer}>
                <View style={styles.commandInputWrapper}>
                  <TextInput
                    ref={commandInputRef}
                    style={styles.commandInput}
                    placeholder="Enter command or use templates..."
                    placeholderTextColor="#666"
                    value={command}
                    onChangeText={setCommand}
                    multiline
                    editable={!isExecuting}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {command && (
                    <TouchableOpacity
                      style={styles.favoriteButton}
                      onPress={() => toggleFavorite(command)}
                    >
                      <Icon
                        name={favorites.includes(command) ? "favorite" : "favorite-border"}
                        size={20}
                        color={favorites.includes(command) ? "#FF3366" : "#666"}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Auto-completion suggestions */}
                {showSuggestions && (
                  <View style={styles.suggestionsContainer}>
                    {commandSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => {
                          setCommand(suggestion);
                          setShowSuggestions(false);
                        }}
                      >
                        <Icon name="history" size={16} color="#666" />
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.commandActions}>
                  <TouchableOpacity
                    style={styles.templateButton}
                    onPress={() => setShowTemplateModal(true)}
                  >
                    <Icon name="library-books" size={18} color="#00FF88" />
                    <Text style={styles.templateButtonText}>Templates</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.executeButton, isExecuting && styles.executeButtonDisabled]}
                    onPress={() => executeCommand(command, multiServerMode ? selectedServers : [selectedServer])}
                    disabled={isExecuting || !command.trim()}
                  >
                    <Icon
                      name={isExecuting ? "hourglass-empty" : "play-arrow"}
                      size={20}
                      color={isExecuting || !command.trim() ? "#666" : "#000"}
                    />
                    <Text style={[styles.executeButtonText, (isExecuting || !command.trim()) && styles.executeButtonTextDisabled]}>
                      {isExecuting ? 'Executing...' : multiServerMode ? `Execute on ${selectedServers.length}` : 'Execute'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Quick Commands */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Commands</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.quickCommands}>
                  {commonCommands.slice(0, 8).map((cmd, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.quickCommandButton}
                      onPress={() => setCommand(cmd)}
                      disabled={isExecuting}
                    >
                      <Text style={styles.quickCommandText}>{cmd.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Favorites */}
            {favorites.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Favorite Commands</Text>
                <View style={styles.favoritesContainer}>
                  {favorites.map((fav, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.favoriteItem}
                      onPress={() => setCommand(fav)}
                    >
                      <Icon name="favorite" size={16} color="#FF3366" />
                      <Text style={styles.favoriteText}>{fav}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {activeTab === 'templates' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.templatesGrid}>
              {commandTemplates.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateCard}
                  onPress={() => handleTemplateSelect(template)}
                >
                  <View style={styles.templateHeader}>
                    <Icon
                      name={getCategoryIcon(template.category)}
                      size={20}
                      color={getCategoryColor(template.category)}
                    />
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(template.category) + '20' }]}>
                      <Text style={[styles.categoryText, { color: getCategoryColor(template.category) }]}>
                        {template.category.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateDescription}>{template.description}</Text>

                  <View style={styles.templateFooter}>
                    {template.requiresApproval && (
                      <View style={styles.approvalBadge}>
                        <Icon name="gavel" size={12} color="#FFA500" />
                        <Text style={styles.approvalText}>Requires Approval</Text>
                      </View>
                    )}
                    <Text style={styles.templateRoles}>
                      Roles: {template.allowedRoles.join(', ')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {activeTab === 'history' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

            {commandHistory.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyInfo}>
                    <Icon
                      name={getStatusIcon(item.status)}
                      size={16}
                      color={getStatusColor(item.status)}
                    />
                    <Text style={styles.historyServer}>{item.server}</Text>
                    <Text style={styles.historyTime}>
                      {item.timestamp.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.historyMeta}>
                    <Text style={styles.executionTime}>{item.executionTime.toFixed(3)}s</Text>
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                      <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
                        {item.category}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.historyCommand}
                  onPress={() => setCommand(item.command)}
                >
                  <Text style={styles.historyCommandText}>$ {item.command}</Text>
                  <Icon name="content-copy" size={16} color="#666" />
                </TouchableOpacity>

                <View style={styles.historyOutput}>
                  <Text style={[styles.historyOutputText, { color: getStatusColor(item.status) }]}>
                    {item.output}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {activeTab === 'scheduled' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.emptyState}>
              <Icon name="schedule" size={48} color="#666" />
              <Text style={styles.emptyStateText}>Scheduled Commands</Text>
              <Text style={styles.emptyStateSubtext}>
                Schedule commands to run automatically at specified times
              </Text>
              <TouchableOpacity style={styles.addScheduleButton}>
                <Icon name="add" size={20} color="#000" />
                <Text style={styles.addScheduleText}>Add Schedule</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Template Selection Modal */}
        <Modal
          visible={showTemplateModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowTemplateModal(false)}
        >
          <LinearGradient
            colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowTemplateModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Command Templates</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <ScrollView style={styles.modalContent}>
              {commandTemplates.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.modalTemplateCard}
                  onPress={() => {
                    setCommand(template.command);
                    setShowTemplateModal(false);
                  }}
                >
                  <View style={styles.templateHeader}>
                    <Icon
                      name={getCategoryIcon(template.category)}
                      size={20}
                      color={getCategoryColor(template.category)}
                    />
                    <Text style={styles.templateName}>{template.name}</Text>
                  </View>
                  <Text style={styles.templateDescription}>{template.description}</Text>
                  <Text style={styles.templateCommand}>{template.command}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </LinearGradient>
        </Modal>

        {/* Approval Modal */}
        <Modal
          visible={showApprovalModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowApprovalModal(false)}
        >
          <View style={styles.approvalOverlay}>
            <View style={styles.approvalModal}>
              <Icon name="gavel" size={32} color="#FFA500" />
              <Text style={styles.approvalTitle}>Command Requires Approval</Text>
              <Text style={styles.approvalMessage}>
                This command requires administrator approval before execution.
              </Text>
              <Text style={styles.approvalCommand}>$ {command}</Text>

              <View style={styles.approvalActions}>
                <TouchableOpacity
                  style={styles.approvalCancelButton}
                  onPress={() => setShowApprovalModal(false)}
                >
                  <Text style={styles.approvalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approvalSubmitButton}
                  onPress={() => {
                    setShowApprovalModal(false);
                    Alert.alert('Approval Requested', 'Your command has been submitted for approval.');
                  }}
                >
                  <Text style={styles.approvalSubmitText}>Request Approval</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#00FF88',
  },
  tabText: {
    color: '#FFF',
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  multiServerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  multiServerToggleActive: {
    backgroundColor: '#00FF88',
  },
  multiServerText: {
    color: '#00FF88',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  multiServerTextActive: {
    color: '#000',
  },
  serverTabs: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  serverTab: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    minWidth: 100,
  },
  serverTabActive: {
    backgroundColor: '#00FF88',
    borderColor: '#00FF88',
  },
  serverTabDisabled: {
    opacity: 0.5,
  },
  serverTabText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  serverTabTextActive: {
    color: '#000',
  },
  serverTabSubtext: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
  },
  selectedServersText: {
    color: '#00FF88',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  commandInputContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  commandInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commandInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'monospace',
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  favoriteButton: {
    padding: 8,
    marginLeft: 8,
  },
  suggestionsContainer: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 150,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  suggestionText: {
    color: '#FFF',
    marginLeft: 8,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  commandActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  templateButtonText: {
    color: '#00FF88',
    marginLeft: 6,
    fontWeight: '600',
  },
  executeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF88',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  executeButtonDisabled: {
    backgroundColor: '#333',
  },
  executeButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  executeButtonTextDisabled: {
    color: '#666',
  },
  quickCommands: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  quickCommandButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  quickCommandText: {
    color: '#00FF88',
    fontSize: 12,
    fontWeight: '600',
  },
  favoritesContainer: {
    gap: 8,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 8,
  },
  favoriteText: {
    color: '#FFF',
    marginLeft: 8,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  templatesGrid: {
    padding: 16,
    gap: 12,
  },
  templateCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#00FF88',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    marginLeft: 8,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1A0A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  approvalText: {
    color: '#FFA500',
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '600',
  },
  templateRoles: {
    fontSize: 10,
    color: '#666',
  },
  historyItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyServer: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  historyTime: {
    color: '#666',
    fontSize: 11,
    marginLeft: 12,
  },
  executionTime: {
    color: '#00FF88',
    fontSize: 11,
    fontWeight: '600',
  },
  historyCommand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyCommandText: {
    color: '#00FF88',
    fontSize: 13,
    fontFamily: 'monospace',
    flex: 1,
  },
  historyOutput: {
    backgroundColor: '#0A0A0A',
    padding: 12,
    borderRadius: 8,
    maxHeight: 150,
  },
  historyOutputText: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  addScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00FF88',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  addScheduleText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalTemplateCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  templateCommand: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
    marginTop: 8,
  },
  approvalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 32,
  },
  approvalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  approvalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  approvalCommand: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#00FF88',
    backgroundColor: '#0A0A0A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  approvalCancelButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  approvalCancelText: {
    color: '#FFF',
    fontWeight: '600',
  },
  approvalSubmitButton: {
    backgroundColor: '#00FF88',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  approvalSubmitText: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default ExecuteCommandsScreen;
