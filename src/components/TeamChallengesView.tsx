import React, { useState } from "react";
import styled from "styled-components";
import SelectInput from "./common/SelectInput";
import { useData } from "../context/DataContext";
import ChallengeCard from "./ChallengeCard";

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.3rem;
  margin-bottom: 0.5rem;
  color: #f5f5f5;
  text-align: center;
`;


const TeamChallengesView: React.FC = () => {
  const { teams, challenges } = useData();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    teams.length > 0 ? teams[0].id : ""
  );
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const now = new Date();
  if (!selectedTeam) return null;
  // Filtrer les défis disponibles
  // Filtrer les défis disponibles à la date actuelle et non désactivés
  const available = challenges.filter(
    (c) => new Date(c.availableAt) <= now && !c.disabled
  );
  // Catégories
  const normals = available.filter((c) => c.type === "normal");
  const rares = available.filter((c) => c.type === "rare");
  const secrets = available.filter((c) => c.type === "secret" && c.winners.length > 0);
  return (
    <div>
      <SelectInput
        value={selectedTeamId}
        onChange={(e) => setSelectedTeamId(e.target.value)}
        options={teams.map((team) => ({ value: team.id, label: team.name }))}
      />
      {normals.length > 0 && (
        <Section>
          <SectionTitle>Défis normaux</SectionTitle>
          {normals.map((challenge) => {
            const completed = challenge.winners.includes(selectedTeamId);
            return (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                completedByTeam={completed}
                highlightColor={selectedTeam.color}
                mode="team"
              />
            );
          })}
        </Section>
      )}
      {rares.length > 0 && (
        <Section>
          <SectionTitle>Défis rares</SectionTitle>
          {rares.map((challenge) => {
            const completed = challenge.winners.includes(selectedTeamId);
            let highlight: string | undefined;
            if (challenge.winners.length > 0) {
              const winningTeam = teams.find((t) => t.id === challenge.winners[0]);
              highlight = winningTeam?.color;
            }
            return (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                completedByTeam={completed}
                highlightColor={highlight}
                mode="team"
              />
            );
          })}
        </Section>
      )}
      {secrets.length > 0 && (
        <Section>
          <SectionTitle>Défis secrets</SectionTitle>
          {secrets.map((challenge) => {
            const completed = challenge.winners.includes(selectedTeamId);
            // Highlight with winner's color if any
            let highlight: string | undefined;
            if (challenge.winners.length > 0) {
              const winningTeam = teams.find((t) => t.id === challenge.winners[0]);
              highlight = winningTeam?.color;
            }
            return (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                completedByTeam={completed}
                highlightColor={highlight}
                mode="team"
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

export default TeamChallengesView;