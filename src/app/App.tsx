import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigPage } from '../features/config/ConfigPage';
import { PreviewPage } from '../features/preview/PreviewPage';
import { PlayerPage } from '../features/player/PlayerPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { LibraryPage } from '../features/library/LibraryPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { Layout } from './Layout';
import { ErrorBoundary } from './ErrorBoundary';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            index
            element={
              <ErrorBoundary>
                <ConfigPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="preview/:planId"
            element={
              <ErrorBoundary>
                <PreviewPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="play/:planId"
            element={
              <ErrorBoundary>
                <PlayerPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="history"
            element={
              <ErrorBoundary>
                <HistoryPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="library"
            element={
              <ErrorBoundary>
                <LibraryPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="settings"
            element={
              <ErrorBoundary>
                <SettingsPage />
              </ErrorBoundary>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
