import ManageTeamClient from "@/components/ManageTeamClient";
import { findTeamByManageToken, toPublicTeam } from "@/lib/db";

export const dynamic = "force-dynamic";

type ManagePageProps = {
  params: Promise<{ token: string }>;
};

export default async function ManageTeamPage({ params }: ManagePageProps) {
  const { token } = await params;
  const team = await findTeamByManageToken(token);

  if (!team) {
    return (
      <main className="page">
        <p className="field__error">Команда не найдена</p>
      </main>
    );
  }

  return <ManageTeamClient token={token} initialTeam={toPublicTeam(team)} />;
}
