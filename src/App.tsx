import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/Dashboard';
import { InviteesPage } from '@/pages/Invitees';
import { RoutePlannerPage } from '@/pages/RoutePlanner';
import { TimelineBuilderPage } from '@/pages/TimelineBuilder';
import { MembersPage } from '@/pages/Members';
import { VendorsPage } from '@/pages/Vendors';
import { JoinByLinkPage } from '@/pages/JoinByLink';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthGuard>
          <Routes>
            <Route path="/join/:spaceId" element={<JoinByLinkPage />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/invitees" element={<InviteesPage />} />
              <Route path="/routes" element={<RoutePlannerPage />} />
              <Route path="/timeline" element={<TimelineBuilderPage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/team" element={<MembersPage />} />
            </Route>
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
