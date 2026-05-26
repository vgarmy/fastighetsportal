import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fornamn, setFornamn] = useState('');
  const [efternamn, setEfternamn] = useState('');
  const [email, setEmail] = useState('');
  const [adress, setAdress] = useState('');
  const [roll, setRoll] = useState<'superadmin' | 'admin' | 'user'>('user');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      setError(null);

      const { data: fetchedUser, error } = await supabase
        .from('fastighets_users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError(error.message);
      } else if (fetchedUser) {
        setFornamn(fetchedUser.fornamn ?? '');
        setEfternamn(fetchedUser.efternamn ?? '');
        setEmail(fetchedUser.email ?? '');
        setAdress(fetchedUser.adress ?? '');
        setRoll(fetchedUser.roll ?? 'user');
        setAvatarUrl(fetchedUser.avatar_url ?? null);
      }

      setLoading(false);
    };

    loadUser();
  }, [id]);

  const handleUpdate = async () => {
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      let nextAvatarUrl = avatarUrl;

      if (avatarFile) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(avatarFile.type)) {
          throw new Error('Endast JPG, PNG eller WEBP är tillåtna.');
        }

        const maxSizeMb = 5;
        if (avatarFile.size > maxSizeMb * 1024 * 1024) {
          throw new Error(`Bilden är för stor. Max ${maxSizeMb} MB.`);
        }

        const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `${id}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            upsert: true,
            contentType: avatarFile.type,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        nextAvatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      }

      const { error } = await supabase
        .from('fastighets_users')
        .update({
          fornamn,
          efternamn,
          email,
          adress,
          roll,
          avatar_url: nextAvatarUrl,
        })
        .eq('id', id);

      if (error) throw error;

      setAvatarUrl(nextAvatarUrl);
      setAvatarFile(null);

      alert('Uppdaterad!');
    } catch (err: any) {
      setError(err.message || 'Något gick fel');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Är du säker på att du vill ta bort denna användare?')) return;

    const { error } = await supabase
      .from('fastighets_users')
      .delete()
      .eq('id', id);

    if (error) alert(error.message);
    else {
      alert('Användare borttagen!');
      navigate('/dashboard/users');
    }
  };

  const initials = `${fornamn?.[0] ?? ''}${efternamn?.[0] ?? ''}`.toUpperCase();

  if (loading) return <div className="p-6">Laddar användare…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <form className="p-6 bg-white rounded-xl shadow-lg border border-gray-300 max-w-lg mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Detaljer för {fornamn} {efternamn}
      </h2>

      <div className="grid gap-4">
        <div>
          <label className="block text-gray-700 font-medium mb-2">Profilbild</label>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-cyan-500/15 flex items-center justify-center font-semibold text-cyan-400 border border-gray-300">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profilbild"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg">{initials || '?'}</span>
              )}
            </div>

            <div className="flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                className="p-2 border border-gray-400 rounded-md w-full bg-white text-gray-900"
              />
              {avatarFile && (
                <p className="text-sm text-gray-600 mt-2">
                  Ny vald bild: {avatarFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Förnamn</label>
          <input
            type="text"
            value={fornamn}
            onChange={e => setFornamn(e.target.value)}
            placeholder="Förnamn"
            className="p-3 border border-gray-400 rounded-md w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Efternamn</label>
          <input
            type="text"
            value={efternamn}
            onChange={e => setEfternamn(e.target.value)}
            placeholder="Efternamn"
            className="p-3 border border-gray-400 rounded-md w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">E-post</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="E-post"
            className="p-3 border border-gray-400 rounded-md w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Adress</label>
          <input
            type="text"
            value={adress}
            onChange={e => setAdress(e.target.value)}
            placeholder="Adress"
            className="p-3 border border-gray-400 rounded-md w-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Roll</label>
          <select
            value={roll}
            onChange={e => setRoll(e.target.value as 'superadmin' | 'admin' | 'user')}
            className="p-3 border border-gray-400 rounded-md w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="superadmin">Superadmin</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-4">
        <button
          type="button"
          onClick={handleUpdate}
          disabled={saving}
          className="bg-green-600 text-white px-6 py-2 rounded-md shadow hover:bg-green-700 transition font-semibold disabled:opacity-60"
        >
          {saving ? 'Sparar...' : 'Uppdatera'}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={saving}
          className="bg-red-600 text-white px-6 py-2 rounded-md shadow hover:bg-red-700 transition font-semibold disabled:opacity-60"
        >
          Ta bort
        </button>
      </div>
    </form>
  );
}