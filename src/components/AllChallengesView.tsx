import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { useData } from "../context/DataContext";
import ChallengeCard from "./ChallengeCard";
import SearchInput from "./common/SearchInput";
import SelectInput from "./common/SelectInput";

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.3rem;
  margin-bottom: 0.5rem;
  color: #f5f5f5;
  text-align: center;
`;

const AllChallengesView: React.FC = () => {
  const { teams, challenges } = useData();
  // État local pour la recherche et le tri
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("date");
  const now = new Date();

  // Préparer la liste des défis disponibles et non désactivés
  const filtered = useMemo(() => {
    // On part des défis disponibles selon la date et non désactivés
    let list = challenges.filter(
      (c) => new Date(c.availableAt) <= now && !c.disabled
    );
    // Appliquer la recherche sur le nom et la description (insensible à la casse)
    if (search.trim() !== "") {
      const lower = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.description.toLowerCase().includes(lower)
      );
    }
    // Appliquer le tri
    list = [...list].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        return new Date(a.availableAt).getTime() - new Date(b.availableAt).getTime();
      }
    });
    return list;
  }, [challenges, now, search, sortBy]);

  // Regrouper par type pour l'affichage
  const normals = filtered.filter((c) => c.type === "normal");
  const rares = filtered.filter((c) => c.type === "rare");
  const secrets = filtered.filter((c) => c.type === "secret" && c.winners.length > 0);

  return (
    <div>
      {/* Barre de recherche et tri */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <SearchInput
          placeholder="Rechercher un défi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <SelectInput
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: "date", label: "Par date" },
            { value: "name", label: "Par nom" },
          ]}
          style={{ flex: 1 }}
        />
      </div>
      {normals.length > 0 && (
        <Section>
          <SectionTitle>Défis normaux</SectionTitle>
          {normals.map((challenge) => {
            const statuses = teams.map((team) => ({
              teamId: team.id,
              color: team.color,
              completed: challenge.winners.includes(team.id),
            }));
            return (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                statuses={statuses}
                mode="all"
              />
            );
          })}
        </Section>
      )}
      {rares.length > 0 && (
        <Section>
          <SectionTitle>Défis rares</SectionTitle>
          {rares.map((challenge) => {
            // Pour les défis rares, afficher simplement une bordure de la couleur du gagnant s'il existe,
            // sans pastilles. On détermine la couleur de l'équipe gagnante.
            let highlight: string | undefined;
            if (challenge.winners.length > 0) {
              const winningTeam = teams.find((t) => t.id === challenge.winners[0]);
              highlight = winningTeam?.color;
            }
            return (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                highlightColor={highlight}
                mode="all"
              />
            );
          })}
        </Section>
      )}
      {secrets.length > 0 && (
        <Section>
          <SectionTitle>Défis secrets</SectionTitle>
          {secrets.map((challenge) => {
            // Comme pour les défis rares, les défis secrets affichent seulement la bordure colorée du gagnant,
            // et aucune pastille n'est affichée.
            let highlight: string | undefined;
            if (challenge.winners.length > 0) {
              const winningTeam = teams.find((t) => t.id === challenge.winners[0]);
              highlight = winningTeam?.color;
            }
            return (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                highlightColor={highlight}
                mode="all"
              />
            );
          })}
        </Section>
      )}
      {normals.length === 0 && rares.length === 0 && secrets.length === 0 && (
        <p>Aucun défi disponible pour l'instant.</p>
      )}
    </div>
  );
};

export default AllChallengesView;