import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">404</p>
        <h1 className="text-4xl font-bold text-foreground">Pagina nao encontrada</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          A pagina que voce esta procurando nao existe ou foi movida.
        </p>
        <Link
          href="/hub"
          className="inline-block px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-[4px] hover:bg-gray-800 transition-colors"
        >
          Voltar ao inicio
        </Link>
      </div>
    </div>
  )
}
