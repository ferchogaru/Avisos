import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function App() {
  // Estados de Autenticación
  const [session, setSession] = useState(null)
  const [userInput, setUserInput] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)

  // Estados de la Aplicación de Avisos
  const [avisos, setAvisos] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  // Navegación (Menú Lateral)
  const [vista, setVista] = useState('dashboard') // 'dashboard' | 'nuevo' | 'avisos'

  // Búsqueda y Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  // Estado para Impresión
  const [avisoAImprimir, setAvisoAImprimir] = useState(null)

  // Formulario de Registro
  const [formData, setFormData] = useState({
    nombre: '',
    dui: '',
    telefono: '',
    direccion: '',
    articulo: '',
    descripcion: '',
    fecha: '',
    ubicacion: '',
  })
  const [archivo, setArchivo] = useState(null)

  // Estado para Edición de Avisos
  const [editingAviso, setEditingAviso] = useState(null)
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    dui: '',
    telefono: '',
    direccion: '',
    articulo: '',
    descripcion: '',
    fecha: '',
    ubicacion: '',
  })
  const [editArchivo, setEditArchivo] = useState(null)

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

  // Limpiar la plantilla de impresión automáticamente al terminar de imprimir o cancelar
  useEffect(() => {
    const handleAfterPrint = () => setAvisoAImprimir(null)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

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

  const handleEditInputChange = (e) => {
    const { name, value } = e.target
    setEditFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePrint = (aviso) => {
    setAvisoAImprimir(aviso)
    setTimeout(() => {
      window.print()
    }, 100)
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
          fecha: formData.fecha || null,
          ubicacion: formData.ubicacion,
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
        fecha: '',
        ubicacion: '',
      })
      setArchivo(null)
      fetchAvisos()
      alert('Aviso guardado con éxito')
      setVista('avisos')
    } catch (error) {
      console.error('Error al guardar:', error)
      alert(`Ocurrió un error al guardar: ${error.message || 'Verifica la consola'}`)
    } finally {
      setUploading(false)
    }
  }

  // Abrir Modal de Edición
  const handleStartEdit = (aviso) => {
    setEditingAviso(aviso)
    setEditArchivo(null)
    setEditFormData({
      nombre: aviso.nombre || '',
      dui: aviso.dui || '',
      telefono: aviso.telefono || '',
      direccion: aviso.direccion || '',
      articulo: aviso.articulo || '',
      descripcion: aviso.descripcion || '',
      fecha: aviso.fecha || '',
      ubicacion: aviso.ubicacion || '',
    })
  }

  // Guardar Edición (incluye subida de imagen/archivo si se seleccionó uno nuevo)
  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingAviso) return

    try {
      // Por defecto conservamos el archivo que ya tenía el aviso
      let archivoUrl = editingAviso.archivo_url || null

      // Si el usuario seleccionó un archivo nuevo en el modal, lo subimos y reemplazamos la URL
      if (editArchivo) {
        const fileExt = editArchivo.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('documentos_avisos')
          .upload(filePath, editArchivo)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('documentos_avisos')
          .getPublicUrl(filePath)

        archivoUrl = publicUrlData.publicUrl
      }

      const { error } = await supabase
        .from('avisos')
        .update({
          nombre: editFormData.nombre,
          dui: editFormData.dui,
          telefono: editFormData.telefono,
          direccion: editFormData.direccion,
          articulo: editFormData.articulo,
          descripcion: editFormData.descripcion,
          fecha: editFormData.fecha || null,
          ubicacion: editFormData.ubicacion,
          archivo_url: archivoUrl,
        })
        .eq('id', editingAviso.id)

      if (error) throw error

      alert('Aviso actualizado correctamente')
      setEditingAviso(null)
      setEditArchivo(null)
      fetchAvisos()
    } catch (error) {
      console.error('Error actualizando aviso:', error)
      alert(`Error al actualizar: ${error.message}`)
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

  const ESTADOS = ['Activo', 'En proceso', 'Falta Inspección', 'Concluido']

  // Pantalla de Login
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans print:hidden">
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

  // Interfaz Principal (con menú lateral)
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex print:hidden">

      {/* MENÚ LATERAL */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 min-h-screen">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📄</span>
            <div>
              <h1 className="font-bold text-sm leading-tight">Recepción de Avisos</h1>
              <p className="text-slate-400 text-xs">Municipales</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setVista('dashboard')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
              vista === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setVista('nuevo')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
              vista === 'nuevo' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            ➕ Nuevo Aviso
          </button>
          <button
            onClick={() => setVista('avisos')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
              vista === 'avisos' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            📋 Avisos Ingresados
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-400 mb-2 truncate">
            {session.user.email.replace('@sistema.local', '')}
          </p>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl">

        {errorMessage && (
          <div className="p-4 bg-rose-100 border border-rose-300 text-rose-800 rounded-xl text-sm font-semibold mb-6">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* VISTA: DASHBOARD (logo, conteo por estado y gráfica) */}
        {vista === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
              <button
                onClick={fetchAvisos}
                className="p-2 text-slate-500 hover:text-slate-700 rounded-lg border bg-white hover:bg-slate-50 cursor-pointer"
                title="Recargar"
              >
                🔄
              </button>
            </div>

            {/* Logo grande de la Alcaldía */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex justify-center">
              <img
                src="/logo-alcaldia-color.jpeg"
                alt="Logo Alcaldía La Paz Este"
                className="h-44 md:h-56 object-contain"
              />
            </div>

            {loading ? (
              <p className="text-slate-500 text-sm">Cargando datos...</p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase">Total Avisos</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{avisos.length}</p>
                  </div>

                  {ESTADOS.map((estado) => {
                    const cantidad = avisos.filter((a) => a.estado === estado).length
                    const colorTexto =
                      estado === 'Activo'
                        ? 'text-emerald-600'
                        : estado === 'En proceso'
                        ? 'text-amber-600'
                        : estado === 'Falta Inspección'
                        ? 'text-rose-600'
                        : 'text-slate-600'

                    return (
                      <div key={estado} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase">{estado}</p>
                        <p className={`text-3xl font-bold mt-1 ${colorTexto}`}>{cantidad}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Gráfica de Avisos por Estado */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-600 uppercase mb-4">
                    Avisos por Estado
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ESTADOS.map((estado) => ({
                      estado,
                      cantidad: avisos.filter((a) => a.estado === estado).length,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="estado" tick={{ fontSize: 12, fill: '#475569' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} />
                      <Tooltip />
                      <Bar dataKey="cantidad" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {/* VISTA: NUEVO AVISO (pantalla completa) */}
        {vista === 'nuevo' && (
          <div className="w-full bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold border-b pb-3 mb-6 text-slate-800">
              Registrar Nuevo Aviso
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      name="fecha"
                      value={formData.fecha}
                      onChange={handleInputChange}
                      className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Artículo / Contravención
                    </label>
                    <input
                      type="text"
                      name="articulo"
                      placeholder="Ej: Art. 45"
                      value={formData.articulo}
                      onChange={handleInputChange}
                      className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Ubicación (Link Google Maps)
                  </label>
                  <input
                    type="url"
                    name="ubicacion"
                    placeholder="https://maps.google.com/..."
                    value={formData.ubicacion}
                    onChange={handleInputChange}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Descripción del Aviso *
                  </label>
                  <textarea
                    name="descripcion"
                    rows="4"
                    placeholder="Detalles sobre lo que reporta la persona..."
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Adjuntar Foto o Archivo
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setArchivo(e.target.files[0])}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full md:w-auto md:px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-all disabled:opacity-50 mt-2 cursor-pointer"
              >
                {uploading ? 'Guardando...' : 'Guardar Registro'}
              </button>
            </form>
          </div>
        )}

        {/* VISTA: AVISOS INGRESADOS (buscador, filtros y lista) */}
        {vista === 'avisos' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
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
                {['Todos', ...ESTADOS].map((estado) => (
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

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePrint(aviso)}
                          className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded transition cursor-pointer flex items-center gap-1"
                        >
                          🖨️ Imprimir
                        </button>
                        <button
                          onClick={() => handleStartEdit(aviso)}
                          className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded transition cursor-pointer"
                        >
                          ✏️ Editar
                        </button>
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
                    </div>

                    <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-100 my-2">
                      {aviso.descripcion}
                    </p>

                    {(aviso.direccion || aviso.articulo || aviso.fecha || aviso.ubicacion) && (
                      <div className="text-xs text-slate-500 space-y-1 mb-3">
                        {aviso.fecha && <p><span className="font-semibold text-slate-700">Fecha:</span> {aviso.fecha}</p>}
                        {aviso.direccion && <p><span className="font-semibold text-slate-700">Dirección:</span> {aviso.direccion}</p>}
                        {aviso.articulo && <p><span className="font-semibold text-slate-700">Base / Art.:</span> {aviso.articulo}</p>}
                        {aviso.ubicacion && (
                          <p>
                            <span className="font-semibold text-slate-700">Ubicación: </span>
                            <a
                              href={aviso.ubicacion}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
                            >
                              📍 Abrir en Google Maps
                            </a>
                          </p>
                        )}
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
                      {ESTADOS.map((est) => (
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
        )}

      </main>

      {/* MODAL PARA EDITAR AVISO */}
      {editingAviso && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-800">Editar Aviso Ingresado</h3>
              <button
                onClick={() => setEditingAviso(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  name="nombre"
                  value={editFormData.nombre}
                  onChange={handleEditInputChange}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">DUI</label>
                  <input
                    type="text"
                    name="dui"
                    value={editFormData.dui}
                    onChange={handleEditInputChange}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    name="telefono"
                    value={editFormData.telefono}
                    onChange={handleEditInputChange}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  value={editFormData.direccion}
                  onChange={handleEditInputChange}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Fecha</label>
                  <input
                    type="date"
                    name="fecha"
                    value={editFormData.fecha}
                    onChange={handleEditInputChange}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Artículo / Base Legal</label>
                  <input
                    type="text"
                    name="articulo"
                    value={editFormData.articulo}
                    onChange={handleEditInputChange}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ubicación (Google Maps)</label>
                <input
                  type="url"
                  name="ubicacion"
                  value={editFormData.ubicacion}
                  onChange={handleEditInputChange}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Descripción</label>
                <textarea
                  name="descripcion"
                  rows="3"
                  value={editFormData.descripcion}
                  onChange={handleEditInputChange}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* Adjuntar / Reemplazar Imagen o Archivo */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Foto o Archivo Adjunto
                </label>

                {editingAviso.archivo_url && !editArchivo && (
                  <a
                    href={editingAviso.archivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg mb-2"
                  >
                    📤 Ver archivo actual
                  </a>
                )}

                {editArchivo && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg mb-2">
                    ✔ Nuevo archivo listo para subir: {editArchivo.name}
                  </p>
                )}

                <input
                  type="file"
                  onChange={(e) => setEditArchivo(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {editingAviso.archivo_url
                    ? 'Si subes un archivo nuevo, reemplazará al actual.'
                    : 'Este aviso no tiene archivo adjunto todavía — puedes subir uno aquí.'}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAviso(null)}
                  className="w-1/2 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLANTILLA DE IMPRESIÓN (Invisible en pantalla, solo visible al imprimir) */}
      {avisoAImprimir && (
        <div className="hidden print:block fixed inset-0 bg-white p-6 font-sans text-black z-[9999]">
          <style type="text/css" media="print">
            {`
              @page {
                size: letter portrait;
                margin: 15mm;
              }
            `}
          </style>

          <div className="max-w-[8.5in] mx-auto border-2 border-slate-900 p-8 rounded-lg shadow-none">
            {/* Encabezado Oficial */}
            <div className="flex items-center gap-4 border-b-2 border-slate-800 pb-4 mb-6">
              <img
                src="/logo-alcaldia.jpeg"
                alt="Logo Alcaldía de La Paz Este"
                className="h-20 w-20 object-contain flex-shrink-0"
              />
              <div className="text-center flex-1">
                <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900">
                  Alcaldia Municipal de La Paz Este
                </h1>
                <h2 className="text-base font-semibold text-slate-700 uppercase mt-1">
                  Departamento Contravencional / Recepción de Avisos
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Hoja de registro y control de avisos
                </p>
              </div>
            </div>

            {/* Información del Expediente */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-6 bg-slate-50 p-4 border border-slate-300 rounded">
              <div>
                <p className="font-bold text-slate-600 text-xs uppercase">Fecha</p>
                <p className="font-medium text-slate-900">{avisoAImprimir.fecha || 'No especificada'}</p>
              </div>
              <div>
                <p className="font-bold text-slate-600 text-xs uppercase">Estado Actual</p>
                <p className="font-semibold text-slate-900">{avisoAImprimir.estado || 'Activo'}</p>
              </div>
            </div>

            {/* Datos del Informante */}
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-bold uppercase border-b border-slate-400 pb-1 text-slate-800">
                1. Datos del Solicitante
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Nombre Completo:</span>
                  <p className="capitalize text-slate-900">{avisoAImprimir.nombre || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-semibold">DUI:</span>
                  <p className="text-slate-900">{avisoAImprimir.dui || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-semibold">Teléfono de Contacto:</span>
                  <p className="text-slate-900">{avisoAImprimir.telefono || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-semibold">Contravención / Artículo:</span>
                  <p className="text-slate-900">{avisoAImprimir.articulo || 'N/A'}</p>
                </div>
              </div>
              <div>
                <span className="font-semibold text-sm">Dirección:</span>
                <p className="text-sm text-slate-900 mt-0.5">{avisoAImprimir.direccion || 'Sin dirección'}</p>
              </div>
            </div>

            {/* Detalle del Aviso */}
            <div className="mb-8 space-y-2">
              <h3 className="text-sm font-bold uppercase border-b border-slate-400 pb-1 text-slate-800">
                2. Detalle del Aviso / Denuncia
              </h3>
              <div className="p-4 border border-slate-300 rounded-lg bg-slate-50 min-h-[150px] text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                {avisoAImprimir.descripcion}
              </div>
            </div>

            {/* Ubicación Google Maps */}
            {avisoAImprimir.ubicacion && (
              <div className="mb-8 text-xs text-slate-600">
                <span className="font-semibold">Ubicación GPS / Google Maps:</span>
                <p className="break-all text-blue-800 underline">{avisoAImprimir.ubicacion}</p>
              </div>
            )}

            {/* Firmas y Sello */}
            <div className="mt-20 pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="border-b border-slate-800 mb-2 w-3/4 mx-auto"></div>
                <p className="font-bold text-slate-800">FIRMA DEL SOLICITANTE</p>
                <p className="text-slate-500">DUI: {avisoAImprimir.dui || '________________'}</p>
              </div>
              <div>
                <div className="border-b border-slate-800 mb-2 w-3/4 mx-auto"></div>
                <p className="font-bold text-slate-800"> FIRMA DE QUIEN RECIBE</p>
                <p className="text-slate-500">DEPARTAMENTO CONTRAVENCIONAL</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}