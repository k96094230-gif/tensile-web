import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Supabase env vars missing — running in demo mode')
}

export const supabase = url && key ? createClient(url, key) : null

// ── Projects ──────────────────────────────────────────────────────────────────
export async function getProjects() {
  if (!supabase) return DEMO_PROJECTS
  const { data, error } = await supabase
    .from('projects').select('*').order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createProject(name) {
  if (!supabase) return { id: crypto.randomUUID(), name, brief: '', created_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('projects').insert({ name, brief: '' }).select().single()
  if (error) throw error
  return data
}

export async function updateProject(id, patch) {
  if (!supabase) return
  const { error } = await supabase.from('projects').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ── Shots ─────────────────────────────────────────────────────────────────────
export async function getShots(projectId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('shots').select('*, shot_variants(*)')
    .eq('project_id', projectId).order('ord')
  if (error) throw error
  return data
}

export async function createShot(projectId, patch = {}) {
  if (!supabase) return { id: crypto.randomUUID(), project_id: projectId, ord: 0, ...patch }
  const { data: existing } = await supabase.from('shots').select('ord').eq('project_id', projectId).order('ord', { ascending: false }).limit(1)
  const nextOrd = existing?.length ? (existing[0].ord + 1) : 0
  const { data, error } = await supabase
    .from('shots').insert({ project_id: projectId, ord: nextOrd, ...patch }).select().single()
  if (error) throw error
  return data
}

export async function updateShot(id, patch) {
  if (!supabase) return
  const { error } = await supabase.from('shots').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteShot(id) {
  if (!supabase) return
  const { error } = await supabase.from('shots').delete().eq('id', id)
  if (error) throw error
}

export async function reorderShots(shots) {
  if (!supabase) return
  const updates = shots.map((s, i) => ({ id: s.id, ord: i }))
  const { error } = await supabase.from('shots').upsert(updates)
  if (error) throw error
}

// ── Variants ──────────────────────────────────────────────────────────────────
export async function createVariant(shotId, variantKey, patch = {}) {
  if (!supabase) return { id: crypto.randomUUID(), shot_id: shotId, variant_key: variantKey, ...patch }
  const { data, error } = await supabase
    .from('shot_variants').insert({ shot_id: shotId, variant_key: variantKey, ...patch }).select().single()
  if (error) throw error
  return data
}

export async function updateVariant(id, patch) {
  if (!supabase) return
  const { error } = await supabase.from('shot_variants').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteVariant(id) {
  if (!supabase) return
  const { error } = await supabase.from('shot_variants').delete().eq('id', id)
  if (error) throw error
}

// ── References ────────────────────────────────────────────────────────────────
export async function getReferences(projectId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('project_refs').select('*').eq('project_id', projectId).order('created_at')
  if (error) throw error
  return data
}

export async function createReference(projectId, patch) {
  if (!supabase) return { id: crypto.randomUUID(), project_id: projectId, ...patch }
  const { data, error } = await supabase
    .from('project_refs').insert({ project_id: projectId, ...patch }).select().single()
  if (error) throw error
  return data
}

// ── Upload to Supabase Storage ─────────────────────────────────────────────────
export async function uploadFile(file, bucket = 'media') {
  if (!supabase) return URL.createObjectURL(file)
  const path = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const { error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_PROJECTS = [
  { id: 'demo', name: '示範專案', brief: '這是示範用的製片台專案。', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
]
