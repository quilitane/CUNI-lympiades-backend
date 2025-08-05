import React from "react";
import styled from "styled-components";

export interface SearchInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const StyledInput = styled.input`
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid #555;
  border-radius: 4px;
  /* Pas de marge par défaut pour permettre un meilleur alignement avec les sélecteurs */
  margin: 0;
  background-color: #1f1f1f;
  color: #f5f5f5;
`;

const SearchInput: React.FC<SearchInputProps> = (props) => {
  return <StyledInput type="text" {...props} />;
};

export default SearchInput;