import React, { useState, useRef, useEffect } from 'react'
import { buildCameraPrompt } from '../lib/camera'

// Calls our Vercel serverless function /api/claude
// (keeps API key on server side)
async function callClaude(messages, systemPrompt) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system: systemPrompt })
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data // { reply: string, actions: [] }
}

export default function ClaudePanel({ project, shots, selectedShot, onApplyAction, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const msgsRef = useRef(null)

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [messages])

  // Build system prompt with current project context
  function buildSystem() {
    const shotsCtx = shots.map((s, i) => {
      const src = s.active_variant
        ? (s.shot_variants?.find(v => v.variant_key === s.active_variant) || s)
        : s
      const prompt = buildCameraPrompt(s)
      return `Shot ${String(i+1).padStart(2,'0')} (id:${s.id}): ${src.scene} | ${src.desc} | ${prompt} [${s.status}]`
    }).join('\n')

    return `你是 Tensile 製片台的 AI 製片助理。請用繁體中文回應。

專案名稱：${project.name}
專案 Brief：${project.brief || '（無）'}

目前分鏡列表：
${shotsCtx || '（無分鏡）'}
${selectedShot ? `\n目前選中的鏡頭 ID：${selectedShot.id}` : ''}

你可以對分鏡提出修改建議，回應格式為 JSON：
{
  "reply": "給使用者看的文字說明",
  "actions": [
    { "type": "updateShot", "id": "<shot_id>", "desc": "...", "shot_size": "...", ... },
    { "type": "addShot", "patch": { "scene": "...", "desc": "..." } },
    { "type": "setBrief", "brief": "..." }
  ]
}
actions 可以是空陣列。updateShot 只需包含要改的欄位。
可用的鏡頭欄位：scene, desc, notes, duration, shot_size, camera_height, focal_length, camera_move, subject_move, status, active_variant`
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)

    try {
      const result = await callClaude(
        newMsgs.map(m => ({ role: m.role, content: m.content })),
        buildSystem()
      )
      let parsed = { reply: '', actions: [] }
      try { parsed = typeof result === 'string' ? JSON.parse(result) : result } catch {}

      setMessages(ms => [...ms, { role: 'assistant', content: parsed.reply || result, actions: parsed.actions || [] }])
      if (result.session_id) setSessionId(result.session_id)
    } catch (e) {
      setMessages(ms => [...ms, { role: 'assistant', content: `錯誤：${e.message}`, actions: [] }])
    }
    setLoading(false)
  }

  return (
    <div className="claude-panel">
      <div className="claude-panel-header">
        <span style={{fontSize:16}}>🤖</span>
        <span style={{fontWeight:600,fontSize:13}}>Claude 助理</span>
        {sessionId && <span style={{fontSize:10,color:'var(--text3)',flex:1,textAlign:'right'}}>session #{sessionId.slice(-6)}</span>}
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>

      <div className="claude-panel-msgs" ref={msgsRef}>
        {messages.length === 0 && (
          <div style={{color:'var(--text3)',fontSize:12,textAlign:'center',paddingTop:20}}>
            問我任何關於這個專案或分鏡的事<br/>
            我可以幫你新增、修改鏡頭
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`cl-msg ${m.role}`}>
            <div className="cl-bubble">{m.content}</div>
            {m.actions?.length > 0 && (
              <div className="cl-actions">
                {m.actions.map((a, j) => (
                  <div key={j} className="cl-action-card">
                    <div className="cl-action-card-title">
                      {a.type === 'updateShot' && `✏️ 修改鏡頭`}
                      {a.type === 'addShot' && `➕ 新增鏡頭`}
                      {a.type === 'setBrief' && `📝 更新 Brief`}
                    </div>
                    <div className="cl-action-card-body">
                      {a.type === 'updateShot' && Object.entries(a).filter(([k])=>k!=='type'&&k!=='id').map(([k,v])=>(
                        <div key={k} style={{fontSize:11}}>{k}: {String(v)}</div>
                      ))}
                      {a.type === 'addShot' && <div style={{fontSize:11}}>{a.patch?.scene} — {a.patch?.desc}</div>}
                      {a.type === 'setBrief' && <div style={{fontSize:11}}>{a.brief}</div>}
                    </div>
                    <button className="cl-apply-btn" onClick={() => onApplyAction(a)}>套用</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="cl-msg assistant">
            <div className="cl-bubble"><span className="spinner" /></div>
          </div>
        )}
      </div>

      <div className="claude-panel-inp">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="輸入訊息… (Enter 送出)"
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>送出</button>
      </div>
    </div>
  )
}
