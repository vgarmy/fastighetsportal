import { useUser } from './userContext';

export function Dashboard() {
  const { user } = useUser();

  if (!user) return <div>Laddar…</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Välkommen, {user.fornamn}!</h1>

      {user.roll === 'superadmin' && (
        <div className="p-4 bg-red-100 rounded mb-4">
          <h2 className="font-semibold">Superadmin-panel</h2>
          <p>Här kan du se allt och hantera användare.</p>
        </div>
      )}

      {user.roll === 'admin' && (
        <div className="p-4 bg-blue-100 rounded mb-4">
          <h2 className="font-semibold">Admin-panel</h2>
          <p>Här kan du hantera vissa delar av systemet.</p>
        </div>
      )}

      {user.roll === 'user' && (
        <div className="p-4 bg-green-100 rounded mb-4">
          <h2 className="font-semibold">Vanlig användare</h2>
          <p>Du har begränsad åtkomst.</p>
        </div>
      )}
    </div>
  );
}
