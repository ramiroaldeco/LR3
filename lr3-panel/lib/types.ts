export type Tournament = {
  id: string
  name: string
  year: number
  status: 'active' | 'finished'
  start_date: string | null
  end_date: string | null
  created_at: string
}

export type Category = {
  id: string
  tournament_id: string
  name: string
  display_order: number
  color: string
  active: boolean
  created_at: string
  tournaments?: Tournament
}

export type Club = {
  id: string
  name: string
  shield_url: string | null
  city: string | null
  primary_color: string
  secondary_color: string
  notes: string | null
  created_at: string
}

export type Team = {
  id: string
  club_id: string
  category_id: string
  tournament_id: string
  active: boolean
  created_at: string
  clubs?: Club
  categories?: Category
  tournaments?: Tournament
}

export type Round = {
  id: string
  tournament_id: string
  category_id: string
  number: number
  name: string | null
  status: 'pending' | 'playing' | 'finished'
  calendar_date: string | null
  created_at: string
  tournaments?: Tournament
  categories?: Category
}

export type Match = {
  id: string
  tournament_id: string
  category_id: string
  round_id: string
  home_team_id: string
  away_team_id: string
  home_goals: number | null
  away_goals: number | null
  status: 'pending' | 'finished' | 'suspended' | 'postponed'
  match_date: string | null
  match_time: string | null
  field: string | null
  notes: string | null
  created_at: string
  updated_at: string
  home_team?: Team & { clubs?: Club }
  away_team?: Team & { clubs?: Club }
  rounds?: Round
}

export type StandingRow = {
  club_id: string
  team_id: string
  club_name: string
  shield_url: string | null
  PJ: number
  PG: number
  PE: number
  PP: number
  GF: number
  GC: number
  DG: number
  PTS: number
}
