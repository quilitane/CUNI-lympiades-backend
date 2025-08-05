import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.footer`
  margin-top: auto; /* Permet au footer de se coller en bas lorsque le conteneur utilise flex */
  padding: 1rem;
  text-align: center;
  font-size: 0.8rem;
  color: #888;
  border-top: 1px solid #333;
`;

const Link = styled.a`
  color: #03a9f4;
  text-decoration: underline;
  &:hover {
    color: #e74c3c;
  }
`;

const Footer: React.FC = () => {
  return (
    <Wrapper>
      <div>Site réalisé par Qui_lit_ane &amp; ChatGPT</div>
      <div>
        Contact&nbsp;
        <Link
          href="https://www.facebook.com/profile.php?id=100025477582049"
          target="_blank"
          rel="noopener noreferrer"
        >
          Facebook
        </Link>
      </div>
    </Wrapper>
  );
};

export default Footer;