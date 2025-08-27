import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';

interface CustomDrawerContentProps {
  navigation: any;
  state: any;
  descriptors: any;
  onLogout: () => void;
}

const CustomDrawerContent: React.FC<CustomDrawerContentProps> = (props) => {
  const { navigation, onLogout } = props;

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: onLogout
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="account-tree" size={40} color="#4a90e2" />
            <Text style={styles.appName}>SAMS Mobile</Text>
            <Text style={styles.appVersion}>v1.0.0</Text>
          </View>
          <View style={styles.userInfo}>
            <MaterialIcons name="account-circle" size={24} color="#7f8c8d" />
            <Text style={styles.userName}>Administrator</Text>
          </View>
        </View>
        
        <View style={styles.menuItems}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="#e74c3c" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 10,
  },
  appVersion: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 10,
    fontWeight: '500',
  },
  menuItems: {
    flex: 1,
    paddingTop: 10,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  logoutText: {
    fontSize: 16,
    color: '#e74c3c',
    marginLeft: 15,
    fontWeight: '500',
  },
});

export default CustomDrawerContent;
