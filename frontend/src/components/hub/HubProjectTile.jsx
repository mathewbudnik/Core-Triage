import Surface from '../ui/Surface'
import Eyebrow from '../ui/Eyebrow'
import { gradeStringToNum, formatGrade } from '../../lib/gradeUtil'
import { useHubData } from '../../hooks/useHubData'

/**
 * Your project — the climb you're working. Re-framed from the old
 * HubProjectCard in the new chrome with setter voice ("THE PROJECT").
 *
 * Sources project data from useHubData().currentProject — derived from
 * the last 14 days of logs (hardest grade with p>0 above working tier).
 *
 * Props:
 *   user: pass-through for useHubData (required to fetch data)
 */
export default function HubProjectTile({ user }) {
  const data = useHubData(user) ?? {}
  const project = data.currentProject ?? null

  if (!project) {
    return (
      <Surface tier="default" padding="lg" className="mb-3">
        <Eyebrow>The project</Eyebrow>
        <p className="text-[14px] text-ct-cream-soft mt-2">
          No project picked. Find a problem you can't send and work it.
        </p>
      </Surface>
    )
  }

  const gradeNum = gradeStringToNum(project.grade)
  const attempts = typeof project.failedTries === 'number' ? project.failedTries : null

  return (
    <Surface tier="default" padding="lg" className="mb-3">
      <div className="flex justify-between items-baseline">
        <Eyebrow>The project</Eyebrow>
        {attempts !== null && (
          <p className="text-[10px] text-ct-moss tracking-[0.10em]">
            {attempts} attempt{attempts === 1 ? '' : 's'}
          </p>
        )}
      </div>
      <p className="text-[16px] font-bold text-ct-cream mt-2 tracking-[-0.01em]">
        {project.name || 'Unnamed problem'}
      </p>
      {(gradeNum !== null || project.grade) && (
        <p className="text-[12px] text-ct-terra-soft mt-1 font-extrabold">
          {gradeNum !== null ? formatGrade(gradeNum) : project.grade}
        </p>
      )}
    </Surface>
  )
}
