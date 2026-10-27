import React from 'react';

// If a page fails while it is drawn, show what went wrong instead of an empty screen.
// The message is also written to the browser console (F12) with the place where it happened.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('This page failed to show:', error, info && info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="error-page" role="alert">
        <h3>This page could not be shown</h3>
        <p>Something went wrong while opening it. Your data is safe.</p>
        <code>{String((error && error.message) || error)}</code>
        <div className="row-actions">
          <button type="button" onClick={() => this.setState({ error: null })}>Try again</button>
          <button type="button" className="primary" onClick={() => window.location.reload()}>Reload the page</button>
        </div>
      </div>
    );
  }
}