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
        .order('created_at', { ascending: false })
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

  const choisirSuggestion = (film) => {
    setTitre(film.title)
    setPoster(film.poster_path)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const ajouterFilm = async () => {
    if (!titre.trim()) return

    const { data, error } = await supabase
      .from('films')
      .insert({ user_id: user.id, titre: titre, note: note, poster: poster })
      .select()
      .single()

    if (!error && data) {
      setFilms([data, ...films])
    }

    setTitre('')
    setNote(3)
    setPoster(null)
  }

  const supprimerFilm = async (id) => {
    const { error } = await supabase.from('films').delete().eq('id', id)
    if (!error) {
      setFilms(films.filter(film => film.id !== id))
    }
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
          {films.map(film => (
            <li key={film.id} className="film-item">
              {film.poster ? (
                <img
                  className="film-poster"
                  src={`https://image.tmdb.org/t/p/w92${film.poster}`}
                  alt={film.titre}
                />
              ) : (
                <div className="film-poster-placeholder">🎬</div>
              )}
              <span className="film-titre">{film.titre}</span>
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
    </div>
  )
}

export default App
