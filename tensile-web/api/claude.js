// Vercel serverless function: /api/claude
// 提供給 window.claude shim 使用，讓前端 AI 功能運作

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { messages, system } = await req.json()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: system || '你是一個幫助廣告導演的 AI 助理，只回傳 JSON 物件，不要加任何說明文字。',
      messages,
    })
  })

  if (!res.ok) {
    const err = await res.text()
    return new Response(err, { status: res.status })
  }

  const data = await res.json()
  const text = (data.content?.[0]?.text || '').trim()

  // 嘗試解析 JSON：先試整段，再找 {...} 區塊
  let parsed = null
  try { parsed = JSON.parse(text) } catch {}
  if (!parsed) {
    try {
      const m = text.match(/\{[\s\S]*\}/)
      if (m) parsed = JSON.parse(m[0])
    } catch {}
  }
  if (!parsed) parsed = { reply: text }

  return new Response(JSON.stringify(parsed), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
