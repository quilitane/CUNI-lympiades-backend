import React, { createContext, useContext, useEffect, useState } from "react";
import type { Team, Challenge } from "../types";

interface DataContextValue {
  teams: Team[];
  challenges: Challenge[];
  /** Indique si le mode suspens est activé. */
  suspenseMode: boolean;
  /** Ordre aléatoire des équipes lorsqu'on est en mode suspens. */
  suspenseOrder: string[];
  /** Date ISO de reprise de la pause ou null si pas de pause. */
  pauseUntil: string | null;
  /** Met à jour l'état d'un défi pour une équipe. */
  toggleChallengeValidation: (teamId: string, challengeId: string) => void;
  /** Ajoute des points personnels à un joueur et met à jour l'équipe. */
  addPersonalPoints: (teamId: string, playerId: string, amount: number) => void;
  /** Active ou désactive un défi. Les défis désactivés ne rapportent pas de points et ne sont pas affichés aux joueurs. */
  toggleChallengeDisabled: (challengeId: string) => void;
  /** Active ou désactive le mode suspens. */
  setSuspense: (active: boolean) => void;
  /** Démarre une pause jusqu'à la date fournie (ISO). */
  startPause: (resumeAt: string) => void;
  /** Annule la pause en cours. */
  cancelPause: () => void;

  /**
   * Échange deux joueurs entre équipes. On fournit l'identifiant du joueur à déplacer,
   * l'identifiant de l'équipe cible et l'identifiant du joueur de cette équipe avec lequel
   * effectuer l'échange. Les points personnels sont conservés et les totaux d'équipe
   * sont ajustés en conséquence.
   */
  swapPlayers: (
    playerId: string,
    targetTeamId: string,
    targetPlayerId: string
  ) => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

/**
 * Charge les données initiales depuis le stockage local ou les fichiers JSON statiques.
 */
async function loadInitialData(): Promise<{
  teams: Team[];
  challenges: Challenge[];
}> {
  // 1. Vérifier le localStorage
  try {
    const stored = localStorage.getItem("cunilyData");
    if (stored) {
      const parsed = JSON.parse(stored);
      // Vérifier que les données stockées contiennent au moins une équipe et un défi
      if (
        Array.isArray(parsed.teams) &&
        Array.isArray(parsed.challenges) &&
        parsed.teams.length > 0 &&
        parsed.challenges.length > 0
      ) {
        return parsed;
      }
      // Si les données sont vides ou corrompues, on les ignore
      localStorage.removeItem("cunilyData");
    }
  } catch (err) {
    console.warn(
      "Impossible de récupérer les données depuis le localStorage:",
      err
    );
  }
  // 2. Tenter de charger depuis le backend
  try {
    const [teamsRes, challengesRes] = await Promise.all([
      fetch("https://cuni-lympiades-backend.onrender.com/api/teams"),
      fetch("https://cuni-lympiades-backend.onrender.com/api/challenges"),
    ]);
    if (teamsRes.ok && challengesRes.ok) {
      const teams: Team[] = (await teamsRes.json()) as unknown as Team[];
      const challenges: Challenge[] =
        (await challengesRes.json()) as unknown as Challenge[];
      return { teams, challenges };
    }
  } catch (err) {
    console.warn(
      "Erreur lors de la récupération des données depuis le backend :",
      err
    );
  }
  // 3. Fallback : importer les fichiers JSON statiques
  const teams: Team[] = (await import("../data/teams.json"))
    .default as unknown as Team[];
  const challenges: Challenge[] = (await import("../data/challenges.json"))
    .default as unknown as Challenge[];
  return { teams, challenges };
}

export const DataProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  // Mode suspens et ordre aléatoire : lorsque activé, les points sont masqués et l'ordre des équipes est fixe et aléatoire
  const [suspenseMode, setSuspenseMode] = useState<boolean>(false);
  const [suspenseOrder, setSuspenseOrder] = useState<string[]>([]);
  // Gestion des pauses : date ISO de reprise ou null
  const [pauseUntil, setPauseUntil] = useState<string | null>(null);

  // Chargement des données au premier rendu
  useEffect(() => {
    (async () => {
      const { teams: initTeams, challenges: initChallenges } =
        await loadInitialData();
      setTeams(initTeams);
      setChallenges(initChallenges);
    })();
  }, []);

  // Charger les paramètres (suspense et pause) depuis le localStorage et le backend au premier rendu
  useEffect(() => {
    (async () => {
      // D'abord, essayer de charger depuis le localStorage
      try {
        const storedSettings = localStorage.getItem("cunilySettings");
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          if (typeof parsed.suspenseMode === "boolean") {
            setSuspenseMode(parsed.suspenseMode);
          }
          if (Array.isArray(parsed.suspenseOrder)) {
            setSuspenseOrder(parsed.suspenseOrder);
          }
          if (
            typeof parsed.pauseUntil === "string" ||
            parsed.pauseUntil === null
          ) {
            setPauseUntil(parsed.pauseUntil ?? null);
          }
        }
      } catch (err) {
        console.warn(
          "Impossible de récupérer les paramètres dans le localStorage:",
          err
        );
      }
      // Ensuite, tenter de récupérer l'état global auprès du backend
      try {
        const res = await fetch(
          "https://cuni-lympiades-backend.onrender.com/api/state"
        );
        if (res.ok) {
          const data = await res.json();
          if (typeof data.suspenseMode === "boolean") {
            setSuspenseMode(data.suspenseMode);
          }
          if (data.pauseUntil === null || typeof data.pauseUntil === "string") {
            setPauseUntil(data.pauseUntil);
          }
        }
      } catch (err) {
        // Si le backend n'est pas disponible, ignorer silencieusement
        console.warn(
          "Impossible de récupérer l'état global depuis le backend:",
          err
        );
      }
    })();
  }, []);

  // Sauvegarder les données dans le localStorage à chaque modification
  useEffect(() => {
    const data = { teams, challenges };
    try {
      localStorage.setItem("cunilyData", JSON.stringify(data));
    } catch (err) {
      console.warn(
        "Impossible de sauvegarder les données dans le localStorage:",
        err
      );
    }
  }, [teams, challenges]);

  // Sauvegarder les paramètres (suspense et pause) dans le localStorage
  useEffect(() => {
    const settings = { suspenseMode, suspenseOrder, pauseUntil };
    try {
      localStorage.setItem("cunilySettings", JSON.stringify(settings));
    } catch (err) {
      console.warn(
        "Impossible de sauvegarder les paramètres dans le localStorage:",
        err
      );
    }
  }, [suspenseMode, suspenseOrder, pauseUntil]);

  const toggleChallengeValidation = async (
    teamId: string,
    challengeId: string
  ) => {
    // Mettre à jour localement
    setChallenges((prevChallenges) => {
      return prevChallenges.map((ch) => {
        if (ch.id !== challengeId) return ch;
        const isWinner = ch.winners.includes(teamId);
        const isExclusive = ch.type === "rare" || ch.type === "secret";
        if (isExclusive && !isWinner && ch.winners.length > 0) {
          // Un défi exclusif ne peut être validé que par une seule équipe
          return ch;
        }
        const updated = isWinner
          ? ch.winners.filter((id) => id !== teamId)
          : [...ch.winners, teamId];
        return { ...ch, winners: updated };
      });
    });
    setTeams((prevTeams) => {
      return prevTeams.map((team) => {
        if (team.id !== teamId) return team;
        const completedSet = new Set(team.completedChallenges);
        const hasCompleted = completedSet.has(challengeId);
        let newPoints = team.points;
        const challenge = challenges.find((c) => c.id === challengeId);
        if (challenge) {
          if (hasCompleted) {
            completedSet.delete(challengeId);
            newPoints -= challenge.points;
          } else {
            completedSet.add(challengeId);
            newPoints += challenge.points;
          }
        }
        return {
          ...team,
          completedChallenges: Array.from(completedSet),
          points: newPoints,
        };
      });
    });
    // Envoyer au backend
    try {
      await fetch("https://cuni-lympiades-backend.onrender.com/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, challengeId }),
      });
    } catch (err) {
      console.warn("Erreur d'envoi au backend:", err);
    }
  };

  /**
   * Active ou désactive un défi. Lorsque désactivé, les points sont retirés et
   * l'identifiant est supprimé de la liste des défis complétés pour les équipes gagnantes.
   * Lors de la réactivation, l'inverse est appliqué.
   */
  const toggleChallengeDisabled = async (challengeId: string) => {
    // Trouver l'état actuel du défi avant modification
    const currentChallenge = challenges.find((c) => c.id === challengeId);
    const currentlyDisabled = currentChallenge?.disabled === true;
    // Mettre à jour la liste des défis (flip disabled)
    setChallenges((prevChallenges) =>
      prevChallenges.map((ch) =>
        ch.id === challengeId ? { ...ch, disabled: !currentlyDisabled } : ch
      )
    );
    // Mettre à jour les équipes : ajouter ou retirer les points en fonction du nouvel état
    if (currentChallenge) {
      setTeams((prevTeams) => {
        return prevTeams.map((team) => {
          const isWinner = currentChallenge.winners.includes(team.id);
          let newCompleted = [...team.completedChallenges];
          let newPoints = team.points;
          if (currentlyDisabled) {
            // Le défi était désactivé, on le réactive : ajouter points et ID aux gagnants
            if (isWinner && !newCompleted.includes(challengeId)) {
              newCompleted.push(challengeId);
              newPoints += currentChallenge.points;
            }
          } else {
            // Le défi était actif, on le désactive : retirer points et ID
            if (isWinner && newCompleted.includes(challengeId)) {
              newCompleted = newCompleted.filter((cid) => cid !== challengeId);
              newPoints -= currentChallenge.points;
              if (newPoints < 0) newPoints = 0;
            }
          }
          return {
            ...team,
            completedChallenges: newCompleted,
            points: newPoints,
          };
        });
      });
    }
    // Envoyer la mise à jour au backend
    try {
      await fetch(
        "https://cuni-lympiades-backend.onrender.com/api/toggleDisabled",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId }),
        }
      );
    } catch (err) {
      console.warn("Erreur d'envoi au backend (toggleDisabled):", err);
    }
  };

  const addPersonalPoints = async (
    teamId: string,
    playerId: string,
    amount: number
  ) => {
    // Mettre à jour localement
    setTeams((prevTeams) => {
      return prevTeams.map((team) => {
        if (team.id !== teamId) return team;
        const updatedPlayers = team.players.map((player) => {
          if (player.id !== playerId) return player;
          return { ...player, personalPoints: player.personalPoints + amount };
        });
        return {
          ...team,
          players: updatedPlayers,
          points: team.points + amount,
        };
      });
    });
    // Envoyer au backend
    try {
      await fetch(
        "https://cuni-lympiades-backend.onrender.com/api/addPersonalPoints",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId, playerId, amount }),
        }
      );
    } catch (err) {
      console.warn("Erreur d'envoi au backend:", err);
    }
  };

  /**
   * Active ou désactive le mode suspens. Lorsque activé, on génère un ordre aléatoire des équipes.
   */
  const setSuspense = (active: boolean) => {
    // Mettre à jour localement
    if (active) {
      // Mélanger la liste des identifiants d'équipes pour fixer un ordre
      const ids = teams.map((t) => t.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      setSuspenseOrder(ids);
      setSuspenseMode(true);
    } else {
      setSuspenseMode(false);
      setSuspenseOrder([]);
    }
    // Envoyer au backend pour qu'il persiste l'état global
    (async () => {
      try {
        await fetch(
          "https://cuni-lympiades-backend.onrender.com/api/setSuspense",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active }),
          }
        );
      } catch (err) {
        console.warn(
          "Erreur lors de l'envoi de l'état de suspens au backend:",
          err
        );
      }
    })();
  };

  /** Démarre une pause jusqu'à la date spécifiée (ISO 8601). */
  const startPause = (resumeAt: string) => {
    setPauseUntil(resumeAt);
    // Envoyer au backend pour fixer la pause
    (async () => {
      try {
        await fetch(
          "https://cuni-lympiades-backend.onrender.com/api/setPause",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeAt }),
          }
        );
      } catch (err) {
        console.warn(
          "Erreur lors de la définition de la pause au backend:",
          err
        );
      }
    })();
  };

  /** Annule la pause en cours. */
  const cancelPause = () => {
    setPauseUntil(null);
    // Envoyer au backend pour annuler la pause
    (async () => {
      try {
        await fetch(
          "https://cuni-lympiades-backend.onrender.com/api/setPause",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeAt: null }),
          }
        );
      } catch (err) {
        console.warn(
          "Erreur lors de l'annulation de la pause au backend:",
          err
        );
      }
    })();
  };

  /**
   * Échange deux joueurs entre équipes et met à jour les totaux de points des équipes.
   */
  const swapPlayers = async (
    playerId: string,
    targetTeamId: string,
    targetPlayerId: string
  ) => {
    setTeams((prevTeams) => {
      // Copie profonde minimale des équipes et de leurs joueurs
      const newTeams = prevTeams.map((team) => ({
        ...team,
        players: team.players.map((p) => ({ ...p })),
      }));
      let teamA: (typeof newTeams)[number] | undefined;
      let teamB: (typeof newTeams)[number] | undefined;
      let idxA = -1;
      let idxB = -1;
      // Trouver la première équipe et l'indice du joueur à déplacer
      for (const t of newTeams) {
        const i = t.players.findIndex((p) => p.id === playerId);
        if (i >= 0) {
          teamA = t;
          idxA = i;
          break;
        }
      }
      teamB = newTeams.find((t) => t.id === targetTeamId);
      if (!teamA || !teamB) return prevTeams;
      idxB = teamB.players.findIndex((p) => p.id === targetPlayerId);
      if (idxA < 0 || idxB < 0) return prevTeams;
      const playerA = teamA.players[idxA];
      const playerB = teamB.players[idxB];
      // Effectuer l'échange
      teamA.players[idxA] = playerB;
      teamB.players[idxB] = playerA;
      // Ajuster les points d'équipe (points personnels se déplacent avec le joueur)
      teamA.points =
        teamA.points - playerA.personalPoints + playerB.personalPoints;
      teamB.points =
        teamB.points - playerB.personalPoints + playerA.personalPoints;
      return newTeams;
    });
    // Envoyer au backend
    try {
      await fetch("https://cuni-lympiades-backend.onrender.com/api/swapPlayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, targetTeamId, targetPlayerId }),
      });
    } catch (err) {
      console.warn("Erreur lors de l'échange de joueurs au backend:", err);
    }
  };

  const value: DataContextValue = {
    teams,
    challenges,
    suspenseMode,
    suspenseOrder,
    pauseUntil,
    toggleChallengeValidation,
    addPersonalPoints,
    toggleChallengeDisabled,
    setSuspense,
    startPause,
    cancelPause,
    swapPlayers,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextValue => {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error(
      "useData doit être utilisé à l'intérieur d'un DataProvider"
    );
  }
  return ctx;
};
