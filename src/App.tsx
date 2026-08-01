import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { AccountDetailPage } from "@/features/account-detail/account-detail-page";
import { AccountsPage } from "@/features/accounts/accounts-page";
import { ComparePage } from "@/features/compare/compare-page";

// HashRouter (not BrowserRouter): Tauri serves index.html from a custom
// protocol where history-based routing does not resolve nested paths.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<AccountsPage />} />
          <Route path="account/:accountId" element={<AccountDetailPage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
