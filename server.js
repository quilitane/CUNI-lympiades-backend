const http = require("http");
const fs = require("fs");
const path = require("path");

// Chargement des données initiales depuis les fichiers JSON du frontend
const teamsPath = path.join(__dirname, "src", "data", "teams.json");
const challengesPath = path.join(__dirname, "src", "data", "challenges.json");
// Dossier statique (frontend build)
const staticDir = path.join(__dirname, "dist");

function loadData() {
  const teams = JSON.parse(fs.readFileSync(teamsPath, "utf8"));
  const challenges = JSON.parse(fs.readFileSync(challengesPath, "utf8"));
  return { teams, challenges };
}

let { teams, challenges } = loadData();

function findTeam(id) {
  return teams.find((t) => t.id === id);
}

function findChallenge(id) {
  return challenges.find((c) => c.id === id);
}

function toggleChallenge(teamId, challengeId) {
  const team = findTeam(teamId);
  const challenge = findChallenge(challengeId);
  if (!team || !challenge) return;
  // Ne rien faire si le défi est désactivé
  if (challenge.disabled) return;
  const isWinner = challenge.winners.includes(teamId);
  // Si rare et déjà gagné par un autre
  const isExclusive = challenge.type === "rare" || challenge.type === "secret";
  if (isExclusive && !isWinner && challenge.winners.length > 0) {
    return;
  }
  if (isWinner) {
    // retirer
    challenge.winners = challenge.winners.filter((id) => id !== teamId);
    team.completedChallenges = team.completedChallenges.filter(
      (id) => id !== challengeId
    );
    team.points -= challenge.points;
    if (team.points < 0) team.points = 0;
  } else {
    // ajouter
    challenge.winners.push(teamId);
    team.completedChallenges.push(challengeId);
    team.points += challenge.points;
  }
}

function addPoints(teamId, playerId, amount) {
  const team = findTeam(teamId);
  if (!team) return;
  const player = team.players.find((p) => p.id === playerId);
  if (!player) return;
  player.personalPoints += amount;
  team.points += amount;
}

function resetData() {
  const data = loadData();
  teams = data.teams;
  challenges = data.challenges;
}

function toggleDisabled(challengeId) {
  const challenge = findChallenge(challengeId);
  if (!challenge) return;
  const currentlyDisabled = challenge.disabled === true;
  challenge.disabled = !currentlyDisabled;
  // Mettre à jour les points et les défis complétés des équipes gagnantes
  const winners = challenge.winners || [];
  winners.forEach((teamId) => {
    const team = findTeam(teamId);
    if (!team) return;
    const hasCompleted = team.completedChallenges.includes(challengeId);
    if (currentlyDisabled) {
      // Réactivation : ajouter points et compléter si pas présent
      if (!hasCompleted) {
        team.completedChallenges.push(challengeId);
        team.points += challenge.points;
      }
    } else {
      // Désactivation : retirer points et l'identifiant
      if (hasCompleted) {
        team.completedChallenges = team.completedChallenges.filter(
          (cid) => cid !== challengeId
        );
        team.points -= challenge.points;
        if (team.points < 0) team.points = 0;
      }
    }
  });
}

// Échange deux joueurs entre équipes et ajuste les points d'équipe
function swapPlayersBackend(playerId, targetTeamId, targetPlayerId) {
  // Trouver l'équipe et l'indice du premier joueur
  let teamA, teamB;
  let idxA = -1;
  let idxB = -1;
  for (const t of teams) {
    const i = t.players.findIndex((p) => p.id === playerId);
    if (i >= 0) {
      teamA = t;
      idxA = i;
      break;
    }
  }
  teamB = teams.find((t) => t.id === targetTeamId);
  if (!teamA || !teamB) return;
  idxB = teamB.players.findIndex((p) => p.id === targetPlayerId);
  if (idxA < 0 || idxB < 0) return;
  const playerA = teamA.players[idxA];
  const playerB = teamB.players[idxB];
  // Échanger les joueurs
  teamA.players[idxA] = playerB;
  teamB.players[idxB] = playerA;
  // Mettre à jour les points d'équipe (basé sur les points personnels)
  teamA.points = teamA.points - playerA.personalPoints + playerB.personalPoints;
  teamB.points = teamB.points - playerB.personalPoints + playerA.personalPoints;
}

/**
 * État global côté serveur pour le mode suspens et la pause de jeu.
 * suspenseMode: indique si les points et le classement doivent être masqués.
 * pauseUntil: date ISO à laquelle la pause se termine, ou null si aucune pause.
 */
let suspenseMode = false;
let pauseUntil = null;

const server = http.createServer((req, res) => {
  const { method } = req;
  let url = req.url || "/";

  // Désactiver tout cache
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  // ...existing code...
  // ====== API ======
  if (url.startsWith("/api/")) {
    // Strip query string for API routing
    const cleanUrl = url.split("?")[0];

    // Route pour obtenir l'état global (suspens et pause)
    if (method === "GET" && cleanUrl === "/api/state") {
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ suspenseMode, pauseUntil }));
    }
    // Récupération des équipes
    if (method === "GET" && cleanUrl === "/api/teams") {
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(teams));
    }
    // Récupération des défis
    if (method === "GET" && cleanUrl === "/api/challenges") {
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(challenges));
    }
    // Validation / annulation d'un défi
    if (method === "POST" && cleanUrl === "/api/validate") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          const { teamId, challengeId } = data;
          toggleChallenge(teamId, challengeId);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ success: true, teams, challenges }));
        } catch (err) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
    // Ajout de points personnels
    if (method === "POST" && cleanUrl === "/api/addPersonalPoints") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          const { teamId, playerId, amount } = data;
          addPoints(teamId, playerId, amount);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ success: true, teams }));
        } catch (err) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
    // Activer/désactiver un défi
    if (method === "POST" && cleanUrl === "/api/toggleDisabled") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          const { challengeId } = data;
          toggleDisabled(challengeId);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ success: true, challenges, teams }));
        } catch (err) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
    // Activer ou désactiver le mode suspens
    if (method === "POST" && cleanUrl === "/api/setSuspense") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          suspenseMode = !!data.active;
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ success: true, suspenseMode }));
        } catch (err) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
    // Démarrer ou annuler une pause
    if (method === "POST" && cleanUrl === "/api/setPause") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          const { resumeAt } = data;
          if (typeof resumeAt === "string" && resumeAt.trim()) {
            pauseUntil = resumeAt;
          } else {
            pauseUntil = null;
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ success: true, pauseUntil }));
        } catch (err) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
    // Échanger deux joueurs entre équipes
    if (method === "POST" && cleanUrl === "/api/swapPlayers") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          const { playerId, targetTeamId, targetPlayerId } = data;
          swapPlayersBackend(playerId, targetTeamId, targetPlayerId);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ success: true, teams }));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
    // Reset complet
    if (method === "GET" && cleanUrl === "/api/reset") {
      resetData();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ success: true }));
    }

    // Route API inconnue
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Not found" }));
  }
// ...existing code...

  // ====== STATIC (frontend) ======
  if (method === "GET") {
    // Nettoyage de l'URL (sans querystring)
    const cleanPath = decodeURIComponent((url || "/").split("?")[0]);
    const wanted = cleanPath === "/" ? "index.html" : cleanPath;
    const filePath = path.join(staticDir, wanted);

    // Servir fichier si existant, sinon fallback SPA -> index.html
    fs.stat(filePath, (err, stat) => {
      const serveIndex = () => {
        const indexPath = path.join(staticDir, "index.html");
        fs.readFile(indexPath, (err2, data) => {
          if (err2) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain");
            return res.end("Not found");
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html");
          return res.end(data);
        });
      };

      if (err || !stat || !stat.isFile()) {
        // Fallback SPA
        return serveIndex();
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", getMimeType(filePath));
      const stream = fs.createReadStream(filePath);
      stream.on("error", () => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain");
        return res.end("Internal Server Error");
      });
      stream.pipe(res);
    });
    return; // ⚠️ Important: ne pas tomber sur le 404 JSON après avoir commencé la statique
  }

  // Route inconnue (méthodes non gérées)
  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify({ error: "Not found" }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html";
    case ".js":
      return "application/javascript";
    case ".css":
      return "text/css";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}
