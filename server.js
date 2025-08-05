const http = require('http');
const fs = require('fs');
const path = require('path');
// Chargement des données initiales depuis les fichiers JSON du frontend
const teamsPath = path.join(__dirname, '..', 'src', 'data', 'teams.json');
const challengesPath = path.join(__dirname, '..', 'src', 'data', 'challenges.json');

function loadData() {
  const teams = JSON.parse(fs.readFileSync(teamsPath, 'utf8'));
  const challenges = JSON.parse(fs.readFileSync(challengesPath, 'utf8'));
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
  const isExclusive = challenge.type === 'rare' || challenge.type === 'secret';
  if (isExclusive && !isWinner && challenge.winners.length > 0) {
    return;
  }
  if (isWinner) {
    // retirer
    challenge.winners = challenge.winners.filter((id) => id !== teamId);
    team.completedChallenges = team.completedChallenges.filter((id) => id !== challengeId);
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
        team.completedChallenges = team.completedChallenges.filter((cid) => cid !== challengeId);
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
  const { method, url } = req;
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  // Route pour obtenir l'état global (suspens et pause)
  if (method === 'GET' && url === '/api/state') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ suspenseMode, pauseUntil }));
  }
  // Récupération des équipes
  if (method === 'GET' && url === '/api/teams') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(teams));
  }
  // Récupération des défis
  if (method === 'GET' && url === '/api/challenges') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(challenges));
  }
  // Validation / annulation d'un défi
  if (method === 'POST' && url === '/api/validate') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { teamId, challengeId } = data;
        toggleChallenge(teamId, challengeId);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, teams, challenges }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }
  // Ajout de points personnels
  if (method === 'POST' && url === '/api/addPersonalPoints') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { teamId, playerId, amount } = data;
        addPoints(teamId, playerId, amount);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, teams }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }
  // Activer/désactiver un défi
  if (method === 'POST' && url === '/api/toggleDisabled') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { challengeId } = data;
        toggleDisabled(challengeId);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, challenges, teams }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }
  // Activer ou désactiver le mode suspens
  if (method === 'POST' && url === '/api/setSuspense') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        // data.active doit être un boolean
        suspenseMode = !!data.active;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, suspenseMode }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }
  // Démarrer ou annuler une pause. Envoyer resumeAt sous forme ISO ou null pour annuler.
  if (method === 'POST' && url === '/api/setPause') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { resumeAt } = data;
        // Si resumeAt est une chaîne non vide, la convertir ; sinon, annuler la pause
        if (typeof resumeAt === 'string' && resumeAt.trim()) {
          pauseUntil = resumeAt;
        } else {
          pauseUntil = null;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, pauseUntil }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }
  // Échanger deux joueurs entre équipes
  if (method === 'POST' && url === '/api/swapPlayers') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { playerId, targetTeamId, targetPlayerId } = data;
        swapPlayersBackend(playerId, targetTeamId, targetPlayerId);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, teams }));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }
  // Reset complet
  if (method === 'GET' && url === '/api/reset') {
    resetData();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true }));
  }
  // Route inconnue
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});