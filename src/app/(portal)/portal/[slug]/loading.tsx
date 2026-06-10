export default function PortalLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-40 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
          <div className="flex justify-center">
            <div className="w-36 h-36 rounded-full bg-white/5 animate-pulse" />
          </div>
          <div className="bg-white/3 border border-white/8 rounded-xl p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-white/10 animate-pulse shrink-0" />
                <div className="h-4 bg-white/10 rounded animate-pulse" style={{ width: `${60 + i * 8}%` }} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
