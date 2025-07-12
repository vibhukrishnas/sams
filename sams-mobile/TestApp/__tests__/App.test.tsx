/**
 * 🧪 SAMS Mobile App Tests
 * Test suite for the main mobile application
 * @format
 */

import 'react-native';
import React from 'react';
import App from '../App';

// Note: import explicitly to use the types shipped with jest.
import {it, describe, expect} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

describe('SAMS Mobile App', () => {
  it('renders correctly', () => {
    const tree = renderer.create(<App />);
    expect(tree).toBeTruthy();
  });

  it('creates app instance without crashing', () => {
    expect(() => {
      renderer.create(<App />);
    }).not.toThrow();
  });

  it('has proper component structure', () => {
    const tree = renderer.create(<App />);
    const instance = tree.getInstance();
    expect(instance).toBeTruthy();
  });
});
