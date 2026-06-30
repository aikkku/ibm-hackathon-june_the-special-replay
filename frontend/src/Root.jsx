import { useState } from 'react';
import LandingPage from './components/LandingPage';
import RulesPage from './components/RulesPage';
import App from './App';
import TutorialModal, { useTutorial } from './components/TutorialModal';

export default function Root() {
  const [page, setPage] = useState('landing'); // 'landing' | 'app' | 'rules'
  const { show: showTutorial, dismiss: dismissTutorial } = useTutorial();

  if (page === 'rules') {
    return <RulesPage onBack={() => setPage('landing')} onGoToApp={() => setPage('app')} />;
  }

  if (page === 'app') {
    return (
      <>
        <App onBack={() => setPage('landing')} onGoToRules={() => setPage('rules')} />
        {showTutorial && <TutorialModal onDismiss={dismissTutorial} />}
      </>
    );
  }

  return (
    <LandingPage
      onGoToApp={() => setPage('app')}
      onGoToRules={() => setPage('rules')}
    />
  );
}
