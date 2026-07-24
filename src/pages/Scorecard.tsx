import { useParams, Navigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useStore } from '../lib/store'
import { COURSES } from '../data/courses'

function sum(nums: (number | undefined)[]): number {
  return nums.reduce<number>((a, b) => a + (typeof b === 'number' ? b : 0), 0)
}

/** Traditional scorecard shape for a gross score vs par. */
function markClass(gross: number, par: number): string {
  const d = gross - par
  if (d <= -2) return 'm-eagle' // double circle
  if (d === -1) return 'm-birdie' // circle
  if (d === 0) return '' // par — no shape
  if (d === 1) return 'm-bogey' // square
  if (d === 2) return 'm-double' // double square
  return 'm-triple' // triple (or worse) square
}

function ScoreCell({ gross, par }: { gross: number | undefined; par: number }) {
  if (typeof gross !== 'number') return null
  const cls = markClass(gross, par)
  return <span className={`mark ${cls}`}>{gross}</span>
}

export default function Scorecard() {
  const { roundId } = useParams()
  const idx = Number(roundId)
  const { state } = useStore()
  const { players, rounds } = state

  const round = rounds.find((r) => r.index === idx)
  const course = COURSES[idx]
  if (!round || !course) return <Navigate to="/" replace />

  const front = [0, 1, 2, 3, 4, 5, 6, 7, 8]
  const back = [9, 10, 11, 12, 13, 14, 15, 16, 17]

  const parOut = sum(front.map((h) => course.par[h]))
  const parIn = sum(back.map((h) => course.par[h]))

  return (
    <>
      <TopBar title={`${course.day} — Scorecard`} back={`/round/${idx}`} />
      <div className="content">
        <h1 className="big-head">{course.name}</h1>
        <p className="subhead" style={{ marginBottom: 12 }}>
          Gross strokes
        </p>

        <div className="scorecard-scroll">
          <table className="scorecard">
            <thead>
              <tr>
                <th className="sc-name left">Hole</th>
                {front.map((hh) => (
                  <th key={hh}>{hh + 1}</th>
                ))}
                <th className="sc-tot">OUT</th>
                {back.map((hh) => (
                  <th key={hh}>{hh + 1}</th>
                ))}
                <th className="sc-tot">IN</th>
                <th className="sc-tot">TOT</th>
              </tr>
              <tr className="sc-par">
                <td className="sc-name left">Par</td>
                {front.map((hh) => (
                  <td key={hh}>{course.par[hh]}</td>
                ))}
                <td className="sc-tot">{parOut}</td>
                {back.map((hh) => (
                  <td key={hh}>{course.par[hh]}</td>
                ))}
                <td className="sc-tot">{parIn}</td>
                <td className="sc-tot">{parOut + parIn}</td>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const g = (hh: number) => round.gross[hh]?.[p.id]
                const out = sum(front.map((hh) => g(hh)))
                const inn = sum(back.map((hh) => g(hh)))
                return (
                  <tr key={p.id}>
                    <td className="sc-name left">{p.name}</td>
                    {front.map((hh) => (
                      <td key={hh}>
                        <ScoreCell gross={g(hh)} par={course.par[hh]} />
                      </td>
                    ))}
                    <td className="sc-tot">{out || ''}</td>
                    {back.map((hh) => (
                      <td key={hh}>
                        <ScoreCell gross={g(hh)} par={course.par[hh]} />
                      </td>
                    ))}
                    <td className="sc-tot">{inn || ''}</td>
                    <td className="sc-tot">{out + inn || ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="muted center" style={{ marginTop: 12 }}>
          Scroll sideways to see all 18 holes.
        </p>
      </div>
    </>
  )
}
