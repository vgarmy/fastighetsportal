import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface CreateUserProps {
  onUserCreated?: (newUser: any) => void;
}

export function CreateUser({ onUserCreated }: CreateUserProps) {
  const [fornamn, setFornamn] = useState('');
  const [efternamn, setEfternamn] = useState('');
  const [email, setEmail] = useState('');
  const [adress, setAdress] = useState('');
  const [losen, setLosen] = useState('');
  const [roll, setRoll] = useState<'superadmin' | 'admin' | 'user'>('user');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Skapa användare i Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: losen,
        options: {
          data: {
            fornamn,
            efternamn,
            roll,
            adress
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Användaren kunde inte skapas');

      const userId = authData.user.id;

      // 2. Ladda upp avatar om vald
      let avatarUrl: string | null = null;

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
        const filePath = `${userId}/avatar.${ext}`;

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

        avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      }

      // 3. Spara användaren i fastighets_users
      const { data, error: dbError } = await supabase
        .from('fastighets_users')
        .insert([
          {
            id: userId,
            fornamn,
            efternamn,
            email,
            losen,
            adress,
            roll,
            avatar_url: avatarUrl,
          }
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. Rensa formuläret
      setFornamn('');
      setEfternamn('');
      setEmail('');
      setAdress('');
      setLosen('');
      setRoll('user');
      setAvatarFile(null);

      if (onUserCreated && data) onUserCreated(data);
      alert('Användare skapad! Nu kan användaren logga in.');
    } catch (err: any) {
      setError(err.message || 'Något gick fel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 bg-gray-100 rounded-xl shadow-lg border border-gray-300 mb-6 max-w-md mx-auto"
    >
      <h2 className="font-semibold text-gray-900 text-lg mb-4">Skapa ny användare</h2>

      {error && <div className="text-red-600 mb-3 font-medium">{error}</div>}

      <div className="grid gap-4">
        <input
          type="text"
          placeholder="Förnamn"
          value={fornamn}
          onChange={(e) => setFornamn(e.target.value)}
          className="p-3 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />

        <input
          type="text"
          placeholder="Efternamn"
          value={efternamn}
          onChange={(e) => setEfternamn(e.target.value)}
          className="p-3 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />

        <input
          type="email"
          placeholder="E-post"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-3 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />

        <input
          type="password"
          placeholder="Lösenord"
          value={losen}
          onChange={(e) => setLosen(e.target.value)}
          className="p-3 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />

        <input
          type="text"
          placeholder="Adress"
          value={adress}
          onChange={(e) => setAdress(e.target.value)}
          className="p-3 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <select
          value={roll}
          onChange={(e) => setRoll(e.target.value as 'superadmin' | 'admin' | 'user')}
          className="p-3 border border-gray-400 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="superadmin">Superadmin</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Profilbild</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
            className="p-2 border border-gray-400 rounded-md bg-white text-gray-900"
          />
          {avatarFile && (
            <p className="text-sm text-gray-600">
              Vald fil: {avatarFile.name}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-3 rounded-md shadow-md hover:bg-blue-700 transition font-semibold disabled:opacity-60"
        >
          {loading ? 'Skapar...' : 'Skapa användare'}
        </button>
      </div>
    </form>
  );
}
