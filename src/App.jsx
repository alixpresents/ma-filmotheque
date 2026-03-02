// On importe useState depuis React.
// useState, c'est ce qui rend l'interface "réactive" :
// quand une valeur change, l'affichage se met à jour tout seul.
import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // Chaque useState crée une "variable réactive" + une fonction pour la modifier.
  // useState([]) → au départ, la liste de films est vide (tableau vide).
  // useState('') → au départ, le champ titre est vide (string vide).
  // useState(3)  → au départ, la note par défaut est 3.
  const [films, setFilms] = useState(() => {
    const saved = localStorage.getItem('films')
    return saved ? JSON.parse(saved) : []
  })
  const [titre, setTitre] = useState('')
  const [note, setNote] = useState(3)

  // Suggestions de films depuis l'API TMDB
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Mode sombre activé par défaut. On stocke la préférence dans localStorage
  // pour la conserver entre les visites.
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('dark-mode')
    return saved !== null ? saved === 'true' : true
  })

  // Sauvegarde la liste de films dans localStorage à chaque modification.
  useEffect(() => {
    localStorage.setItem('films', JSON.stringify(films))
  }, [films])

  // useEffect exécute du code quand 'dark' change.
  // On ajoute/retire la classe 'light' sur <html> pour basculer le thème CSS.
  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
    localStorage.setItem('dark-mode', dark)
  }, [dark])

  // Recherche TMDB avec un délai (debounce) pour ne pas spammer l'API.
  // À chaque frappe, on attend 300ms avant de lancer la requête.
  // Si l'utilisateur tape une nouvelle lettre avant, le timer précédent est annulé.
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

  // Stocke le poster du film sélectionné via les suggestions
  const [poster, setPoster] = useState(null)

  // Quand l'utilisateur clique sur une suggestion, on remplit le titre et le poster
  const choisirSuggestion = (film) => {
    setTitre(film.title)
    setPoster(film.poster_path)
    setSuggestions([])
    setShowSuggestions(false)
  }

  // Cette fonction est appelée quand on clique sur "Ajouter"
  const ajouterFilm = () => {
    // .trim() enlève les espaces au début/fin. Si le titre est vide, on ne fait rien.
    if (!titre.trim()) return

    // setFilms met à jour la liste. On crée un NOUVEAU tableau qui contient :
    // - ...films → tous les films existants (le "..." s'appelle le spread operator)
    // - { ... }  → le nouveau film qu'on ajoute
    setFilms([...films, {
      id: Date.now(),   // Un ID unique (le timestamp actuel en millisecondes)
      titre: titre,     // La valeur du champ titre
      note: note,       // La valeur du sélecteur de note
      poster: poster    // Le chemin du poster TMDB (ou null)
    }])

    // Remet le formulaire à zéro
    setTitre('')
    setNote(3)
    setPoster(null)
  }

  // Supprime un film : on garde tous les films SAUF celui dont l'ID correspond
  // .filter() crée un nouveau tableau avec seulement les éléments qui passent le test
  const supprimerFilm = (id) => {
    setFilms(films.filter(film => film.id !== id))
  }

  // Tout ce qui est dans le return, c'est du JSX — du "HTML dans du JavaScript".
  // React transforme ça en vrais éléments HTML dans le navigateur.
  return (
    <div className="app">
      <button
        className="toggle-dark"
        onClick={() => setDark(!dark)}
        title={dark ? 'Mode clair' : 'Mode sombre'}
      >
        {dark ? '☀️' : '🌙'}
      </button>

      <h1>🎬 Ma Filmothèque</h1>

      {/* En JSX, les commentaires s'écrivent comme ça */}
      {/* className au lieu de class (class est un mot réservé en JS) */}

      <div className="form">
        {/* Le champ de recherche avec dropdown de suggestions TMDB */}
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

        {/* 
          Le select pour la note.
          .map() transforme le tableau [1,2,3,4,5] en 5 éléments <option>.
          Chaque élément dans une liste a besoin d'une "key" unique pour que React
          puisse les identifier efficacement.
        */}
        <select value={note} onChange={(e) => setNote(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map(n => (
            <option key={n} value={n}>{n} ⭐</option>
          ))}
        </select>

        <button onClick={ajouterFilm}>Ajouter</button>
      </div>

      {/* 
        Rendu conditionnel : si films.length === 0, on affiche le message "vide".
        Sinon, on affiche la liste.
        Le ternaire (condition ? si-vrai : si-faux) est très utilisé en React.
      */}
      {films.length === 0 ? (
        <p className="empty">Aucun film ajouté pour le moment.</p>
      ) : (
        <ul className="film-list">
          {/* 
            .map() transforme chaque objet film en un élément <li>.
            C'est LE pattern de base de React : données → interface.
          */}
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
              {/* '⭐'.repeat(3) → '⭐⭐⭐' — répète l'étoile N fois */}
              <span className="film-note">{'⭐'.repeat(film.note)}</span>
              {/* 
                onClick={() => supprimerFilm(film.id)}
                La flèche () => est importante ici. Sans elle, la fonction
                s'exécuterait immédiatement au rendu au lieu d'attendre le clic.
              */}
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

      {/* Affiche les stats seulement s'il y a au moins un film */}
      {films.length > 0 && (
        <p className="stats">
          {films.length} film{films.length > 1 ? 's' : ''} —
          Moyenne : {(films.reduce((sum, f) => sum + f.note, 0) / films.length).toFixed(1)} ⭐
        </p>
      )}
    </div>
  )
}

// export default → rend ce composant importable par d'autres fichiers
// (main.jsx l'importe pour l'afficher dans la page)
export default App