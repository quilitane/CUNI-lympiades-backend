import React from "react";
import styled from "styled-components";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Variante visuelle. "primary" par défaut, sinon "secondary", "success" ou "danger".
   */
  variant?: "primary" | "secondary" | "success" | "danger";
}

// Palette de couleurs pour les différentes variantes
const variantStyles: Record<string, { background: string; color: string }> = {
  // Couleurs mises à jour pour correspondre à la palette du logo
  primary: { background: "#e74c3c", color: "#0a0a0a" },
  secondary: { background: "#2b2b2b", color: "#f5f5f5" },
  success: { background: "#4caf50", color: "#0a0a0a" },
  danger: { background: "#c0392b", color: "#0a0a0a" },
};

const StyledButton = styled.button<{ variant: string }>`
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
  color: ${({ variant }) => variantStyles[variant].color};
  background-color: ${({ variant }) => variantStyles[variant].background};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
  &:hover {
    filter: brightness(1.05);
  }
`;

const Button: React.FC<ButtonProps> = ({ variant = "primary", children, ...rest }) => {
  return (
    <StyledButton variant={variant} {...rest}>
      {children}
    </StyledButton>
  );
};

export default Button;