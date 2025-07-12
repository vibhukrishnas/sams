import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerItem, DrawerContentComponentProps } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../src/store';
import { logout } from '../src/store/slices/authSlice';

const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => dispatch(logout()) }
      ]
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Icon name="account-circle" size={64} color="#2196F3" />
        <Text style={styles.appTitle}>SAMS</Text>
        <Text style={styles.userInfo}>{user?.name || 'Admin User'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
      </View>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Settings"
        icon={({ color, size }) => <Icon name="settings" size={size} color={color} />}
        onPress={() => props.navigation.navigate('Settings')}
      />
      <DrawerItem
        label="About"
        icon={({ color, size }) => <Icon name="info" size={size} color={color} />}
        onPress={() => props.navigation.navigate('About')}
      />
      <DrawerItem
        label="Logout"
        icon={({ color, size }) => <Icon name="logout" size={size} color={color} />}
        onPress={handleLogout}
      />
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 8,
  },
  userInfo: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
});

export default CustomDrawerContent;
