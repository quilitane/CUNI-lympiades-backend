import React from "react";
import styled from "styled-components";
import Button from "./Button";

export interface MenuItem {
  key: string;
  label: string;
}

export interface MenuBarProps {
  items: MenuItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

// Le menu est affiché comme un contrôle segmenté avec un indicateur coulissant.
const Bar = styled.div<{ count: number; index: number }>`
  display: flex;
  justify-content: space-between;
  position: relative;
  border: 1px solid #444; /* Réduire l'épaisseur et assombrir légèrement la bordure */
  border-radius: 6px; /* Coins moins arrondis pour un aspect plus compact */
  overflow: hidden;
  margin-bottom: 1rem;
  background-color: #2b2b2b;
  /* Ombre subtile pour donner du relief */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  &::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: ${({ count }) => 100 / count}%;
    /* Couleur de surlignage mise à jour pour correspondre à la couleur principale du logo */
    background-color: #e74c3c;
    border-radius: 4px;
    transform: translateX(${({ index }) => index * 100}%);
    transition: transform 0.3s ease;
  }
`;

const SegmentButton = styled.button<{ $active: boolean }>`
  flex: 1;
  border: none;
  background: none;
  padding: 0.4rem 0.6rem; /* Réduire la hauteur des segments */
  font-size: 0.8rem; /* Réduire légèrement la taille de police */
  font-weight: 600;
  cursor: pointer;
  z-index: 1;
  color: ${({ $active }) => ($active ? "#0a0a0a" : "#f5f5f5")};
  text-align: center; /* Centrer le texte des segments */
  transition: color 0.3s;
`;

const MenuBar: React.FC<MenuBarProps> = ({ items, activeKey, onChange }) => {
  const index = items.findIndex((i) => i.key === activeKey);
  return (
    <Bar count={items.length} index={index < 0 ? 0 : index}>
      {items.map((item) => (
        <SegmentButton
          key={item.key}
          $active={activeKey === item.key}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </SegmentButton>
      ))}
    </Bar>
  );
};

export default MenuBar;