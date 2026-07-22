import { useNavigate } from 'react-router-dom'

interface Props {
  title: string
  back?: string | number
}

export default function TopBar({ title, back }: Props) {
  const navigate = useNavigate()
  return (
    <div className="topbar">
      {back !== undefined && (
        <button
          className="back"
          aria-label="Back"
          onClick={() => (typeof back === 'number' ? navigate(back) : navigate(back))}
        >
          ‹
        </button>
      )}
      <h1>{title}</h1>
    </div>
  )
}
