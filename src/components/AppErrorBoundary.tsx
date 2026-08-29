import React from 'react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Erro inesperado ao carregar a aplicação.',
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('[ATLETA AI] Erro de renderização:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl border border-rose-500/30 bg-[#0f0f12] p-6 shadow-2xl">
          <h1 className="text-xl font-black text-white">ATLETA AI não conseguiu carregar</h1>
          <p className="mt-2 text-sm text-zinc-400">
            O aplicativo encontrou um erro de inicialização. Recarregue a página para tentar novamente.
          </p>
          <details className="mt-4 rounded-xl bg-black/30 p-3 text-xs text-zinc-500">
            <summary className="cursor-pointer text-zinc-400">Detalhes técnicos</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.message}</pre>
          </details>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500"
          >
            Recarregar aplicativo
          </button>
        </div>
      </div>
    );
  }
}
