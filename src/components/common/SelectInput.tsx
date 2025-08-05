import React from "react";
import styled from "styled-components";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

const StyledSelect = styled.select`
  background-color: #1f1f1f;
  color: #f5f5f5;
  border: 1px solid #444;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
`;

const SelectInput: React.FC<SelectInputProps> = ({ options, ...rest }) => {
  return (
    <StyledSelect {...rest}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </StyledSelect>
  );
};

export default SelectInput;