// On importe useState depuis React.
// useState, c'est ce qui rend l'interface "réactive" :
// quand une valeur change, l'affichage se met à jour tout seul.
import { useState } from 'react'
import './App.css'

function App() {
  // Chaque useState crée une "variable réactive" + une fonction pour la modifier.
  // useState([]) → au départ, la liste de films est vide (tableau vide).
  // useState('') → au départ, le champ titre est vide (string vide).
  // useState(3)  → au départ, la note par défaut est 3.
  const [films, setFilms] = useState([])
  const [titre, setTitre] = useState('')
  const [note, setNote] = useState(3)

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
      note: note        // La valeur du sélecteur de note
    }])

    // Remet le formulaire à zéro
    setTitre('')
    setNote(3)
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
      <h1>🎬 Ma Filmothèque</h1>

      {/* En JSX, les commentaires s'écrivent comme ça */}
      {/* className au lieu de class (class est un mot réservé en JS) */}

      <div className="form">
        {/* 
          value={titre} → le champ affiche toujours la valeur de 'titre'
          onChange → à chaque frappe, on met à jour 'titre' avec la nouvelle valeur
          C'est ce qu'on appelle un "controlled input" : React contrôle le contenu du champ
        */}
        <input
          type="text"
          placeholder="Titre du film..."
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ajouterFilm()}
        />

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