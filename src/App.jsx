import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './context/AuthContext'
import './App.css'

function App() {
  const { user, signOut } = useAuth()
  const [films, setFilms] = useState([])
  const [titre, setTitre] = useState('')
  const [note, setNote] = useState(3)
  const [loading, setLoading] = useState(true)

  // Drag & drop
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  // Suggestions de films depuis l'API TMDB
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Mode sombre activé par défaut
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('dark-mode')
    return saved !== null ? saved === 'true' : true
  })

  // Charge les films depuis Supabase au montage
  useEffect(() => {
    const fetchFilms = async () => {
      const { data } = await supabase
        .from('films')
        .select('*')
        .order('position', { ascending: true })
      setFilms(data || [])
      setLoading(false)
    }
    fetchFilms()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
    localStorage.setItem('dark-mode', dark)
  }, [dark])

  // Recherche TMDB avec debounce
  useEffect(() => {
    if (titre.trim().length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(titre)}&language=fr-FR&page=1`,
          { headers: { Authorization: `Bearer ${import.meta.env.VITE_TMDB_TOKEN}` } }
        )
        const data = await res.json()
        setSuggestions(data.results?.slice(0, 5) || [])
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [titre])

  const [poster, setPoster] = useState(null)
  const [tmdbId, setTmdbId] = useState(null)

  // Modal détails
  const [modalFilm, setModalFilm] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  const choisirSuggestion = (film) => {
    setTitre(film.title)
    setPoster(film.poster_path)
    setTmdbId(film.id)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const ajouterFilm = async () => {
    if (!titre.trim()) return

    // Décaler tous les films existants d'une position
    if (films.length > 0) {
      await Promise.all(films.map((f, i) =>
        supabase.from('films').update({ position: i + 1 }).eq('id', f.id)
      ))
    }

    const { data, error } = await supabase
      .from('films')
      .insert({ user_id: user.id, titre: titre, note: note, poster: poster, tmdb_id: tmdbId, position: 0 })
      .select()
      .single()

    if (!error && data) {
      setFilms([data, ...films.map((f, i) => ({ ...f, position: i + 1 }))])
    }

    setTitre('')
    setNote(3)
    setPoster(null)
    setTmdbId(null)
  }

  // Drag & drop handlers
  const onDragStart = (index) => {
    setDragIndex(index)
  }

  const onDragOver = (e, index) => {
    e.preventDefault()
    if (index !== dragOverIndex) setDragOverIndex(index)
  }

  const onDrop = async (index) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }

    const reordered = [...films]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, moved)

    // Mettre à jour les positions localement
    const updated = reordered.map((f, i) => ({ ...f, position: i }))
    setFilms(updated)
    setDragIndex(null)
    setDragOverIndex(null)

    // Persister en base
    await Promise.all(updated.map(f =>
      supabase.from('films').update({ position: f.position }).eq('id', f.id)
    ))
  }

  const onDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const supprimerFilm = async (id) => {
    const { error } = await supabase.from('films').delete().eq('id', id)
    if (!error) {
      setFilms(films.filter(film => film.id !== id))
    }
  }

  const ouvrirDetail = async (film) => {
    if (!film.tmdb_id) return
    setModalLoading(true)
    setModalError(null)
    setModalFilm(null)
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${film.tmdb_id}?append_to_response=credits&language=fr-FR`,
        { headers: { Authorization: `Bearer ${import.meta.env.VITE_TMDB_TOKEN}` } }
      )
      if (!res.ok) throw new Error('Erreur TMDB')
      const data = await res.json()
      setModalFilm(data)
    } catch {
      setModalError('Impossible de charger les details du film.')
    } finally {
      setModalLoading(false)
    }
  }

  const fermerModal = () => {
    setModalFilm(null)
    setModalLoading(false)
    setModalError(null)
  }

  // Fermer la modal avec Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') fermerModal()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const formatDuree = (minutes) => {
    if (!minutes) return null
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`
  }

  if (loading) return <div className="loading">Chargement...</div>

  return (
    <div className="app">
      <div className="top-bar">
        <button
          className="toggle-dark"
          onClick={() => setDark(!dark)}
          title={dark ? 'Mode clair' : 'Mode sombre'}
        >
          {dark ? '☀️' : '🌙'}
        </button>
        <button className="btn-logout" onClick={signOut}>
          Deconnexion
        </button>
      </div>

      <h1>Ma Filmotheque</h1>

      <div className="form">
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Rechercher un film..."
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ajouterFilm()}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />

          {showSuggestions && suggestions.length > 0 && (
            <ul className="suggestions">
              {suggestions.map(film => (
                <li key={film.id} onMouseDown={() => choisirSuggestion(film)}>
                  {film.poster_path && (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${film.poster_path}`}
                      alt={film.title}
                    />
                  )}
                  <div className="suggestion-info">
                    <span className="suggestion-title">{film.title}</span>
                    {film.release_date && (
                      <span className="suggestion-year">
                        {film.release_date.slice(0, 4)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <select value={note} onChange={(e) => setNote(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map(n => (
            <option key={n} value={n}>{n} ⭐</option>
          ))}
        </select>

        <button onClick={ajouterFilm}>Ajouter</button>
      </div>

      {films.length === 0 ? (
        <p className="empty">Aucun film ajoute pour le moment.</p>
      ) : (
        <ul className="film-list">
          {films.map((film, index) => (
            <li
              key={film.id}
              className={`film-item${dragIndex === index ? ' dragging' : ''}${dragOverIndex === index ? ' drag-over' : ''}`}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={() => onDrop(index)}
              onDragEnd={onDragEnd}
            >
              <span className="drag-handle">⠿</span>
              {film.poster ? (
                <img
                  className="film-poster"
                  src={`https://image.tmdb.org/t/p/w92${film.poster}`}
                  alt={film.titre}
                />
              ) : (
                <div className="film-poster-placeholder">🎬</div>
              )}
              <span
                className={`film-titre${film.tmdb_id ? ' clickable' : ''}`}
                onClick={() => film.tmdb_id && ouvrirDetail(film)}
              >
                {film.titre}
              </span>
              <span className="film-note">{'⭐'.repeat(film.note)}</span>
              <button
                className="btn-supprimer"
                onClick={() => supprimerFilm(film.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {films.length > 0 && (
        <p className="stats">
          {films.length} film{films.length > 1 ? 's' : ''} —
          Moyenne : {(films.reduce((sum, f) => sum + f.note, 0) / films.length).toFixed(1)} ⭐
        </p>
      )}

      {(modalFilm || modalLoading || modalError) && (
        <div className="modal-overlay" onClick={fermerModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={fermerModal}>✕</button>
            {modalLoading && <p className="modal-loading">Chargement...</p>}
            {modalError && <p className="modal-error">{modalError}</p>}
            {modalFilm && (
              <>
                <div className="modal-header">
                  {modalFilm.poster_path && (
                    <img
                      className="modal-poster"
                      src={`https://image.tmdb.org/t/p/w342${modalFilm.poster_path}`}
                      alt={modalFilm.title}
                    />
                  )}
                  <div className="modal-infos">
                    <h2>{modalFilm.title}</h2>
                    <p className="modal-meta">
                      {modalFilm.release_date?.slice(0, 4)}
                      {modalFilm.runtime ? ` · ${formatDuree(modalFilm.runtime)}` : ''}
                    </p>
                  </div>
                </div>
                {modalFilm.overview && (
                  <div className="modal-overview">
                    <h3>Synopsis</h3>
                    <p>{modalFilm.overview}</p>
                  </div>
                )}
                {modalFilm.credits?.cast?.length > 0 && (
                  <div className="modal-cast">
                    <h3>Casting</h3>
                    <ul>
                      {modalFilm.credits.cast.slice(0, 5).map(actor => (
                        <li key={actor.id}>
                          <strong>{actor.name}</strong>
                          {actor.character && <span> — {actor.character}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
