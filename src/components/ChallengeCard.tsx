import React, { useState } from "react";
import styled from "styled-components";
import { Challenge } from "../types";
import { useData } from "../context/DataContext";

// Style du conteneur de carte
const Card = styled.div<{ $completed?: boolean; $color?: string }>`
  background-color: #1e1e1e;
  border: 2px solid
    ${({ $completed, $color }) =>
      $completed && $color
        ? $color
        : $completed
        ? "#4caf50"
        : "#333333"};
  border-radius: 8px;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  transition: background-color 0.2s, border-color 0.2s;
  cursor: pointer;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

// Icône de flèche indiquant que la carte est repliable
// Représentée par une flèche dans un cercle, positionnée à gauche du texte.
// Flèche indiquant l'état déplié/replié.
// On utilise un pseudo-élément pour dessiner une flèche "chevron" et
// on fait pivoter le conteneur lorsqu'il est ouvert.
const ArrowIcon = styled.span<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 0.5rem;
  cursor: pointer;
  transition: transform 0.3s ease;
  transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  &::before {
    content: '';
    display: block;
    width: 10px;
    height: 10px;
    border: solid 2px #bbb;
    border-width: 0 2px 2px 0;
    transform: rotate(-45deg);
  }
`;

const Title = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: #f5f5f5;
`;

const Points = styled.span`
  font-weight: 500;
  /* Couleur de points adaptée à la palette du logo */
  color: #e74c3c;
`;

const DotRow = styled.div`
  display: flex;
  gap: 0.3rem;
  margin-top: 0.3rem;
`;

const Dot = styled.span<{ $color: string; $filled: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  /* Le point est coloré lorsqu'il est rempli, sinon gris. */
  background-color: ${({ $filled, $color }) => ($filled ? $color : "#3a3a3a")};
  border: 1px solid ${({ $filled, $color }) => ($filled ? $color : "#3a3a3a")};
`;

const Description = styled.p`
  margin-top: 0.5rem;
  font-size: 0.95rem;
  line-height: 1.4;
  color: #cccccc;
`;

const Availability = styled.p`
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: #888888;
`;

export interface ChallengeCardProps {
  challenge: Challenge;
  /** Liste des pastilles représentant les équipes et leur état. */
  statuses?: { teamId: string; color: string; completed: boolean }[];
  /** Indique si ce défi est complété par l'équipe sélectionnée (vue par équipe). */
  completedByTeam?: boolean;
  /** Couleur principale à utiliser pour la bordure lorsqu'il est complété par l'équipe sélectionnée. */
  highlightColor?: string;
  /** Mode d'affichage : `all` pour la vue générale, `team` pour la vue par équipe. */
  mode: "all" | "team";
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  statuses,
  completedByTeam,
  highlightColor,
  mode,
}) => {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((o) => !o);
  const { suspenseMode } = useData();
  // Calculer la couleur de bordure en fonction du statut de complétion et de la couleur d'équipe.
  // En mode suspens, on ne met pas de couleur de bordure.
  // Si aucune équipe sélectionnée n'a complété mais qu'un highlightColor est fourni (défis rares/secrets dans la vue générale),
  // on utilise cette couleur pour entourer la carte.
  let borderColor: string;
  if (suspenseMode) {
    borderColor = "#333333";
  } else if (mode === "team") {
    // En vue par équipe, on n'utilise la couleur de bordure que si l'équipe sélectionnée a complété le défi
    if (completedByTeam) {
      borderColor = highlightColor ? highlightColor : "#4caf50";
    } else {
      borderColor = "#333333";
    }
  } else if (completedByTeam) {
    // Autres vues : si complété par l'équipe courante, surligner
    borderColor = highlightColor ? highlightColor : "#4caf50";
  } else if (highlightColor) {
    // En vue générale, afficher la couleur du gagnant pour les défis rares/secrets
    borderColor = highlightColor;
  } else {
    borderColor = "#333333";
  }

  // Adapter les pastilles et la complétion lorsqu'on est en mode suspens
  let displayStatuses = statuses;
  let teamCompleted = completedByTeam;
  let teamHighlight = highlightColor;
  if (suspenseMode) {
    // Pastilles grises et jamais remplies
    if (statuses) {
      displayStatuses = statuses.map((s) => ({
        ...s,
        color: "#3a3a3a",
        completed: false,
      }));
    }
    teamCompleted = false;
    teamHighlight = undefined;
  }
  return (
    <Card style={{ borderColor }} onClick={toggle}>
      <HeaderRow>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* La flèche est dessinée via un pseudo-élément dans ArrowIcon. */}
          <ArrowIcon $open={open} />
          <Title>{challenge.name}</Title>
        </div>
        <Points>{suspenseMode ? '???' : `${challenge.points} pts`}</Points>
      </HeaderRow>
      {/* En mode général, n'afficher que les pastilles des équipes ayant complété le défi. */}
      {mode === "all" && displayStatuses && displayStatuses.some((s) => s.completed) && (
        <DotRow>
          {displayStatuses
            .filter((s) => s.completed)
            .map((s) => (
              <Dot key={s.teamId} $color={s.color} $filled={true} />
            ))}
        </DotRow>
      )}
      {/* En vue par équipe, ne pas afficher de pastille. La bordure colorée indique la validation éventuelle. */}
      {open && (
        <>
          <Description>{challenge.description}</Description>
          <Availability>
            Disponible depuis le {new Date(challenge.availableAt).toLocaleString("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </Availability>
        </>
      )}
    </Card>
  );
};

export default ChallengeCard;