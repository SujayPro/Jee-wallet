import React from 'react';
import { Container } from './shared/container';

export const OpenPopupInfo = () => {
  return (
    <Container className="jee-shell flex-column justify-content-center align-items-center p-4 text-center">
      <img src="https://jee.money/assets/logo/jee-chain.png" alt="JEE" height={48} width={48} style={{borderRadius: 8}} />
      <h4 className="mt-3 mb-2" style={{fontSize: '1rem', fontWeight: 600}}>Complete setup in the browser tab</h4>
      <p className="text-muted mb-0" style={{fontSize: '0.8125rem', lineHeight: 1.5}}>
        Wallet registration and import open in a full browser tab for security and reliability.
        Check the JEE WALLET tab that just opened and finish setup there.
      </p>
      <p className="text-muted mt-3 mb-0" style={{fontSize: '0.75rem'}}>
        After setup, use this side panel for daily sends and balance.
      </p>
    </Container>
  );
};
