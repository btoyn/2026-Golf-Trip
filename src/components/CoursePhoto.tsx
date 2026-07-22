import { useState } from 'react'
import { COURSE_PHOTOS } from '../data/courses'

interface Props {
  courseIndex: number
  courseName: string
}

/** Course photo that degrades gracefully to a colored panel if missing. */
export default function CoursePhoto({ courseIndex, courseName }: Props) {
  const src = COURSE_PHOTOS[courseIndex]
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="course-photo-fallback">
        <span className="cap">{courseName}</span>
      </div>
    )
  }

  return (
    <img
      className="course-photo"
      src={src}
      alt={courseName}
      onError={() => setFailed(true)}
    />
  )
}
