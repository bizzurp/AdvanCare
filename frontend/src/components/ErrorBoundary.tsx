import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="screen-body no-header stack gap-16" role="alert">
        <h1 className="t-h2">Something went wrong.</h1>
        <p className="t-body t-muted">Your saved requests are safe on this device. Please reload the app.</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          Reload AdvanCare
        </button>
      </div>
    );
  }
}
