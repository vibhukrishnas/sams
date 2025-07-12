import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { logout } from '../slices/authSlice';
import AuthenticationService from '../../services/AuthenticationService';

/**
 * Authentication middleware to handle token expiration and automatic logout
 */
export const authMiddleware: Middleware<{}, RootState> = (store) => (next) => async (action) => {
  // Process the action first
  const result = next(action);
  
  // Check for authentication-related actions
  if (action.type.includes('auth/')) {
    const state = store.getState();
    
    // Handle token expiration
    if (state.auth.token) {
      const isTokenValid = await AuthenticationService.isTokenValid();
      
      if (!isTokenValid) {
        console.log('🔒 Token expired, logging out user');
        store.dispatch(logout());
        await AuthenticationService.logout();
      }
    }
  }
  
  // Handle API errors that indicate authentication issues
  if (action.type.includes('rejected') && action.payload?.status === 401) {
    console.log('🔒 Unauthorized API response, logging out user');
    store.dispatch(logout());
    await AuthenticationService.logout();
  }
  
  return result;
};
