import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// explicit backend env
dotenv.config({ path: './server.env' }); // se till att filen finns i root

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const app = express();
app.use(cors());
app.use(express.json());


// server.ts
app.post('/api/createuser', async (req, res) => {
  const { email, password, fornamn, efternamn, roll, adress } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { fornamn, efternamn, roll, adress },
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.status(201).json({
      success: true,
      userId: data.user?.id,
      message: 'User created',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


app.listen(4000, () => console.log('Backend running on http://localhost:4000'));
