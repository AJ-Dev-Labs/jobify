import { ipcMain, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import pdfParse from 'pdf-parse'
import OpenAI from 'openai'
import { store } from '../store.js'
import type { ExtractedProfile, SkillEntry, Experience } from '../../shared/types.js'

const EXTRACTION_SYSTEM_PROMPT = `You are a resume parser. Extract structured information from the resume text provided.

Return ONLY a valid JSON object with exactly these fields:
{
  "skills": [
    { "name": "React", "category": "technical", "enabled": true }
  ],
  "experiences": [
    {
      "dateRange": "2022 — Present",
      "title": "Senior Software Engineer",
      "company": "Acme Corp",
      "description": "One concise sentence describing the key achievement or responsibility."
    }
  ],
  "keywords": ["React", "Node.js", "AWS"],
  "totalYearsExperience": 8
}

Rules:
- skills.category: "technical" for languages, frameworks, tools, platforms, databases. "domain" for business skills, methodologies, leadership, soft skills.
- experiences: all work roles, most recent first. description max 150 chars.
- keywords: 10-20 terms that best represent this candidate. Mix of technologies and domain expertise.
- totalYearsExperience: integer estimate from date ranges. Use 0 if unclear.
- Do not include any text outside the JSON object.`

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function registerPdfHandlers() {
  ipcMain.handle('pdf:pick', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const stats = fs.statSync(filePath)
    return { path: filePath, name: path.basename(filePath), size: stats.size }
  })

  ipcMain.handle('pdf:parse', async (_event, filePath: string) => {
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(dataBuffer)
    return { text: data.text as string, pages: data.numpages as number }
  })

  ipcMain.handle('openai:extract', async (_event, pdfText: string, fileName: string) => {
    const config = store.get('config')
    if (!config?.openaiApiKey) throw new Error('OpenAI API key not configured')

    const client = new OpenAI({ apiKey: config.openaiApiKey })
    const startMs = Date.now()

    // Truncate to ~12k chars to stay within context limits
    const truncated = pdfText.slice(0, 12000)

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: truncated },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

    const raw = JSON.parse(response.choices[0].message.content ?? '{}') as {
      skills?: Array<{ name: string; category: string; enabled: boolean }>
      experiences?: Array<{ dateRange: string; title: string; company: string; description: string }>
      keywords?: string[]
      totalYearsExperience?: number
    }

    const profile: ExtractedProfile = {
      skills: (raw.skills ?? []).map(s => ({
        name: s.name,
        category: s.category === 'domain' ? 'domain' : 'technical',
        enabled: true,
      })) as SkillEntry[],
      experiences: (raw.experiences ?? []) as Experience[],
      keywords: raw.keywords ?? [],
      totalYearsExperience: raw.totalYearsExperience ?? 0,
      fileName: stripHtml(fileName),
      extractedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startMs,
    }

    // Save profile and update recent list
    store.set('profile', profile)
    const existing = store.get('recentProfiles', [])
    const updated = [
      { fileName: profile.fileName, extractedAt: profile.extractedAt, size: 0 },
      ...existing.filter(r => r.fileName !== profile.fileName),
    ].slice(0, 5)
    store.set('recentProfiles', updated)

    return profile
  })

  ipcMain.handle('openai:embed', async (_event, text: string) => {
    const config = store.get('config')
    if (!config?.openaiApiKey) throw new Error('OpenAI API key not configured')

    const client = new OpenAI({ apiKey: config.openaiApiKey })
    const truncated = text.slice(0, 8000)

    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: truncated,
    })

    const embedding = {
      vector: response.data[0].embedding,
      text: truncated,
      createdAt: new Date().toISOString(),
    }
    store.set('resumeEmbedding', embedding)
    return response.data[0].embedding as number[]
  })
}
