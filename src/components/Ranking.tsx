import React, { useEffect, useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { useData } from "../context/DataContext";

const Container = styled.div`
  width: 100%;
`;

const Row = styled.div<{ color: string; width: number }>`
  display: flex;
  align-items: center;
  margin-bottom: 0.7rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background-color: ${({ color }) => color}20;
  position: relative;
  &:after {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${({ width }) => width}%;
    background-color: ${({ color }) => color}80;
    border-radius: 6px;
    z-index: 0;
  }
`;

const RowContent = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  z-index: 1;
  position: relative;
`;

const TeamName = styled.span`
  font-weight: 600;
`;

const Points = styled.span`
  font-weight: 600;
`;

const Icon = styled.span`
  margin-right: 0.5rem;
`;

const Ranking: React.FC = () => {
  const { teams, challenges, suspenseMode, suspenseOrder } = useData();
  // Calculer les points de chaque équipe : points personnels + points de défis validés
  const computed = teams.map((team) => {
    const personal = team.players.reduce((sum, p) => sum + p.personalPoints, 0);
    const challengesPoints = challenges.reduce((sum, ch) => {
      if (!ch.disabled && ch.winners.includes(team.id)) {
        return sum + ch.points;
      }
      return sum;
    }, 0);
    const total = personal + challengesPoints;
    return { ...team, total };
  });
  let orderedTeams;
  if (suspenseMode && suspenseOrder.length === teams.length) {
    // Utiliser l'ordre aléatoire
    orderedTeams = suspenseOrder.map((id) => computed.find((t) => t.id === id)!).filter(Boolean);
  } else {
    // Trier par points décroissants
    orderedTeams = [...computed].sort((a, b) => b.total - a.total);
  }
  const maxPoints = orderedTeams[0]?.total || 1;
  // Émoticônes pour les positions : jusqu'à 10 équipes (le dernier est un emoji caca)
  const icons = [
    "🥇", // 1er
    "🥈", // 2e
    "🥉", // 3e
    "🏅", // 4e
    "🎖️", // 5e
    "🏵️", // 6e
    "🌟", // 7e
    "⭐", // 8e
    "✨", // 9e
    "💩", // 10e
  ];

  // Générer une animation de cycle de couleurs à partir des couleurs des équipes
  const colorAnimationName = useMemo(() => {
    // Créer un identifiant unique pour ce cycle
    const id = Math.random().toString(36).substring(2, 8);
    return `cycleColors_${id}`;
  }, []);
  const colorKeyframesStr = useMemo(() => {
    // Liste des couleurs à utiliser dans l'animation
    const cols = teams.map((t) => t.color);
    if (cols.length === 0) return '';
    // Construire les étapes de l'animation
    return cols
      .map((c, i) => {
        const pct = Math.round((i / cols.length) * 100);
        return `${pct}% { background-color: ${c}; }`;
      })
      .join(' ');
  }, [teams]);

  // Injecter dynamiquement le style des keyframes dans le document lorsque le composant est monté
  useEffect(() => {
    if (!suspenseMode || !colorKeyframesStr) return;
    const style = document.createElement('style');
    style.innerHTML = `@keyframes ${colorAnimationName} { ${colorKeyframesStr} 100% { background-color: ${teams[0]?.color || '#555555'}; } }`;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [suspenseMode, colorKeyframesStr, colorAnimationName, teams]);
  return (
    <Container>
      <h2 style={{ marginBottom: "1rem" }}>Classement</h2>
      {orderedTeams.map((team, index) => {
        // Lorsque le mode suspens est actif, on ne visualise pas la barre proportionnelle ni les points
        const width = suspenseMode ? 0 : Math.min((team.total / maxPoints) * 100, 100);
        const icon = icons[index] || "";
        return (
          <Row
            key={team.id}
            color={team.color}
            width={width}
            style={{
              animation: suspenseMode && colorKeyframesStr ? `${colorAnimationName} ${teams.length * 2}s linear infinite` : undefined,
              animationDelay: suspenseMode ? `${index * 1.5}s` : undefined,
            }}
          >
            <RowContent>
              <TeamName
                style={{ color: suspenseMode ? '#f5f5f5' : team.color }}
              >
                {icon && <Icon>{icon}</Icon>}
                {suspenseMode ? `Équipe ${index + 1}` : team.name}
              </TeamName>
              <Points style={{ color: suspenseMode ? '#f5f5f5' : team.color }}>
                {suspenseMode ? '???' : `${team.total} pts`}
              </Points>
            </RowContent>
          </Row>
        );
      })}
    </Container>
  );
};

export default Ranking;