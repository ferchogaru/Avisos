import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  // Estados de Autenticación
  const [session, setSession] = useState(null)
  const [userInput, setUserInput] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)

  // Estados de tu Aplicación de Avisos
  const [avisos, setAvisos] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  // Búsqueda y Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    dui: '',
    telefono: '',
    direccion: '',
    articulo: '',
    descripcion: '',
  })
  const [archivo, setArchivo] = useState(null)

  // Manejo de Sesión de Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Cargar avisos únicamente si hay sesión activa
  useEffect(() => {
    if (session) {
      fetchAvisos()
    }
  }, [session])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)

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

  const fetchAvisos = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const { data, error } = await supabase
        .from('avisos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error cargando avisos:', error)
        setErrorMessage(`Error al conectar con Supabase: ${error.message}`)
      } else {
        setAvisos(data || [])
      }
    } catch (err) {
      console.error('Error crítico:', err)
      setErrorMessage(`Error inesperado: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.nombre || !formData.dui || !formData.descripcion) {
      alert('Por favor complete los campos obligatorios (*)')
      return
    }

    setUploading(true)
    let archivoUrl = null

    try {
      if (archivo) {
        const fileExt = archivo.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('documentos_avisos')
          .upload(filePath, archivo)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('documentos_avisos')
          .getPublicUrl(filePath)

        archivoUrl = publicUrlData.publicUrl
      }

      const { error: insertError } = await supabase.from('avisos').insert([
        {
          nombre: formData.nombre,
          dui: formData.dui,
          telefono: formData.telefono,
          direccion: formData.direccion,
          articulo: formData.articulo,
          descripcion: formData.descripcion,
          archivo_url: archivoUrl,
          estado: 'Activo',
        },
      ])

      if (insertError) throw insertError

      setFormData({
        nombre: '',
        dui: '',
        telefono: '',
        direccion: '',
        articulo: '',
        descripcion: '',
      })
      setArchivo(null)
      fetchAvisos()
      alert('Aviso guardado con éxito')
    } catch (error) {
      console.error('Error al guardar:', error)
      alert(`Ocurrió un error al guardar: ${error.message || 'Verifica la consola'}`)
    } finally {
      setUploading(false)
    }
  }

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const { error } = await supabase
        .from('avisos')
        .update({ estado: nuevoEstado })
        .eq('id', id)

      if (error) {
        console.error('Error actualizando estado:', error)
        alert(`No se pudo cambiar el estado: ${error.message}`)
      } else {
        fetchAvisos()
      }
    } catch (err) {
      console.error('Error cambiando estado:', err)
    }
  }

  const avisosFiltrados = (avisos || []).filter((aviso) => {
    if (!aviso) return false
    const nombreVal = aviso.nombre ? String(aviso.nombre).toLowerCase() : ''
    const duiVal = aviso.dui ? String(aviso.dui) : ''
    const busquedaVal = (busqueda || '').toLowerCase()

    const coincideTexto = nombreVal.includes(busquedaVal) || duiVal.includes(busquedaVal)
    const coincideEstado = filtroEstado === 'Todos' || aviso.estado === filtroEstado

    return coincideTexto && coincideEstado
  })

  // 1. Pantalla de Login (Si NO hay sesión)
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
            <p className="text-slate-400 text-sm mt-1">Contravencional</p>
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
                placeholder="Ej: delegadacontravencional"
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
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 font-semibold text-white rounded-lg shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {loginLoading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // 2. Tu Interfaz Original Completa (Solo visible al Iniciar Sesión)
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Encabezado con Botón de Cerrar Sesión */}
        <header className="bg-slate-900 text-white p-6 rounded-xl shadow-md flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <h1 className="text-2xl font-bold">Recepción de Avisos Municipales</h1>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Usuario activo: <span className="text-blue-400 font-semibold">{session.user.email.replace('@sistema.local', '')}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition border border-slate-700 cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </header>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="p-4 bg-rose-100 border border-rose-300 text-rose-800 rounded-xl text-sm font-semibold">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Contenido Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Formulario */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold border-b pb-3 mb-4 text-slate-800">
              Registrar Nuevo Aviso
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Nombre de quien deja el aviso"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    DUI *
                  </label>
                  <input
                    type="text"
                    name="dui"
                    placeholder="00000000-0"
                    value={formData.dui}
                    onChange={handleInputChange}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    placeholder="7000-0000"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  name="direccion"
                  placeholder="Dirección del hecho o del solicitante"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Artículo / Base Legal
                </label>
                <input
                  type="text"
                  name="articulo"
                  placeholder="Ej: Art. 45 u Ordenanza Municipal"
                  value={formData.articulo}
                  onChange={handleInputChange}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Descripción del Aviso *
                </label>
                <textarea
                  name="descripcion"
                  rows="3"
                  placeholder="Detalles sobre lo que reporta la persona..."
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Adjuntar Foto o Archivo
                </label>
                <input
                  type="file"
                  onChange={(e) => setArchivo(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-all disabled:opacity-50 mt-2 cursor-pointer"
              >
                {uploading ? 'Guardando...' : 'Guardar Registro'}
              </button>
            </form>
          </div>

          {/* Buscador, Filtros y Lista */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                Avisos Ingresados <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full ml-2">{avisosFiltrados.length}</span>
              </h2>
              <button
                onClick={fetchAvisos}
                className="p-2 text-slate-500 hover:text-slate-700 rounded-lg border hover:bg-slate-50 cursor-pointer"
                title="Recargar"
              >
                🔄
              </button>
            </div>

            {/* BUSCADOR Y FILTROS */}
            <div className="mb-6 space-y-3">
              <input
                type="text"
                placeholder="🔍 Buscar por nombre o DUI..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex flex-wrap gap-2">
                {['Todos', 'Activo', 'En proceso', 'Falta Inspección', 'Concluido'].map((estado) => (
                  <button
                    key={estado}
                    onClick={() => setFiltroEstado(estado)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      filtroEstado === estado
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {estado}
                  </button>
                ))}
              </div>
            </div>

            {/* LISTA DE EXPEDIENTES */}
            {loading ? (
              <p className="text-center text-slate-500 py-8">Cargando avisos...</p>
            ) : avisosFiltrados.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No se encontraron expedientes.</p>
            ) : (
              <div className="space-y-4">
                {avisosFiltrados.map((aviso) => (
                  <div
                    key={aviso.id}
                    className="p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-all bg-slate-50/50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-slate-800 capitalize">{aviso.nombre || 'Sin Nombre'}</h3>
                        <p className="text-xs text-slate-500">
                          DUI: {aviso.dui || 'N/A'} {aviso.telefono && `| Tel: ${aviso.telefono}`}
                        </p>
                      </div>

                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          aviso.estado === 'Activo'
                            ? 'bg-emerald-100 text-emerald-800'
                            : aviso.estado === 'En proceso'
                            ? 'bg-amber-100 text-amber-800'
                            : aviso.estado === 'Falta Inspección'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {aviso.estado === 'Activo' && '✔ '}
                        {aviso.estado || 'Sin Estado'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-100 my-2">
                      {aviso.descripcion}
                    </p>

                    {(aviso.direccion || aviso.articulo) && (
                      <div className="text-xs text-slate-500 space-y-1 mb-3">
                        {aviso.direccion && <p><span className="font-semibold text-slate-700">Dirección:</span> {aviso.direccion}</p>}
                        {aviso.articulo && <p><span className="font-semibold text-slate-700">Base / Art.:</span> {aviso.articulo}</p>}
                      </div>
                    )}

                    {aviso.archivo_url && (
                      <a
                        href={aviso.archivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg mb-3"
                      >
                        📤 Ver Documento / Foto Adjunta
                      </a>
                    )}

                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-400 font-semibold">Cambiar estado:</span>
                      {['Activo', 'En proceso', 'Falta Inspección', 'Concluido'].map((est) => (
                        <button
                          key={est}
                          onClick={() => cambiarEstado(aviso.id, est)}
                          disabled={aviso.estado === est}
                          className={`text-xs px-2 py-1 rounded border transition-all cursor-pointer ${
                            aviso.estado === est
                              ? 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {est}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}