import type { Course } from '../types'

/**
 * Four courses hardcoded exactly as provided.
 * Order matters: index 0..3 => Thursday..Sunday.
 */
export const COURSES: Course[] = [
  {
    day: 'Thursday',
    name: 'Sand Hollow Championship Course',
    par: [4, 5, 3, 4, 4, 4, 5, 3, 4, 5, 3, 4, 4, 4, 3, 4, 5, 4],
    si: [15, 7, 17, 5, 13, 1, 3, 11, 9, 10, 16, 2, 14, 4, 8, 18, 12, 6],
  },
  {
    day: 'Friday',
    name: 'Black Desert Resort',
    par: [4, 4, 3, 4, 4, 4, 5, 3, 5, 4, 4, 4, 5, 4, 3, 4, 3, 5],
    si: [9, 11, 15, 1, 13, 5, 3, 17, 7, 14, 2, 6, 10, 16, 12, 4, 18, 8],
  },
  {
    day: 'Saturday',
    name: 'Conestoga Golf Club',
    par: [4, 3, 4, 4, 3, 5, 4, 4, 5, 3, 4, 5, 4, 3, 4, 5, 4, 4],
    si: [5, 15, 9, 1, 13, 3, 17, 7, 11, 14, 2, 16, 10, 18, 8, 12, 6, 4],
  },
  {
    day: 'Sunday',
    name: 'Coral Canyon',
    par: [4, 3, 4, 3, 5, 4, 5, 3, 5, 4, 5, 3, 4, 4, 3, 5, 4, 4],
    si: [9, 15, 5, 7, 13, 1, 17, 11, 3, 6, 10, 12, 8, 2, 16, 18, 14, 4],
  },
]

/** Photo path per course index. Missing files degrade gracefully in the UI. */
export const COURSE_PHOTOS: (string | null)[] = [
  null,
  '/courses/black-desert.jpg',
  null,
  null,
]

/** Default pairing split per round. Round 4 (index 3) repeats Round 1. */
export const DEFAULT_PAIRINGS: (0 | 1 | 2)[] = [0, 1, 2, 0]
