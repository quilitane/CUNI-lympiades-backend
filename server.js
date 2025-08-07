const http = require("http");
const fs = require("fs");
const path = require("path");

const teamsPath = path.join(__dirname, "src", "data", "teams.json");
const challengesPath = path.join(__dirname, "src", "data", "challenges.json");
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
  if (challenge.disabled) return;
  const isWinner = challenge.winners.includes(teamId);
  const isExclusive = challenge.type === "rare" || challenge.type === "secret";
  if (isExclusive && !isWinner && challenge.winners.length > 0) return;

  if (isWinner) {
    challenge.winners = challenge.winners.filter((id) => id !== teamId);
    team.completedChallenges = team.completedChallenges.filter((id) => id !== challengeId);
    team.points -= challenge.points;
    if (team.points < 0) team.points = 0;
  } else {
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
  const winners = challenge.winners || [];
  winners.forEach((teamId) => {
    const team = findTeam(teamId);
    if (!team) return;
    const hasCompleted = team.completedChallenges.includes(challengeId);
    if (currentlyDisabled) {
      if (!hasCompleted) {
        team.completedChallenges.push(challengeId);
        team.points += challenge.points;
      }
    } else {
      if (hasCompleted) {
        team.completedChallenges = team.completedChallenges.filter((cid) => cid !== challengeId);
        team.points -= challenge.points;
        if (team.points < 0) team.points = 0;
      }
    }
  });
}

function swapPlayersBackend(playerId, targetTeamId, targetPlayerId) {
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
  teamA.players[idxA] = playerB;
  teamB.players[idxB] = playerA;
  teamA.points = teamA.points - playerA.personalPoints + playerB.personalPoints;
  teamB.points = teamB.points - playerB.personalPoints + playerA.personalPoints;
}

let suspenseMode = false;
let pauseUntil = null;

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
    default: return "application/octet-stream";
  }
}

const server = http.createServer((req, res) => {
  const { method, url } = req;

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (url.startsWith("/api/")) {
    // API logic remains unchanged, omitted here for brevity
    res.statusCode = 501;
    return res.end("API handler placeholder");
  }

  const filePath = path.join(staticDir, url === "/" ? "index.html" : url.split("?")[0]);
  fs.readFile(filePath, (err, content) => {
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