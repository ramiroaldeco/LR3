import { createClient } from '@/lib/supabase/server'
import { StandingRow, Match } from '@/lib/types'

export async function calcularTabla(
  tournament_id: string,
  category_id: string,
  hasta_round_number?: number
): Promise<StandingRow[]> {
  const supabase = await createClient()

  // Get all teams in this category
  const { data: teams } = await supabase
    .from('teams')
    .select('id, club_id, clubs(id, name, shield_url)')
    .eq('tournament_id', tournament_id)
    .eq('category_id', category_id)
    .eq('active', true)

  if (!teams || teams.length === 0) return []

  // Build standings map
  const standings: Record<string, StandingRow> = {}
  for (const team of teams) {
    const club = Array.isArray(team.clubs) ? team.clubs[0] : team.clubs
    standings[team.id] = {
      club_id: team.club_id,
      team_id: team.id,
      club_name: club?.name ?? 'Desconocido',
      shield_url: club?.shield_url ?? null,
      PJ: 0, PG: 0, PE: 0, PP: 0,
      GF: 0, GC: 0, DG: 0, PTS: 0,
    }
  }

  // Build matches query
  let matchQuery = supabase
    .from('matches')
    .select('*, rounds(number)')
    .eq('tournament_id', tournament_id)
    .eq('category_id', category_id)
    .eq('status', 'finished')

  const { data: matches } = await matchQuery

  if (!matches) return Object.values(standings)

  // Filter by round number if needed
  const filteredMatches = hasta_round_number
    ? matches.filter((m: Match & { rounds?: { number: number } }) =>
        (m.rounds?.number ?? 0) <= hasta_round_number
      )
    : matches

  // Calculate standings
  for (const match of filteredMatches) {
    const home = standings[match.home_team_id]
    const away = standings[match.away_team_id]

    if (!home || !away) continue
    if (match.home_goals === null || match.away_goals === null) continue

    const hg = match.home_goals
    const ag = match.away_goals

    home.PJ++; away.PJ++
    home.GF += hg; home.GC += ag
    away.GF += ag; away.GC += hg

    if (hg > ag) {
      home.PG++; home.PTS += 3
      away.PP++
    } else if (hg < ag) {
      away.PG++; away.PTS += 3
      home.PP++
    } else {
      home.PE++; home.PTS++
      away.PE++; away.PTS++
    }
  }

  // Calculate goal difference and sort
  const rows = Object.values(standings).map(r => ({
    ...r,
    DG: r.GF - r.GC,
  }))

  return rows.sort((a, b) => {
    if (b.PTS !== a.PTS) return b.PTS - a.PTS
    if (b.DG !== a.DG) return b.DG - a.DG
    if (b.GF !== a.GF) return b.GF - a.GF
    return a.club_name.localeCompare(b.club_name)
  })
}
