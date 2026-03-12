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
│       └── OverlayView.jsx
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
