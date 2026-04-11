'use client'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-4">
        <h1 className="text-4xl font-bold text-foreground">Erro inesperado</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          Ocorreu um problema ao processar sua solicitacao. Tente novamente ou contate o suporte.
        </p>
        <button
          onClick={reset}
          className="inline-block px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-[4px] hover:bg-gray-800 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
