/**
 * Definition des types utilisés dans l'application.
 */

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  /**
   * Points personnels attribués manuellement par l'admin. Ces points
   * contribuent au total de l'équipe mais ne sont pas visibles
   * individuellement pour les joueurs.
   */
  personalPoints: number;
};

export type Team = {
  id: string;
  /** Nom d'affichage de l'équipe (couleur ou nom custom). */
  name: string;
  /** Couleur principale utilisée pour identifier l'équipe. */
  color: string;
  /** Total de points de l'équipe (défis validés + points personnels). */
  points: number;
  /** Liste des identifiants de défis validés par l'équipe. */
  completedChallenges: string[];
  /** Membres de l'équipe. */
  players: Player[];
};

export type ChallengeType = "normal" | "rare" | "secret";

export type Challenge = {
  id: string;
  name: string;
  description: string;
  /** Nombre de points attribués pour ce défi. */
  points: number;
  /** Type de défi : normal, rare ou secret. */
  type: ChallengeType;
  /**
   * Date et heure de disponibilité ISO 8601 (ex: 2024-06-01T14:00:00).
   * Avant cette date, le défi n'est pas affiché aux joueurs.
   */
  availableAt: string;
  /**
   * Identifiants des équipes ayant validé ce défi.
   * Pour les défis rares, il n'y aura qu'une seule entrée dans cette liste.
   */
  winners: string[];
  /**
   * Indique si le défi est désactivé par un administrateur. Les défis désactivés ne
   * sont pas visibles côté joueurs et ne rapportent pas de points. On conserve
   * cependant la liste des équipes gagnantes afin de réappliquer les points si
   * le défi est réactivé.
   */
  disabled?: boolean;
};