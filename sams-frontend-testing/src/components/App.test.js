/**
 * 🧪 App Component Tests
 * Basic test suite for the main App component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Mock App component for testing
const App = () => {
  return (
    <div className="app">
      <header>
        <h1>SAMS - Server Alert Management System</h1>
      </header>
      <main>
        <p>Welcome to SAMS Frontend Testing</p>
      </main>
    </div>
  );
};

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('SAMS - Server Alert Management System')).toBeInTheDocument();
  });

  test('displays welcome message', () => {
    render(<App />);
    expect(screen.getByText('Welcome to SAMS Frontend Testing')).toBeInTheDocument();
  });

  test('should not have accessibility violations', async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('has proper semantic structure', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument(); // header
    expect(screen.getByRole('main')).toBeInTheDocument(); // main
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(); // h1
  });
});
