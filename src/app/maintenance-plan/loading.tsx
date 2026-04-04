export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    </div>
  )
}
