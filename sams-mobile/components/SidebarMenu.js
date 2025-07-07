import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAuth} from '../context/AuthContext';

const SidebarMenu = ({navigation, state}) => {
  const {user, logout} = useAuth();

  const menuItems = [
    {
      name: 'DashboardHome',
      title: 'Dashboard',
      icon: 'dashboard',
      color: '#1e3a8a',
    },
    {
      name: 'ServerManagement',
      title: 'Server Management',
      icon: 'dns',
      color: '#059669',
    },
    {
      name: 'InfraHealth',
      title: 'Infra Health Dashboard',
      icon: 'monitor-heart',
      color: '#dc2626',
    },
    {
      name: 'ExecuteCommands',
      title: 'Execute Commands',
      icon: 'terminal',
      color: '#7c3aed',
    },
    {
      name: 'Reports',
      title: 'Reports / Stored Queries',
      icon: 'assessment',
      color: '#ea580c',
    },
    {
      name: 'Alerts',
      title: 'Alerts & Notifications',
      icon: 'notifications-active',
      color: '#be185d',
    },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.navigate('Login');
          },
        },
      ],
    );
  };

  const handleNavigation = (routeName) => {
    if (routeName === 'Logout') {
      handleLogout();
    } else {
      navigation.navigate(routeName);
    }
  };

  const renderMenuItem = (item) => {
    const isActive = state.index === state.routes.findIndex(route => route.name === item.name);
    
    return (
      <TouchableOpacity
        key={item.name}
        style={[styles.menuItem, isActive && styles.activeMenuItem]}
        onPress={() => handleNavigation(item.name)}>
        <View style={[styles.iconContainer, {backgroundColor: item.color}]}>
          <Icon name={item.icon} size={24} color="#ffffff" />
        </View>
        <Text style={[styles.menuText, isActive && styles.activeMenuText]}>
          {item.title}
        </Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Icon name="security" size={32} color="#ffffff" />
          <Text style={styles.logoText}>SAMS</Text>
        </View>
        <Text style={styles.subtitle}>Server Alert Management System</Text>
      </View>

      {/* User Profile */}
      <View style={styles.userSection}>
        <View style={styles.avatarContainer}>
          <Icon name="person" size={32} color="#1e3a8a" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name || 'Administrator'}</Text>
          <Text style={styles.userRole}>{user?.role || 'admin'}</Text>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        {menuItems.map(renderMenuItem)}
        
        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}>
          <View style={styles.logoutIconContainer}>
            <Icon name="logout" size={24} color="#ffffff" />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Version 1.0.0</Text>
        <Text style={styles.footerText}>© 2024 SAMS</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#1e3a8a',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#93c5fd',
    marginLeft: 44,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 12,
    position: 'relative',
  },
  activeMenuItem: {
    backgroundColor: '#eff6ff',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  activeMenuText: {
    color: '#1e3a8a',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    right: 16,
    width: 4,
    height: 20,
    backgroundColor: '#1e3a8a',
    borderRadius: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoutText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
});

export default SidebarMenu; 