import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';

type Skotare = {
  id: string;
  fornamn: string;
  efternamn: string;
  email: string;
};

export function FastighetDetaljer() {
  const { id } = useParams<{ id: string }>();
  const [skotare, setSkotare] = useState<Skotare[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;

    const loadSkotare = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('fastighet_skotare')
        .select('skotare_id(id, fornamn, efternamn, email)')
        .eq('fastighet_id', id);

      if (error) {
        console.error(error.message);
        setSkotare([]);
      } else {
        setSkotare(data?.map((d: any) => d.skotare_id) ?? []);
      }

      setLoading(false);
    };

    loadSkotare();
  }, [id]);

  if (loading) return <div className="p-6 text-gray-700">Laddar skötare…</div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Skötare för fastigheten</h2>

      {skotare.length === 0 ? (
        <p className="text-gray-700">Ingen skötare kopplad ännu.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skotare.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/dashboard/users/${s.id}`)}
              className="px-3 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition"
            >
              {s.fornamn} {s.efternamn}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}