import { useState } from 'react'
import { COURSE_PHOTOS } from '../data/courses'

interface Props {
  courseIndex: number
  courseName: string
}

/** Build the list of filenames to try from a configured path, swapping extensions. */
function sourcesFor(path: string): string[] {
  const base = path.replace(/\.(jpg|jpeg|png|webp)$/i, '')
  const exts = ['jpg', 'jpeg', 'png', 'webp']
  const ordered = [path, ...exts.map((e) => `${base}.${e}`)]
  return [...new Set(ordered)]
}

/**
 * Course photo. Tries the configured file (and common extensions) so whatever
 * image name gets uploaded works, and degrades to a colored panel if none load.
 */
export default function CoursePhoto({ courseIndex, courseName }: Props) {
  const configured = COURSE_PHOTOS[courseIndex]
  const [idx, setIdx] = useState(0)

  if (!configured) {
    return (
      <div className="course-photo-fallback">
        <span className="cap">{courseName}</span>
      </div>
    )
  }

  const sources = sourcesFor(configured)
  if (idx >= sources.length) {
    return (
      <div className="course-photo-fallback">
        <span className="cap">{courseName}</span>
      </div>
    )
  }

  return (
    <img
      className="course-photo"
      src={sources[idx]}
      alt={courseName}
      onError={() => setIdx((i) => i + 1)}
    />
  )
}
