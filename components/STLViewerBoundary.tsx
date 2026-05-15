'use client';

import { Component, type ReactNode } from 'react';
import STLViewer, { type ViewerSchema } from './STLViewer';

interface Props {
  stlUrl?: string;
  state?: 'idle' | 'generating' | 'ready';
  schema?: ViewerSchema;
}

interface State {
  hasError: boolean;
}

class STLViewerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: 12,
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#020617',
          color: '#94a3b8',
          fontSize: 14,
        }}>
          Não foi possível carregar o visualizador 3D.
        </div>
      );
    }

    return <STLViewer {...this.props} />;
  }
}

export default STLViewerErrorBoundary;
