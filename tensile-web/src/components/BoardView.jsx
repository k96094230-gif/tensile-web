import React, { useState, useEffect, useCallback } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getShots, createShot, updateShot, deleteShot, reorderShots, updateProject } from '../lib/supabase'
import ShotEditor from './ShotEditor'
import ClaudePanel from './ClaudePanel'
import { getCameraTags } from '../lib/camera'

const STATUS_LABEL = { draft: '草稿', approved: '核准', locked: '鎖定' }

export default function BoardView({ project, onProjectChange }) {
  const [shots, setShots]           = useState([])
  const [selected, setSelected]     = useState(null)   // shot id
  const [mode, setMode]             = useState('director') // director | field
  const [panel, setPanel]           = useState('editor')   // editor | claude | none
  const [brief, setBrief]           = useState(project.brief || '')
  const [loading, setLoading]       = useState(true)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    getShots(project.id).then(ss => {
      setShots(ss)
      setLoading(false)
    })
  }, [project.id])

  const selectedShot = shots.find(s => s.id === selected) || null

  // ── Brief ──────────────────────────────────────────────────────────────────
  const saveBrief = useCallback(async (val) => {
    await updateProject(project.id, { brief: val })
    onProjectChange(p => ({ ...p, brief: val }))
  }, [project.id])

  // ── Add shot ───────────────────────────────────────────────────────────────
  async function handleAddShot() {
    const s = await createShot(project.id)
    setShots(ss => [...ss, { ...s, shot_variants: [] }])
    setSelected(s.id)
    setPanel('editor')
  }

  // ── Update shot (local + db) ───────────────────────────────────────────────
  async function handleUpdateShot(id, patch) {
    setShots(ss => ss.map(s => s.id === id ? { ...s, ...patch } : s))
    await updateShot(id, patch)
  }

  // ── Delete shot ────────────────────────────────────────────────────────────
  async function handleDeleteShot(id) {
    if (!confirm('刪除這顆鏡頭？')) return
    setShots(ss => ss.filter(s => s.id !== id))
    if (selected === id) setSelected(null)
    await deleteShot(id)
  }

  // ── Drag end ───────────────────────────────────────────────────────────────
  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    setShots(ss => {
      const oldIdx = ss.findIndex(s => s.id === active.id)
      const newIdx = ss.findIndex(s => s.id === over.id)
      const next = arrayMove(ss, oldIdx, newIdx)
      reorderShots(next)
      return next
    })
  }

  if (loading) return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text2)' }}>載入中…</div>

  return (
    <>
      {/* Mode bar */}
      <div className="mode-bar">
        <div className="mode-seg">
          <button className={mode==='director'?'active':''} onClick={()=>setMode('director')}>導演模式</button>
          <button className={mode==='field'?'active':''} onClick={()=>setMode('field')}>現場模式</button>
        </div>
        <div style={{ flex:1 }} />
        <button className="btn btn-ghost btn-sm" onClick={()=>setPanel(p=>p==='claude'?'none':'claude')}>
          Claude 助理
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleAddShot}>＋ 鏡頭</button>
      </div>

      <div className="main-area">
        {/* Board */}
        <div className={`board ${mode==='field'?'board-field':''}`}>
          {/* Brief */}
          <div style={{ marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 6 }}>專案 Brief</div>
            <textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              onBlur={e => saveBrief(e.target.value)}
              placeholder="專案目標、風格、受眾…"
              style={{ width: '100%', maxWidth: 700, minHeight: 60 }}
            />
          </div>

          {/* Shots */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={shots.map(s=>s.id)} strategy={rectSortingStrategy}>
              <div className="board-shots">
                {shots.map((s, i) => mode === 'field'
                  ? <FieldCard key={s.id} shot={s} num={i+1} selected={selected===s.id} onClick={()=>{setSelected(s.id); setPanel('editor')}} />
                  : <SortableShotCard
                      key={s.id} shot={s} num={i+1}
                      selected={selected===s.id}
                      onClick={() => { setSelected(s.id); setPanel('editor') }}
                      onDelete={() => handleDeleteShot(s.id)}
                      onGenOpen={() => { setSelected(s.id); setPanel('claude') }}
                    />
                )}
                {mode !== 'field' && (
                  <button className="add-shot-btn" onClick={handleAddShot}>＋</button>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Editor Panel */}
        {panel === 'editor' && selectedShot && (
          <ShotEditor
            shot={selectedShot}
            onUpdate={(patch) => handleUpdateShot(selectedShot.id, patch)}
            onDelete={() => handleDeleteShot(selectedShot.id)}
            onClose={() => setPanel('none')}
            onVariantChange={(variants) => setShots(ss => ss.map(s => s.id===selectedShot.id ? {...s, shot_variants: variants} : s))}
          />
        )}

        {/* Claude Panel */}
        {panel === 'claude' && (
          <ClaudePanel
            project={project}
            shots={shots}
            selectedShot={selectedShot}
            onApplyAction={(action) => applyAction(action, shots, setShots, handleUpdateShot, project.id)}
            onClose={() => setPanel('none')}
          />
        )}
      </div>
    </>
  )
}

// ── Sortable wrapper ───────────────────────────────────────────────────────────
function SortableShotCard({ shot, num, selected, onClick, onDelete, onGenOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: shot.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`shot-card${selected?' selected':''}${isDragging?' dragging':''}`} onClick={onClick}>
      <ShotCardInner shot={shot} num={num} onDelete={onDelete} onGenOpen={onGenOpen} />
    </div>
  )
}

function ShotCardInner({ shot, num, onDelete, onGenOpen }) {
  const src = shot.active_variant
    ? (shot.shot_variants?.find(v => v.variant_key === shot.active_variant) || shot)
    : shot
  const tags = getCameraTags(shot)
  const imgUrl = src.gi || null

  return <>
    <div className="shot-thumb">
      {imgUrl
        ? <img src={imgUrl} alt="" draggable={false} />
        : <div className="shot-thumb-empty"><span>🎬</span><span>無縮圖</span></div>
      }
      <span className="shot-num">{String(num).padStart(2,'0')}</span>
      <span className={`shot-status-dot ${shot.status}`} />
      {shot.active_variant && <span className="shot-variant-badge">{shot.active_variant.toUpperCase()}</span>}
    </div>
    <div className="shot-body">
      {src.scene && <div className="shot-scene">{src.scene}</div>}
      <div className="shot-desc">{src.desc || <span style={{color:'var(--text3)'}}>無描述</span>}</div>
      {tags.length > 0 && (
        <div className="shot-camera-tags">
          {tags.map(t => <span key={t} className="shot-tag">{t}</span>)}
        </div>
      )}
    </div>
    <div className="shot-actions" onClick={e => e.stopPropagation()}>
      <button className={`gen-btn${src.gi?' has-gen':''}`} onClick={onGenOpen}>生成</button>
      <button className="btn-danger btn-sm" onClick={onDelete}>刪</button>
    </div>
  </>
}

function FieldCard({ shot, num, selected, onClick }) {
  const src = shot.active_variant
    ? (shot.shot_variants?.find(v => v.variant_key === shot.active_variant) || shot)
    : shot
  const tags = getCameraTags(shot)

  return (
    <div className={`field-card${selected?' selected':''}`} onClick={onClick}>
      <div className="field-card-num">{String(num).padStart(2,'0')}</div>
      <div className="field-card-main">
        {src.scene && <div className="field-card-scene">{src.scene}</div>}
        <div style={{ fontSize:13, color:'var(--text)' }}>{src.desc}</div>
        <div className="field-card-tags">
          {tags.map(t => <span key={t} className="shot-tag">{t}</span>)}
          {src.duration && <span className="shot-tag">{src.duration}s</span>}
          <span className={`field-card-status ${shot.status}`}>{STATUS_LABEL[shot.status]}</span>
        </div>
        {src.notes && <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>備註：{src.notes}</div>}
      </div>
    </div>
  )
}

// ── Apply Claude action ────────────────────────────────────────────────────────
async function applyAction(action, shots, setShots, handleUpdateShot, projectId) {
  if (action.type === 'updateShot') {
    const { id, ...patch } = action
    if (!id) return
    setShots(ss => ss.map(s => s.id === id ? { ...s, ...patch } : s))
    await updateShot(id, patch)
  } else if (action.type === 'addShot') {
    const s = await createShot(projectId, action.patch || {})
    setShots(ss => [...ss, { ...s, shot_variants: [] }])
  }
}
