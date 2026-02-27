import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          backgroundColor: '#FEF3C7',
          minHeight: '100vh',
          fontFamily: 'monospace'
        }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#dc2626', marginBottom: '20px' }}>
            ⚠️ Component Error Detected
          </h1>
          <div style={{ 
            backgroundColor: '#fef2f2', 
            border: '4px solid #000', 
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Error Message:</h2>
            <pre style={{ 
              fontSize: '14px', 
              overflow: 'auto',
              backgroundColor: '#fff',
              padding: '10px',
              border: '2px solid #000'
            }}>
              {this.state.error?.toString()}
            </pre>
          </div>
          <div style={{ 
            backgroundColor: '#fef2f2', 
            border: '4px solid #000', 
            padding: '20px'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Stack Trace:</h2>
            <pre style={{ 
              fontSize: '12px', 
              overflow: 'auto',
              backgroundColor: '#fff',
              padding: '10px',
              border: '2px solid #000'
            }}>
              {this.state.error?.stack}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
