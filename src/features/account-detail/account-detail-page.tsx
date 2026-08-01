import { Navigate, useParams } from "react-router-dom";

import { AccountDetail } from "./account-detail";

export function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();

  if (!accountId) return <Navigate to="/" replace />;

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <AccountDetail accountId={accountId} />
    </div>
  );
}
