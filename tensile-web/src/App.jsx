import React, { useState, useEffect } from 'react'
import ProjectList from './components/ProjectList'
import BoardView  from './components/BoardView'
import { getProjects, createProject } from './lib/supabase'

export default function App() {
  const [projects, setProjects]     = useState([])
  const [currentProj, setCurrentProj] = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    getProjects().then(ps => { setProjects(ps); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function handleCreateProject() {
    const name = prompt('專案名稱', '新專案')
    if (!name) return
    const proj = await createProject(name)
    setProjects(ps => [proj, ...ps])
    setCurrentProj(proj)
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1, color:'var(--text2)' }}>載入中…</div>

  if (!currentProj) {
    return (
      <div className="app">
        <Topbar title="Tensile 製片台" onBack={null} />
        <ProjectList
          projects={projects}
          onSelect={setCurrentProj}
          onCreate={handleCreateProject}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <Topbar
        title="Tensile 製片台"
        project={currentProj}
        onBack={() => setCurrentProj(null)}
        onRename={name => setCurrentProj(p => ({ ...p, name }))}
      />
      <BoardView project={currentProj} onProjectChange={setCurrentProj} />
    </div>
  )
}

function Topbar({ title, project, onBack, onRename }) {
  return (
    <div className="topbar">
      <span className="topbar-title" onClick={onBack}>{title}</span>
      {project && <>
        <span style={{ color: 'var(--text3)' }}>/</span>
        <div className="topbar-proj">
          <input
            defaultValue={project.name}
            onBlur={e => onRename?.(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.target.blur()}
          />
        </div>
      </>}
    </div>
  )
}
