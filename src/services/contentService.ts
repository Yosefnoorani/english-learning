import type { ContentItem } from '@/types/game'

const USER_CONTENT_KEY = 'english-user-content'

interface ContentFile {
  version: number
  updatedAt: string
  items: ContentItem[]
}

let baseContent: ContentItem[] = []
let userContent: ContentItem[] = []
let loaded = false

function loadUserContentFromStorage(): ContentItem[] {
  try {
    const raw = localStorage.getItem(USER_CONTENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ContentItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveUserContentToStorage(items: ContentItem[]): void {
  localStorage.setItem(USER_CONTENT_KEY, JSON.stringify(items))
}

/** Fetch base content.json and merge with user additions */
export async function loadContent(): Promise<void> {
  if (loaded) return
  const res = await fetch('/content.json')
  if (!res.ok) throw new Error(`Failed to load content.json: ${res.status}`)
  const data = (await res.json()) as ContentFile
  baseContent = data.items ?? []
  userContent = loadUserContentFromStorage()
  loaded = true
}

export function isContentLoaded(): boolean {
  return loaded
}

export function getBaseContent(): ContentItem[] {
  return baseContent
}

export function getUserContent(): ContentItem[] {
  return userContent
}

/** Merged pool: base JSON + localStorage additions (user wins on id collision) */
export function getAllContent(): ContentItem[] {
  const byId = new Map<string, ContentItem>()
  for (const item of baseContent) byId.set(item.id, item)
  for (const item of userContent) byId.set(item.id, item)
  return [...byId.values()]
}

export function getPlacementContent(): ContentItem[] {
  return getAllContent().filter((i) => i.type === 'placement_test')
}

export function getContentById(id: string): ContentItem | undefined {
  return getAllContent().find((i) => i.id === id)
}

export function getContentByIds(ids: string[]): ContentItem[] {
  const map = new Map(getAllContent().map((i) => [i.id, i]))
  return ids.map((id) => map.get(id)).filter((i): i is ContentItem => i !== undefined)
}

/** Append Gemini-generated items to localStorage */
export function addUserContent(items: ContentItem[]): void {
  const existingIds = new Set(getAllContent().map((i) => i.id))
  const fresh = items.filter((i) => !existingIds.has(i.id))
  userContent = [...userContent, ...fresh]
  saveUserContentToStorage(userContent)
}

/** Download merged content.json blob */
export function exportContentJson(): Blob {
  const payload: ContentFile = {
    version: 1,
    updatedAt: new Date().toISOString().slice(0, 10),
    items: getAllContent(),
  }
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}

export function downloadContentJson(): void {
  const blob = exportContentJson()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'content.json'
  a.click()
  URL.revokeObjectURL(url)
}
