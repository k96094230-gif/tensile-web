// Vercel serverless function: /api/claude
// Keeps ANTHROPIC_API_KEY on the server side

export const config = { runtime: 'edge' }

export default async function handler(req) {
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
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system,
      messages,
    })
  })

  if (!res.ok) {
    const err = await res.text()
    return new Response(err, { status: res.status })
  }

  const data = await res.json()
  const text = data.content?.[0]?.text || ''

  // Try parse JSON from Claude
  let parsed = { reply: text, actions: [] }
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])
  } catch {}

  return new Response(JSON.stringify(parsed), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}
