import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const [session, setSession] = useState(null)
  const [userInput, setUserInput] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)

  // Control de sesión activa
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)

    // Formatear el usuario ingresado para mapearlo a @sistema.local
    const cleanUser = userInput.trim().toLowerCase().replace(/\s+/g, '')
    const formattedEmail = cleanUser.includes('@') ? cleanUser : `${cleanUser}@sistema.local`

    const { error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password,
    })

    if (error) {
      setLoginError('Usuario o contraseña incorrectos')
    }
    setLoginLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // 1. Pantalla de Login (Si no hay sesión iniciada)
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 mb-4 border border-blue-500/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Recepción de Avisos</h1>
            <p className="text-slate-400 text-sm mt-1">Delegación Contravencional</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center font-medium">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Usuario</label>
              <input
                type="text"
                required
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ejemplo: delegadacontravencional"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 font-semibold text-white rounded-lg shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              {loginLoading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // 2. Interfaz Principal (Solo visible tras autenticarse)
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-bold text-white">Recepción de Avisos Municipales</h1>
          <p className="text-xs text-slate-400">Usuario activo: {session.user.email.replace('@sistema.local', '')}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-slate-700 hover:bg-red-600/80 hover:text-white text-slate-300 text-sm font-medium rounded-lg transition"
        >
          Cerrar Sesión
        </button>
      </header>

      {/* AQUÍ VA EL CONTENIDO/COMPONENTE DE TU FORMULARIO Y TABLA DE AVISOS */}
      <main className="p-6 max-w-7xl mx-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <p className="text-emerald-400 font-semibold text-lg">¡Sesión iniciada con éxito!</p>
          <p className="text-slate-300 text-sm mt-1">El sistema ya está completamente protegido.</p>
        </div>
      </main>
    </div>
  )
}