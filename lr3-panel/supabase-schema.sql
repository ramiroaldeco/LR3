-- ============================================
-- LIGA RÍO TRES — Schema de Base de Datos
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- 1. Profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'admin')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- 2. Tournaments
CREATE TABLE IF NOT EXISTS public.tournaments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  year       INTEGER NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  start_date DATE,
  end_date   DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  color         TEXT DEFAULT '#20B26B',
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Clubs (institutions — created once)
CREATE TABLE IF NOT EXISTS public.clubs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  shield_url      TEXT,
  city            TEXT,
  primary_color   TEXT DEFAULT '#FF0000',
  secondary_color TEXT DEFAULT '#FFFFFF',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Teams (club enrolled in a category/tournament)
CREATE TABLE IF NOT EXISTS public.teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, category_id, tournament_id)
);

-- 6. Rounds (match days / jornadas)
CREATE TABLE IF NOT EXISTS public.rounds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  number        INTEGER NOT NULL,
  name          TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'finished')),
  calendar_date DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, category_id, number)
);

-- 7. Matches
CREATE TABLE IF NOT EXISTS public.matches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id    UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  round_id       UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  home_team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  home_goals     INTEGER CHECK (home_goals >= 0),
  away_goals     INTEGER CHECK (away_goals >= 0),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','finished','suspended','postponed')),
  match_date     DATE,
  match_time     TIME,
  field          TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  CHECK (home_team_id <> away_team_id),
  UNIQUE(round_id, home_team_id, away_team_id)
);

-- 8. Sponsors
CREATE TABLE IF NOT EXISTS public.sponsors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  logo_url   TEXT,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_categories_tournament ON categories(tournament_id);
CREATE INDEX IF NOT EXISTS idx_teams_category ON teams(category_id);
CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_rounds_tournament_category ON rounds(tournament_id, category_id);
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(round_id);
CREATE INDEX IF NOT EXISTS idx_matches_category ON matches(category_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors    ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do everything (admin panel only)
CREATE POLICY "authenticated_all" ON public.tournaments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.categories  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.clubs       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.teams       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.rounds      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.matches     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.sponsors    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "own_profile"       ON public.profiles    FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================
-- STORAGE BUCKET (run separately if needed)
-- ============================================
-- In Supabase Dashboard > Storage > New bucket:
-- Name: escudos
-- Public: YES
-- Allowed mime types: image/png, image/jpeg, image/webp, image/gif
