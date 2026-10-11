import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const ThrowError: React.FC<{ message: string }> = ({ message }) => {
  throw new Error(message);
};

describe('ErrorBoundary Component', () => {
  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal Chocolate Component</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal Chocolate Component')).toBeInTheDocument();
  });

  it('catches render errors and displays fallback UI', () => {
    // Suppress console.error during expected throw
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError message="Unexpected broken chocolate render" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Unexpected broken chocolate render')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Home/i })).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
