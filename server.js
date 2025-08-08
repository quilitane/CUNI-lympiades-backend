const http = require("http");
const fs = require("fs");
const path = require("path");
// Chargement des données initiales depuis les fichiers JSON du frontend
const teamsPath = path.join(__dirname, "src", "data", "teams.json");
const challengesPath = path.join(__dirname, "src", "data", "challenges.json");
// Fichier des tips (Tâche 2)
const tipsPath = path.join(__dirname, "src", "data", "tips.json");

function loadData() {
  const teams = JSON.parse(fs.readFileSync(teamsPath, "utf8"));
  const challenges = JSON.parse(fs.readFileSync(challengesPath, "utf8"));
  return { teams, challenges };
}

// Chargement tips
function loadTips() {
  try {
    return JSON.parse(fs.readFileSync(tipsPath, "utf8"));
  } catch (e) {
    console.warn("Impossible de charger tips.json:", e?.message);
    return {};
  }
}

let { teams, challenges } = loadData();
let tipsByChallenge = loadTips();

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
  tipsByChallenge = loadTips(); // recharger aussi les tips
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

/**
 * Retourne la liste des tips actifs à l'instant donné.
 * - nowDate: Date (par défaut = maintenant)
 * - options.challengeId: string | undefined -> filtre sur un challenge précis
 * Renvoie un tableau de { challengeId, tip_txt, heure_reveal, heure_fin } pour tous les tips dont
 * heure_reveal <= now < heure_fin.
 */
function getActiveTips(nowDate = new Date(), options = {}) {
  const nowMs = nowDate.getTime();
  const filterChallenge = options.challengeId || null;

  const results = [];
  for (const [challengeId, groups] of Object.entries(tipsByChallenge || {})) {
    if (filterChallenge && challengeId !== filterChallenge) continue;
    if (!Array.isArray(groups)) continue;
    // groups : [ [tip1, tip2, tip3], ... ]
    for (const group of groups) {
      if (!Array.isArray(group)) continue;
      for (const tip of group) {
        if (!tip) continue;
        const start = Date.parse(tip.heure_reveal);
        const end = Date.parse(tip.heure_fin);
        if (Number.isFinite(start) && Number.isFinite(end)) {
          if (start <= nowMs && nowMs < end) {
            results.push({
              challengeId,
              tip_txt: tip.tip_txt,
              heure_reveal: tip.heure_reveal,
              heure_fin: tip.heure_fin,
            });
          }
        }
      }
    }
  }
  // Tri optionnel par challengeId puis par fenêtre de temps
  results.sort((a, b) => {
    if (a.challengeId === b.challengeId) {
      return Date.parse(a.heure_reveal) - Date.parse(b.heure_reveal);
    }
    return a.challengeId.localeCompare(b.challengeId);
  });
  return results;
}

const server = http.createServer((req, res) => {
  // Désactiver tout cache sur les routes API
  const { method, headers } = req;
  const rawUrl = req.url || "/";
  const pathname = rawUrl.split("?")[0]; // on ignore les querystrings (ex: ?t=...)

  if (pathname.startsWith("/api/")) {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
  }
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // Disable caching
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  if (method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  // Route pour obtenir l'état global (suspens et pause)
  if (method === "GET" && pathname === "/api/state") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ suspenseMode, pauseUntil }));
  }
  // Récupération des équipes
  if (method === "GET" && pathname === "/api/teams") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(teams));
  }
  // Récupération des défis
  if (method === "GET" && pathname === "/api/challenges") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(challenges));
  }

  // NOUVEL ENDPOINT — tips actifs maintenant (avec options)
  // GET /api/tips?challengeId=<id>&now=<ISO>
  if (method === "GET" && pathname === "/api/tips") {
    try {
      const base = `http://${headers.host || "localhost"}`;
      const urlObj = new URL(rawUrl, base);
      const challengeId = urlObj.searchParams.get("challengeId");
      const nowParam = urlObj.searchParams.get("now");

      const nowDate = nowParam ? new Date(nowParam) : new Date();
      if (Number.isNaN(nowDate.getTime())) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ success: false, error: "Paramètre 'now' invalide" }));
      }

      const tips = getActiveTips(nowDate, { challengeId });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ success: true, now: nowDate.toISOString(), tips }));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ success: false, error: err?.message || String(err) }));
    }
  }

  // Validation / annulation d'un défi
  if (method === "POST" && pathname === "/api/validate") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
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
  if (method === "POST" && pathname === "/api/addPersonalPoints") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
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
  if (method === "POST" && pathname === "/api/toggleDisabled") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
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
  if (method === "POST" && pathname === "/api/setSuspense") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        // data.active doit être un boolean
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
  // Démarrer ou annuler une pause. Envoyer resumeAt sous forme ISO ou null pour annuler.
  if (method === "POST" && pathname === "/api/setPause") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const { resumeAt } = data;
        // Si resumeAt est une chaîne non vide, la convertir ; sinon, annuler la pause
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
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }
  // Échanger deux joueurs entre équipes
  if (method === "POST" && pathname === "/api/swapPlayers") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
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
  if (method === "GET" && pathname === "/api/reset") {
    resetData();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ success: true }));
  }

  // Gestion des fichiers statiques (frontend)
  const staticDir = path.join(__dirname, "dist");
  const filePath = path.join(staticDir, pathname === "/" ? "index.html" : pathname);
  // IMPORTANT : on "return" ici pour ne pas tomber ensuite sur la 404
  return fs.readFile(filePath, (err, content) => {
    if (res.headersSent) return; // garde-fou
    if (err) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain");
      return res.end("Not found");
    }
    res.setHeader("Content-Type", getMimeType(filePath));
    return res.end(content);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html": return "text/html";
    case ".js": return "application/javascript";
    case ".css": return "text/css";
    case ".json": return "application/json";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".svg": return "image/svg+xml";
    case ".ico": return "image/x-icon";
    default: return "application/octet-stream";
  }
}
