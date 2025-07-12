import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { setTheme } from '../store/slices/uiSlice';
import { getTheme } from '../theme';

const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const isDark = useAppSelector(state => state.ui.theme === 'dark');
  const theme = getTheme(isDark);

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
          onPress: () => {
            dispatch(logout());
          },
        },
      ],
    );
  };

  const toggleTheme = () => {
    dispatch(setTheme(isDark ? 'light' : 'dark'));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Icon name="account-circle" size={60} color={theme.colors.white} />
          </View>
          <Text style={[styles.userName, { color: theme.colors.white }]}>
            {user?.username || 'Admin User'}
          </Text>
          <Text style={[styles.userEmail, { color: theme.colors.white }]}>
            {user?.email || 'admin@sams.com'}
          </Text>
        </View>
      </LinearGradient>

      {/* Menu Items */}
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.drawerContent}
        showsVerticalScrollIndicator={false}
      >
        <DrawerItemList {...props} />
        
        {/* Custom Items */}
        <DrawerItem
          label="Theme"
          icon={({ color, size }) => (
            <Icon 
              name={isDark ? 'light-mode' : 'dark-mode'} 
              size={size} 
              color={color} 
            />
          )}
          onPress={toggleTheme}
          labelStyle={{ color: theme.colors.text }}
          activeTintColor={theme.colors.primary}
          inactiveTintColor={theme.colors.textSecondary}
        />
        
        <DrawerItem
          label="Help & Support"
          icon={({ color, size }) => (
            <Icon name="help" size={size} color={color} />
          )}
          onPress={() => {
            // Navigate to help screen or open support
            Alert.alert('Help & Support', 'Contact support at support@sams.com');
          }}
          labelStyle={{ color: theme.colors.text }}
          activeTintColor={theme.colors.primary}
          inactiveTintColor={theme.colors.textSecondary}
        />
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.colors.error }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Icon name="logout" size={20} color={theme.colors.white} />
          <Text style={[styles.logoutText, { color: theme.colors.white }]}>
            Logout
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
          SAMS v2.0.0
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.8,
  },
  drawerContent: {
    paddingTop: 10,
  },
  footer: {
    borderTopWidth: 1,
    padding: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
  },
});

export default CustomDrawerContent;
