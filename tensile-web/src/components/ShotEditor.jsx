import React, { useState, useEffect } from 'react'
import { createVariant, updateVariant, deleteVariant, updateShot } from '../lib/supabase'
import {
  SHOT_SIZES, CAMERA_HEIGHTS, FOCAL_LENGTHS, CAMERA_MOVES, buildCameraPrompt
} from '../lib/camera'

export default function ShotEditor({ shot, onUpdate, onDelete, onClose, onVariantChange }) {
  // Active variant key: null = base shot
  const [activeVKey, setActiveVKey] = useState(shot.active_variant || null)

  // Which variant data to show/edit
  const activeVariant = activeVKey
    ? (shot.shot_variants?.find(v => v.variant_key === activeVKey) || null)
    : null

  // The fields we're currently editing (base or variant)
  const src = activeVariant || shot

  // Keep in sync when shot prop changes
  useEffect(() => { setActiveVKey(shot.active_variant || null) }, [shot.id])

  // ── Field helpers ────────────────────────────────────────────────────────
  function patchSrc(field, value) {
    if (activeVariant) {
      // Update variant in db + local
      updateVariant(activeVariant.id, { [field]: value })
      const updated = shot.shot_variants.map(v =>
        v.variant_key === activeVKey ? { ...v, [field]: value } : v
      )
      onVariantChange(updated)
    } else {
      onUpdate({ [field]: value })
    }
  }

  // ── Variant management ────────────────────────────────────────────────────
  const existingKeys = shot.shot_variants?.map(v => v.variant_key) || []
  const allKeys = ['a', 'b', 'c']

  async function handleSelectVariant(key) {
    if (key === null) {
      setActiveVKey(null)
      onUpdate({ active_variant: null })
      return
    }
    // Create if doesn't exist
    if (!existingKeys.includes(key)) {
      const v = await createVariant(shot.id, key, {
        desc: shot.desc, scene: shot.scene,
        shot_size: shot.shot_size, camera_height: shot.camera_height,
        focal_length: shot.focal_length, camera_move: shot.camera_move,
        subject_move: shot.subject_move,
      })
      onVariantChange([...(shot.shot_variants || []), v])
    }
    setActiveVKey(key)
    onUpdate({ active_variant: key })
  }

  async function handleDeleteVariant(key) {
    const v = shot.shot_variants?.find(vv => vv.variant_key === key)
    if (!v) return
    if (!confirm(`刪除版本 ${key.toUpperCase()}？`)) return
    await deleteVariant(v.id)
    const updated = (shot.shot_variants || []).filter(vv => vv.variant_key !== key)
    onVariantChange(updated)
    if (activeVKey === key) {
      setActiveVKey(null)
      onUpdate({ active_variant: null })
    }
  }

  const prompt = buildCameraPrompt({ ...shot, active_variant: activeVKey })

  return (
    <div className="editor-panel">
      <div className="editor-panel-header">
        <h3>鏡頭編輯</h3>
        <button className="btn-icon" title="刪除鏡頭" onClick={onDelete}>🗑</button>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>

      <div className="editor-panel-body">

        {/* ── Variant tabs ─────────────────────────────────── */}
        <div>
          <div className="section-title" style={{marginBottom:6}}>版本</div>
          <div className="variant-tabs">
            <button
              className={`variant-tab ${activeVKey===null?'active':''}`}
              onClick={() => handleSelectVariant(null)}
            >基本</button>
            {allKeys.map(k => {
              const has = existingKeys.includes(k)
              return (
                <button
                  key={k}
                  className={`variant-tab ${activeVKey===k?'active':''} ${has?'has-content':''}`}
                  onClick={() => handleSelectVariant(k)}
                  title={has ? `版本 ${k.toUpperCase()}` : `建立版本 ${k.toUpperCase()}`}
                >
                  {has
                    ? <span style={{display:'flex',alignItems:'center',gap:4}}>
                        {k.toUpperCase()}
                        {activeVKey===k && <span
                          style={{fontSize:9,opacity:.7,cursor:'pointer'}}
                          onClick={e=>{e.stopPropagation();handleDeleteVariant(k)}}
                        >✕</span>}
                      </span>
                    : <span className="add-var">+{k.toUpperCase()}</span>
                  }
                </button>
              )
            })}
          </div>
          {activeVKey && <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>
            編輯中：版本 {activeVKey.toUpperCase()} — 切換到其他版本即可分別儲存不同構圖
          </div>}
        </div>

        {/* ── Scene ─────────────────────────────────────────── */}
        <div className="field-group">
          <div className="field-label">場景</div>
          <input
            value={src.scene || ''}
            onChange={e => patchSrc('scene', e.target.value)}
            placeholder="e.g. INT. 客廳 — 白天"
          />
        </div>

        {/* ── Desc ──────────────────────────────────────────── */}
        <div className="field-group">
          <div className="field-label">鏡頭描述</div>
          <textarea
            value={src.desc || ''}
            onChange={e => patchSrc('desc', e.target.value)}
            placeholder="畫面內容描述…"
            style={{ minHeight: 70 }}
          />
        </div>

        {/* ── P0 Camera Language ────────────────────────────── */}
        <div>
          <div className="section-title" style={{marginBottom:8}}>鏡頭語言</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>

            <div className="field-group">
              <div className="field-label">景別</div>
              <div className="chip-row">
                {SHOT_SIZES.map(s => (
                  <button key={s.key} className={`chip ${src.shot_size===s.key?'active':''}`}
                    onClick={() => patchSrc('shot_size', src.shot_size===s.key ? '' : s.key)}
                    title={s.desc}
                  >{s.label}</button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <div className="field-label">拍攝角度</div>
              <div className="chip-row">
                {CAMERA_HEIGHTS.map(h => (
                  <button key={h.key} className={`chip ${src.camera_height===h.key?'active':''}`}
                    onClick={() => patchSrc('camera_height', src.camera_height===h.key ? '' : h.key)}
                  >{h.label}</button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <div className="field-label">焦段</div>
              <div className="chip-row">
                {FOCAL_LENGTHS.map(f => (
                  <button key={f.key} className={`chip ${src.focal_length===f.key?'active':''}`}
                    onClick={() => patchSrc('focal_length', src.focal_length===f.key ? '' : f.key)}
                  >{f.label}</button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <div className="field-label">攝影機運動</div>
              <div className="chip-row">
                {CAMERA_MOVES.map(m => (
                  <button key={m.key} className={`chip ${src.camera_move===m.key?'active':''}`}
                    onClick={() => patchSrc('camera_move', src.camera_move===m.key ? '' : m.key)}
                  >{m.label}</button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <div className="field-label">人物走位</div>
              <input
                value={src.subject_move || ''}
                onChange={e => patchSrc('subject_move', e.target.value)}
                placeholder="e.g. 從左向右走過，轉身看鏡頭"
              />
            </div>

          </div>
        </div>

        {/* ── Prompt Preview ────────────────────────────────── */}
        {prompt && (
          <div>
            <div className="section-title" style={{marginBottom:6}}>AI 生圖提示詞預覽</div>
            <div className="prompt-preview">{prompt}</div>
          </div>
        )}

        {/* ── Notes & Duration ──────────────────────────────── */}
        <div className="camera-grid">
          <div className="field-group">
            <div className="field-label">時長（秒）</div>
            <input
              type="number" min={1} max={300}
              value={shot.duration || 5}
              onChange={e => onUpdate({ duration: parseInt(e.target.value) || 5 })}
            />
          </div>
          <div className="field-group">
            <div className="field-label">狀態</div>
            <select value={shot.status || 'draft'} onChange={e => onUpdate({ status: e.target.value })}>
              <option value="draft">草稿</option>
              <option value="approved">核准</option>
              <option value="locked">鎖定</option>
            </select>
          </div>
        </div>

        <div className="field-group">
          <div className="field-label">備註</div>
          <textarea
            value={src.notes || ''}
            onChange={e => patchSrc('notes', e.target.value)}
            placeholder="現場備註、特殊需求…"
            style={{ minHeight: 50 }}
          />
        </div>

      </div>
    </div>
  )
}
