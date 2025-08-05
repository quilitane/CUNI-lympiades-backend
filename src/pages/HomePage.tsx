import React, { useState } from "react";
import styled from "styled-components";
import AllChallengesView from "../components/AllChallengesView";
import TeamChallengesView from "../components/TeamChallengesView";
import Ranking from "../components/Ranking";
import { useData } from "../context/DataContext";
import MenuBar from "../components/common/MenuBar";
import Footer from "../components/common/Footer";

// Styled-components pour l'interface des onglets
const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  /* Permet au footer de se placer en bas lorsque le contenu est court */
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;


const HomePage: React.FC = () => {
  const [tab, setTab] = useState<"all" | "team" | "ranking">("all");
  const { pauseUntil } = useData();
  const now = new Date();
  const isPaused = pauseUntil !== null && new Date(pauseUntil) > now;

  return (
    <Container>
      {/* Remplacer le titre textuel par le logo */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <img
          src="/logo.png"
          alt="CUNIlympiades logo"
          /* Réduire la taille du logo pour une meilleure intégration */
          style={{ maxWidth: "180px", height: "auto" }}
        />
      </div>
      {isPaused ? (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⏸️ La partie est en pause</p>
          <p style={{ fontSize: '1.1rem' }}>
            Reprise prévue le {new Date(pauseUntil!).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
      ) : (
        <>
          <MenuBar
            items={[
              { key: 'all', label: 'Tous les défis' },
              { key: 'team', label: 'Par équipe' },
              { key: 'ranking', label: 'Classement' },
            ]}
            activeKey={tab}
            onChange={(key) => setTab(key as any)}
          />
          {tab === 'all' && <AllChallengesView />}
          {tab === 'team' && <TeamChallengesView />}
          {tab === 'ranking' && <Ranking />}
        </>
      )}
      {/* Pied de page commun */}
      <Footer />
    </Container>
  );
};

export default HomePage;