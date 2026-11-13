import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Result } from 'antd';
import { storageService } from '../services/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('UKM React ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      storageService.resetToSeed();
    } catch (e) {
      console.error('Reset error', e);
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200">
            <Result
              status="warning"
              title="UKM Workspace Encountered an Issue"
              subTitle={
                <div className="text-left space-y-2 mt-4 text-xs text-gray-600">
                  <p className="font-semibold text-red-600">
                    {this.state.error?.message || 'An unexpected rendering error occurred.'}
                  </p>
                  <p className="text-gray-500">
                    This may happen if cached local data from an earlier schema version is present. Click below to restore initial seed data.
                  </p>
                </div>
              }
              extra={[
                <Button
                  key="reset"
                  type="primary"
                  danger
                  onClick={this.handleReset}
                  className="!h-9 font-semibold"
                >
                  Reset Demo Data & Reload
                </Button>,
                <Button
                  key="reload"
                  onClick={() => window.location.reload()}
                  className="!h-9"
                >
                  Reload Page
                </Button>,
              ]}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
