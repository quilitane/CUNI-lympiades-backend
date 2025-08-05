import React, { useState } from "react";
import styled from "styled-components";
import { useData } from "../context/DataContext";
import type { Player } from "../types";
import MenuBar from "../components/common/MenuBar";
import Button from "../components/common/Button";
import SelectInput from "../components/common/SelectInput";
import SearchInput from "../components/common/SearchInput";
import ConfirmModal from "../components/common/ConfirmModal";
import Footer from "../components/common/Footer";

const Container = styled.div`
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.4rem;
  margin-bottom: 1rem;
  color: #f5f5f5;
  text-align: center;
`;

const ChallengeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #1e1e1e;
  border: 1px solid #333;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
`;

// Utiliser des préfixes de props (ex: $active, $color) pour qu'elles ne soient pas
// transmises au DOM et éviter les warnings React du type « non-boolean attribute ».
const TeamToggle = styled.button<{ $active: boolean; $color: string; disabled?: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid ${({ $color }) => $color};
  background-color: ${({ $active, $color }) => ($active ? $color : "transparent")};
  opacity: ${({ disabled }) => (disabled ? 0.4 : 1)};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  margin-right: 0.3rem;
`;

const SaveButton = styled.button`
  background-color: #e74c3c;
  border: none;
  color: #0a0a0a;
  padding: 0.4rem 0.7rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.9rem;
`;

const PlayerRow = styled.div<{ $teamColor: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  border: 2px solid ${({ $teamColor }) => $teamColor};
  /* Teinter légèrement l'intérieur avec un fond translucide basé sur la couleur d'équipe. Utiliser une opacité plus marquée pour être moins transparent */
  background-color: ${({ $teamColor }) => `${$teamColor}40`};
`;

const Input = styled.input`
  width: 60px;
  padding: 0.2rem 0.4rem;
  border: 1px solid #555;
  border-radius: 4px;
  background-color: #2b2b2b;
  color: #f5f5f5;
  margin-right: 0.5rem;
  text-align: center;
`;

const ActionButton = styled.button`
  background-color: #03a9f4;
  color: #0a0a0a;
  border: none;
  padding: 0.35rem 0.6rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.9rem;
`;


const AdminPage: React.FC = () => {
  const {
    teams,
    challenges,
    toggleChallengeValidation,
    addPersonalPoints,
    toggleChallengeDisabled,
    suspenseMode,
    pauseUntil,
    setSuspense,
    startPause,
    cancelPause,
    swapPlayers,
  } = useData();
  // Onglet actif (gestion des défis, points personnels ou gestion globale)
  const [activeTab, setActiveTab] = useState<'challenges' | 'points' | 'global' | 'players'>('challenges');

  // État pour l'onglet gestion des joueurs
  const [playerTabQuery, setPlayerTabQuery] = useState('');
  const [movingPlayer, setMovingPlayer] = useState<null | (Player & { teamId: string; teamName: string })>(null);
  const [targetTeamId, setTargetTeamId] = useState('');
  const [targetPlayerId, setTargetPlayerId] = useState('');
  // Recherche et tri pour les défis
  const [challengeQuery, setChallengeQuery] = useState('');
  const [sortOption, setSortOption] = useState<'name' | 'date'>('date');
  // Recherche pour les joueurs et champs de points
  const [searchQuery, setSearchQuery] = useState('');
  const [pointInputs, setPointInputs] = useState<Record<string, string>>({});
  // État de confirmation générique : message à afficher et fonction à exécuter en cas de confirmation
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  // Liste plate des joueurs pour recherche
  const allPlayers = teams.flatMap((team) =>
    team.players.map((player) => ({
      ...player,
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
    }))
  );
  const filteredPlayers = allPlayers.filter((p) => {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });
  // Calculer les listes de défis selon la date actuelle
  const now = new Date();
  const availableChallenges = challenges.filter((c) => new Date(c.availableAt) <= now);
  const upcomingChallenges = challenges.filter((c) => new Date(c.availableAt) > now);
  const filterByQuery = (list: typeof challenges) =>
    list.filter((c) => c.name.toLowerCase().includes(challengeQuery.toLowerCase()));
  let filteredAvailable = filterByQuery(availableChallenges);
  let filteredUpcoming = filterByQuery(upcomingChallenges);
  const sortFn = (a: typeof challenges[number], b: typeof challenges[number]) => {
    if (sortOption === 'name') {
      return a.name.localeCompare(b.name);
    }
    return new Date(a.availableAt).getTime() - new Date(b.availableAt).getTime();
  };
  filteredAvailable = [...filteredAvailable].sort(sortFn);
  filteredUpcoming = [...filteredUpcoming].sort(sortFn);
  const types = [
    { title: 'Défis normaux', type: 'normal' },
    { title: 'Défis rares', type: 'rare' },
    { title: 'Défis secrets', type: 'secret' },
  ] as const;

  // State pour la date/heure de reprise lors de la mise en pause
  const [pauseInput, setPauseInput] = useState('');
  return (
    <Container>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Interface administrateur</h1>
      {/* Barre de navigation pour sélectionner l'onglet */}
      <MenuBar
        items={[
          { key: 'challenges', label: 'Gestion des défis' },
          { key: 'points', label: 'Points personnels' },
          { key: 'players', label: 'Gestion des joueurs' },
          { key: 'global', label: 'Gestion globale' },
        ]}
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as any)}
      />
      {/* Contenu de l'onglet Gestion des défis */}
      {activeTab === 'challenges' && (
        <Section>
          <SectionTitle>Gestion des défis</SectionTitle>
          {/* Recherche et tri */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <SearchInput
              placeholder="Rechercher un défi..."
              value={challengeQuery}
              onChange={(e) => setChallengeQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <SelectInput
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              options={[
                { value: 'date', label: 'Trier par date' },
                { value: 'name', label: 'Trier par nom' },
              ]}
              style={{ flex: 1 }}
            />
          </div>
          {types.map(({ title, type }) => {
            const list = filteredAvailable.filter((c) => c.type === type);
            if (list.length === 0) return null;
            return (
              <div key={type} style={{ marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
                {list.map((challenge) => {
                  const isExclusive = challenge.type === 'rare' || challenge.type === 'secret';
                  const winner = isExclusive && challenge.winners.length > 0 ? challenge.winners[0] : null;
                  return (
                    <ChallengeRow key={challenge.id} style={{ opacity: challenge.disabled ? 0.5 : 1 }}>
                      {/* Partie gauche : titre, pastilles et description */}
                      <div style={{ flex: 1 }}>
                        {/* Titre */}
                        <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>{challenge.name}</div>
                        {/* Pastilles des équipes sur deux lignes */}
                        {(() => {
                          const columns = Math.ceil(teams.length / 2);
                          return (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${columns}, 20px)`,
                                gap: '0.3rem',
                                marginBottom: '0.4rem',
                              }}
                            >
                              {teams.map((team) => {
                                const active = challenge.winners.includes(team.id);
                                const disabled = Boolean(
                                  challenge.disabled || (isExclusive && winner && winner !== team.id)
                                );
                                return (
                                  <TeamToggle
                                    key={team.id}
                                    $active={active}
                                    $color={team.color}
                                    disabled={disabled}
                                    onClick={() => {
                                      if (!disabled) {
                                        toggleChallengeValidation(team.id, challenge.id);
                                      }
                                    }}
                                  />
                                );
                              })}
                            </div>
                          );
                        })()}
                        {/* Description */}
                        <div style={{ fontSize: '0.8rem', color: '#999' }}>{challenge.description}</div>
                      </div>
                      {/* Partie droite : points au-dessus du bouton activer/désactiver */}
                      <div
                        style={{
                          marginLeft: '0.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#777', marginBottom: '0.4rem', whiteSpace: 'nowrap' }}>
                          {challenge.points} pts
                        </div>
                        <Button
                          variant={challenge.disabled ? 'success' : 'danger'}
                          style={{ fontSize: '0.8rem' }}
                          onClick={() => {
                            const message = challenge.disabled
                              ? 'Réactiver ce défi ? Cela ajoutera à nouveau les points aux équipes gagnantes.'
                              : 'Désactiver ce défi ? Cela retirera les points des équipes gagnantes et le rendra invisible aux joueurs.';
                            setConfirmAction({
                              message,
                              onConfirm: () => {
                                toggleChallengeDisabled(challenge.id);
                              },
                            });
                          }}
                        >
                          {challenge.disabled ? 'Activer' : 'Désactiver'}
                        </Button>
                      </div>
                    </ChallengeRow>
                  );
                })}
              </div>
            );
          })}
          {filteredUpcoming.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Prochains défis</h3>
              {filteredUpcoming.map((challenge) => (
                <ChallengeRow key={challenge.id} style={{ opacity: challenge.disabled ? 0.5 : 1 }}>
                  {/* Partie gauche : titre, description et date de disponibilité */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>{challenge.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '0.4rem' }}>
                      {challenge.description}
                    </div>
                    {/* Rareté du défi */}
                    <div
                      style={{ fontSize: '0.75rem', color: '#777', fontStyle: 'italic', marginBottom: '0.4rem' }}
                    >
                      Rareté&nbsp;: {challenge.type === 'normal' ? 'Normal' : challenge.type === 'rare' ? 'Rare' : 'Secret'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#555' }}>
                      Disponible le{' '}
                      {new Date(challenge.availableAt).toLocaleString('fr-FR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </div>
                  </div>
                  {/* Partie droite : points puis bouton activer/désactiver */}
                  <div
                    style={{
                      marginLeft: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: '#777', marginBottom: '0.4rem', whiteSpace: 'nowrap' }}>
                      {challenge.points} pts
                    </div>
                    <Button
                      variant={challenge.disabled ? 'success' : 'danger'}
                      style={{ fontSize: '0.8rem' }}
                      onClick={() => {
                        const message = challenge.disabled
                          ? 'Réactiver ce défi ? Cela ajoutera à nouveau les points aux équipes gagnantes.'
                          : 'Désactiver ce défi ? Cela retirera les points des équipes gagnantes et le rendra invisible aux joueurs.';
                        setConfirmAction({
                          message,
                          onConfirm: () => {
                            toggleChallengeDisabled(challenge.id);
                          },
                        });
                      }}
                    >
                      {challenge.disabled ? 'Activer' : 'Désactiver'}
                    </Button>
                  </div>
                </ChallengeRow>
              ))}
            </div>
          )}
        </Section>
      )}
      {/* Contenu de l'onglet Points personnels */}
      {activeTab === 'points' && (
        <Section>
          <SectionTitle>Ajouter des points personnels</SectionTitle>
          <SearchInput
            placeholder="Rechercher un joueur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            /* Ajout d'un espace sous la barre de recherche pour aérer la liste */
            style={{ marginBottom: '0.8rem' }}
          />
          {filteredPlayers.map((player) => {
            const key = player.id;
            return (
              <PlayerRow key={player.id} $teamColor={player.teamColor}>
                <div style={{ flex: 1 }}>
                  {player.firstName} {player.lastName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    value={pointInputs[key] || ''}
                    onChange={(e) => setPointInputs({ ...pointInputs, [key]: e.target.value })}
                    style={{
                      width: '60px',
                      padding: '0.2rem 0.4rem',
                      border: '1px solid #555',
                      borderRadius: '4px',
                      backgroundColor: '#2b2b2b',
                      color: '#f5f5f5',
                      marginRight: '0.5rem',
                      textAlign: 'center',
                    }}
                  />
                  <Button
                    variant="primary"
                    onClick={() => {
                      const amount = parseInt(pointInputs[key], 10);
                      if (!isNaN(amount) && amount > 0) {
                        addPersonalPoints(player.teamId, player.id, amount);
                        setPointInputs({ ...pointInputs, [key]: '' });
                      }
                    }}
                  >
                    Ajouter
                  </Button>
                </div>
              </PlayerRow>
            );
          })}
          {filteredPlayers.length === 0 && <p>Aucun joueur correspondant.</p>}
        </Section>
      )}
      {/* Contenu de l'onglet Gestion des joueurs */}
      {activeTab === 'players' && (
        <Section>
          <SectionTitle>Gestion des joueurs</SectionTitle>
          {/* Barre de recherche */}
          <SearchInput
            placeholder="Rechercher un joueur..."
            value={playerTabQuery}
            onChange={(e) => setPlayerTabQuery(e.target.value)}
            style={{ marginBottom: '0.8rem' }}
          />
          {/* Si aucun joueur n'est sélectionné pour échange */}
          {!movingPlayer && (
            <>
              {allPlayers
                .filter((p) => {
                  const q = playerTabQuery.toLowerCase();
                  return (
                    p.firstName.toLowerCase().includes(q) ||
                    p.lastName.toLowerCase().includes(q) ||
                    `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
                  );
                })
                .map((player) => (
                  <PlayerRow key={player.id} $teamColor={player.teamColor}>
                    {/* On n'affiche plus la mention de l'équipe ici ; la bordure colorée et le fond suffisent */}
                    <div style={{ flex: 1 }}>
                      {player.firstName} {player.lastName}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setMovingPlayer(player);
                        setTargetTeamId('');
                        setTargetPlayerId('');
                      }}
                    >
                      Échanger
                    </Button>
                  </PlayerRow>
                ))}
              {allPlayers.filter((p) => {
                const q = playerTabQuery.toLowerCase();
                return (
                  p.firstName.toLowerCase().includes(q) ||
                  p.lastName.toLowerCase().includes(q) ||
                  `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
                );
              }).length === 0 && <p>Aucun joueur correspondant.</p>}
            </>
          )}
          {/* Interface d'échange */}
          {movingPlayer && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ marginBottom: '0.5rem' }}>
                Sélectionnez l'équipe et le joueur avec lequel échanger{' '}
                <strong>
                  {movingPlayer.firstName} {movingPlayer.lastName}
                </strong>{' '}
                (actuellement dans {movingPlayer.teamName}).
              </p>
              {/* Sélection de l'équipe cible */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <SelectInput
                  value={targetTeamId}
                  onChange={(e) => {
                    setTargetTeamId(e.target.value);
                    setTargetPlayerId('');
                  }}
                  options={[
                    { value: '', label: '-- choisir une équipe --', disabled: true },
                    ...teams
                      .filter((t) => t.id !== movingPlayer.teamId)
                      .map((t) => ({ value: t.id, label: t.name })),
                  ]}
                />
                {targetTeamId && (
                  <SelectInput
                    value={targetPlayerId}
                    onChange={(e) => setTargetPlayerId(e.target.value)}
                    options={[
                      { value: '', label: '-- choisir un joueur --', disabled: true },
                      ...teams
                        .find((t) => t.id === targetTeamId)!
                        .players.map((p) => ({
                          value: p.id,
                          label: `${p.firstName} ${p.lastName}`,
                        })),
                    ]}
                  />
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  variant="primary"
                  disabled={!targetTeamId || !targetPlayerId}
                  onClick={() => {
                    const selectedTeam = teams.find((t) => t.id === targetTeamId);
                    const selectedPlayer = selectedTeam?.players.find((p) => p.id === targetPlayerId);
                    if (!selectedTeam || !selectedPlayer) return;
                    setConfirmAction({
                      message: `Confirmer l'échange entre ${movingPlayer.firstName} ${movingPlayer.lastName} et ${selectedPlayer.firstName} ${selectedPlayer.lastName} ?`,
                      onConfirm: () => {
                        swapPlayers(movingPlayer.id, targetTeamId, targetPlayerId);
                        // Réinitialiser l'état local
                        setMovingPlayer(null);
                        setTargetTeamId('');
                        setTargetPlayerId('');
                        setPlayerTabQuery('');
                      },
                    });
                  }}
                >
                  Échanger
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMovingPlayer(null);
                    setTargetTeamId('');
                    setTargetPlayerId('');
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </Section>
      )}
      {/* Contenu de l'onglet Gestion globale */}
      {activeTab === 'global' && (
        <Section>
          <SectionTitle>Gestion globale</SectionTitle>
          {/* Mode suspens */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>Mode suspens</h4>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#ccc' }}>
              Lorsque le mode suspens est activé, les classements sont aléatoires et les points sont
              masqués pour les joueurs.
            </p>
            <Button
              variant={suspenseMode ? 'danger' : 'success'}
              onClick={() => {
                const msg = suspenseMode
                  ? 'Désactiver le mode suspens ? Le classement redeviendra normal.'
                  : 'Activer le mode suspens ? Le classement sera aléatoire et les points seront masqués.';
                setConfirmAction({
                  message: msg,
                  onConfirm: () => {
                    setSuspense(!suspenseMode);
                  },
                });
              }}
            >
              {suspenseMode ? 'Désactiver le mode suspens' : 'Activer le mode suspens'}
            </Button>
          </div>
          {/* Pause */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>Pause de jeu</h4>
            {pauseUntil && new Date(pauseUntil) > now ? (
              <>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#ccc' }}>
                  La partie est en pause. Reprise prévue le{' '}
                  {new Date(pauseUntil).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}.
                </p>
                <Button
                  variant="danger"
                  onClick={() => {
                    setConfirmAction({
                      message: 'Annuler la pause en cours ? Les joueurs pourront reprendre la partie immédiatement.',
                      onConfirm: () => {
                        cancelPause();
                      },
                    });
                  }}
                >
                  Annuler la pause
                </Button>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#ccc' }}>
                  Définissez la date et l'heure de reprise pour mettre la partie en pause. Pendant la pause,
                  les fonctionnalités côté joueurs seront désactivées et un écran d’attente s’affichera.
                </p>
                <input
                  type="datetime-local"
                  value={pauseInput}
                  onChange={(e) => setPauseInput(e.target.value)}
                  style={{ padding: '0.3rem', border: '1px solid #555', borderRadius: '4px', marginRight: '0.5rem', backgroundColor: '#1f1f1f', color: '#f5f5f5' }}
                />
                <Button
                  variant="success"
                  disabled={!pauseInput}
                  onClick={() => {
                    if (!pauseInput) return;
                    const resumeDate = new Date(pauseInput);
                    if (isNaN(resumeDate.getTime())) return;
                    const iso = resumeDate.toISOString();
                    setConfirmAction({
                      message: `Mettre la partie en pause jusqu'au ${resumeDate.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} ?`,
                      onConfirm: () => {
                        startPause(iso);
                        setPauseInput('');
                      },
                    });
                  }}
                >
                  Mettre en pause
                </Button>
              </>
            )}
          </div>
        </Section>
      )}
      {/* Modal de confirmation générique */}
      {confirmAction && (
        <ConfirmModal
          message={confirmAction.message}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {/* Pied de page commun */}
      <Footer />
    </Container>
  );
};

export default AdminPage;