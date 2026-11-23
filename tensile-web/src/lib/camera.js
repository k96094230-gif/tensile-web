// P0: Camera language definitions + prompt builder

export const SHOT_SIZES = [
  { key: 'ECU',  label: 'ECU',  desc: '特寫' },
  { key: 'CU',   label: 'CU',   desc: '近景' },
  { key: 'MCU',  label: 'MCU',  desc: '中近景' },
  { key: 'MS',   label: 'MS',   desc: '中景' },
  { key: 'MWS',  label: 'MWS',  desc: '中遠景' },
  { key: 'WS',   label: 'WS',   desc: '遠景' },
  { key: 'EWS',  label: 'EWS',  desc: '大遠景' },
]

export const CAMERA_HEIGHTS = [
  { key: 'worm',  label: '蟲眼' },
  { key: 'low',   label: '低角' },
  { key: 'eye',   label: '平視' },
  { key: 'high',  label: '高角' },
  { key: 'bird',  label: '鳥瞰' },
]

export const FOCAL_LENGTHS = [
  { key: '14mm',  label: '14mm' },
  { key: '24mm',  label: '24mm' },
  { key: '35mm',  label: '35mm' },
  { key: '50mm',  label: '50mm' },
  { key: '85mm',  label: '85mm' },
  { key: '135mm', label: '135mm' },
  { key: '200mm', label: '200mm' },
]

export const CAMERA_MOVES = [
  { key: 'static',    label: '固定' },
  { key: 'pan',       label: 'Pan' },
  { key: 'tilt',      label: 'Tilt' },
  { key: 'dolly_in',  label: '推軌入' },
  { key: 'dolly_out', label: '推軌出' },
  { key: 'truck',     label: '橫移' },
  { key: 'handheld',  label: '手持' },
  { key: 'crane',     label: '升降' },
  { key: 'drone',     label: '無人機' },
  { key: 'tracking',  label: '跟拍' },
]

// Build AI prompt from camera fields + scene desc
export function buildCameraPrompt(shot) {
  const src = shot.active_variant
    ? (shot.shot_variants?.find(v => v.variant_key === shot.active_variant) || shot)
    : shot

  const parts = []

  if (src.shot_size)     parts.push(SHOT_SIZES.find(s => s.key === src.shot_size)?.desc || src.shot_size)
  if (src.camera_height) parts.push(CAMERA_HEIGHTS.find(h => h.key === src.camera_height)?.label || src.camera_height)
  if (src.focal_length)  parts.push(src.focal_length)
  if (src.camera_move && src.camera_move !== 'static') {
    parts.push(CAMERA_MOVES.find(m => m.key === src.camera_move)?.label || src.camera_move)
  }
  if (src.desc) parts.push(src.desc)
  if (src.subject_move) parts.push(`人物：${src.subject_move}`)

  return parts.join('，')
}

// Short tag display for card
export function getCameraTags(shot) {
  const src = shot.active_variant
    ? (shot.shot_variants?.find(v => v.variant_key === shot.active_variant) || shot)
    : shot
  const tags = []
  if (src.shot_size)     tags.push(src.shot_size)
  if (src.camera_height && src.camera_height !== 'eye') tags.push(CAMERA_HEIGHTS.find(h => h.key === src.camera_height)?.label || '')
  if (src.focal_length)  tags.push(src.focal_length)
  if (src.camera_move && src.camera_move !== 'static') tags.push(CAMERA_MOVES.find(m => m.key === src.camera_move)?.label || '')
  return tags.filter(Boolean)
}
