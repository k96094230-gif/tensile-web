import React from 'react'

export default function ProjectList({ projects, onSelect, onCreate }) {
  return (
    <div className="proj-list">
      <h2>我的專案</h2>
      <div className="proj-grid">
        {projects.map(p => (
          <div key={p.id} className="proj-card" onClick={() => onSelect(p)}>
            <h3>{p.name}</h3>
            <p>{new Date(p.updated_at || p.created_at).toLocaleDateString('zh-TW')}</p>
          </div>
        ))}
        <div className="proj-new" onClick={onCreate}>
          <span>＋</span> 新建專案
        </div>
      </div>
    </div>
  )
}
