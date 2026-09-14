import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

// One client for the whole app. Data comes from IPC, not HTTP, so the usual
// window-focus/reconnect refetch triggers don't apply here — freshness is
// driven entirely by explicit `invalidateQueries` calls (on `sync:updated`)
// and by mutations' own optimistic updates, not by react-query's own polling.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
