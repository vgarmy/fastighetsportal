import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

app.post('/create-user', async (req, res) => {
  const { email, password, fornamn, efternamn, adress, roll } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { fornamn, efternamn, adress, roll },
      email_confirm: true,
    });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ user: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const port = 4000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
