# 🔴 Wilco's Buzz

Application de buzzer en temps réel pour game shows et streams.

## Fonctionnalités

- **Rooms avec code** — Créez une room, partagez le code à 4 lettres
- **Mot de passe optionnel** — Protégez votre room
- **Mode Streamer** — Cache automatiquement le mot de passe
- **Buzzer temps réel** — WebSocket pour une latence minimale
- **Contrôles admin** — Activer/désactiver buzzers, kick joueurs, timer
- **Buzz unique ou multiple** — Au choix de l'admin
- **Overlay OBS** — Vue transparente à intégrer dans votre stream
- **Responsive** — Fonctionne sur mobile et desktop

## Déployer sur Render (gratuit)

### Option 1 : Via le Dashboard

1. Créez un compte sur [render.com](https://render.com)
2. Poussez ce code sur un repo GitHub/GitLab
3. Dans Render → **New** → **Web Service**
4. Connectez votre repo
5. Configurez :
   - **Build Command** : `npm run render:build`
   - **Start Command** : `npm start`
   - **Environment** : `Node`
6. Déployez !

### Option 2 : Via render.yaml (Blueprint)

1. Poussez ce code sur GitHub avec le `render.yaml` inclus
2. Dans Render → **New** → **Blueprint**
3. Sélectionnez votre repo
4. Render détecte automatiquement la config

### Note importante sur Render Free Tier

Le tier gratuit de Render met le service en veille après 15 min d'inactivité.
Le premier accès après une veille prend ~30 secondes. Pour un stream,
ouvrez l'app quelques minutes avant pour la "réveiller".

## Développement local

```bash
npm install
npm run dev
```

Cela lance le serveur (port 3001) et le client Vite (port 5173) simultanément.

## Structure

```
wilcos-buzz/
├── server/
│   └── index.js          # Serveur Express + Socket.io
├── src/
│   ├── main.jsx          # Point d'entrée React
│   ├── App.jsx           # Routeur principal
│   ├── useSocket.js      # Hook Socket.io
│   ├── theme.js          # Constantes de style
│   └── screens/
│       ├── HomeScreen.jsx
│       ├── CreateRoomScreen.jsx
│       ├── JoinRoomScreen.jsx
│       ├── AdminView.jsx
│       ├── PlayerView.jsx
│       ├── OverlayView.jsx
│       └── EmbedView.jsx       # Vue embed pour iframe
├── index.html
├── vite.config.js
├── render.yaml           # Config Render
└── package.json
```

## Overlay OBS

1. Dans l'admin, cliquez sur "📺 Overlay OBS"
2. Copiez l'URL affichée
3. Dans OBS → Sources → **+** → **Navigateur**
4. Collez l'URL, dimensions 500×700px
5. Cochez "Arrière-plan transparent" dans les propriétés

## Intégration Embed (iframe)

Vous pouvez intégrer le buzzer dans une autre application (quiz, jeu, etc.) via iframe.

### URL embed

```
https://votre-app.onrender.com/#embed-XXXX
```

Paramètres d'URL optionnels :

| Paramètre  | Description                        | Exemple              |
|------------|------------------------------------|----------------------|
| `pseudo`   | Pseudo du joueur (auto-join)       | `pseudo=Jean`        |
| `avatar`   | Emoji avatar                       | `avatar=%F0%9F%A6%8A` (🦊) |
| `password` | Mot de passe de la room            | `password=ABC123`    |

### Exemples

**Saisie manuelle du pseudo :**
```html
<iframe src="https://votre-app.onrender.com/#embed-ABCD"
        style="width:100%;height:400px;border:none;"></iframe>
```

**Auto-join avec pseudo et avatar :**
```html
<iframe src="https://votre-app.onrender.com/#embed-ABCD?pseudo=Jean&avatar=🦊&password=ABC123"
        style="width:100%;height:400px;border:none;"></iframe>
```

**Dynamique en JavaScript :**
```javascript
const roomCode = 'ABCD';
const password = 'ABC123';
const pseudo = currentUser.name;
const avatar = currentUser.avatar || '🎮';

const src = `https://votre-app.onrender.com/#embed-${roomCode}?pseudo=${encodeURIComponent(pseudo)}&avatar=${encodeURIComponent(avatar)}&password=${encodeURIComponent(password)}`;

document.getElementById('buzzer-frame').src = src;
```

### Communication postMessage

L'iframe communique avec l'app parente via `postMessage`.

**iframe → parent (événements) :**

```javascript
// Écouter les événements du buzzer
window.addEventListener('message', (event) => {
  const { type } = event.data;

  switch (type) {
    case 'buzzer:ready':
      // { type, playerId, pseudo, avatar }
      // Le joueur a rejoint la room
      break;

    case 'buzzer:buzzed':
      // { type, playerId, pseudo, avatar, rank, relativeTime }
      // Le joueur a buzzé ! rank = position (0 = premier)
      break;

    case 'buzzer:update':
      // { type, buzzes: [...], buzzerEnabled, timerRunning }
      // Mise à jour de l'état de la room
      break;

    case 'buzzer:kicked':
      // { type, playerId }
      // Le joueur a été expulsé
      break;

    case 'buzzer:closed':
      // { type }
      // La room a été fermée par l'admin
      break;

    case 'buzzer:error':
      // { type, error: string }
      // Erreur de connexion
      break;
  }
});
```

### Exemple d'intégration dans un quiz

```javascript
// Dans votre app de quiz
const buzzerFrame = document.getElementById('buzzer');

window.addEventListener('message', (event) => {
  if (event.data.type === 'buzzer:buzzed') {
    const { pseudo, rank } = event.data;
    if (rank === 0) {
      // Premier à buzzer !
      showAnswerInput(pseudo);
      lockOtherPlayers();
    }
  }

  if (event.data.type === 'buzzer:update') {
    // Mettre à jour l'affichage des buzz
    updateBuzzDisplay(event.data.buzzes);
  }
});
```

