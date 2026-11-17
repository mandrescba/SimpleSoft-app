import type { ReactNode } from 'react'

export const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500'

/** Etiqueta + control. */
export function Campo({ label, children, error, className = '' }: { label: string; children: ReactNode; error?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function Mensaje({ tipo, children }: { tipo: 'error' | 'ok' | 'aviso'; children: ReactNode }) {
  const cls = tipo === 'error' ? 'text-red-600 bg-red-50 border-red-200' : tipo === 'ok' ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'
  return <p className={`text-sm border rounded-lg px-3 py-2 ${cls}`}>{children}</p>
}

export function BotonPrimario({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={`bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors ${p.className ?? ''}`}>{children}</button>
}

export function BotonSecundario({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={`border border-gray-300 hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors ${p.className ?? ''}`}>{children}</button>
}
