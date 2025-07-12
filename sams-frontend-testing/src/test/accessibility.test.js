/**
 * 🧪 Accessibility Tests
 * Comprehensive accessibility testing for SAMS Frontend
 */

import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import App from '../components/App';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  test('App component should not have accessibility violations', async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('should have proper heading hierarchy', () => {
    const { container } = render(<App />);
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    // Check that we have headings
    expect(headings.length).toBeGreaterThan(0);
    
    // Check that first heading is h1
    expect(headings[0].tagName).toBe('H1');
  });

  test('should have proper semantic landmarks', () => {
    const { container } = render(<App />);
    
    // Check for header landmark
    expect(container.querySelector('header')).toBeInTheDocument();
    
    // Check for main landmark
    expect(container.querySelector('main')).toBeInTheDocument();
  });

  test('should have proper list structure', () => {
    const { container } = render(<App />);
    const lists = container.querySelectorAll('ul, ol');
    
    lists.forEach(list => {
      const listItems = list.querySelectorAll('li');
      expect(listItems.length).toBeGreaterThan(0);
    });
  });
});
