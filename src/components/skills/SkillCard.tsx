import { memo, useState } from 'react'
import { Box, Copy, Folder, Github, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TFunction } from 'i18next'
import type { ManagedSkill, ToolOption } from './types'

type GithubInfo = {
  label: string
  href: string
}

type SkillCardProps = {
  skill: ManagedSkill
  installedTools: ToolOption[]
  loading: boolean
  getGithubInfo: (url: string | null | undefined) => GithubInfo | null
  getSkillSourceLabel: (skill: ManagedSkill) => string
  formatRelative: (ms: number | null | undefined) => string
  onUpdate: (skill: ManagedSkill) => void
  onDelete: (skillId: string) => void
  onToggleTool: (skill: ManagedSkill, toolId: string) => void
  onOpenDetail: (skill: ManagedSkill) => void
  t: TFunction
}

const MAX_VISIBLE_BADGES = 5

const SkillCard = ({
  skill,
  installedTools,
  loading,
  getGithubInfo,
  getSkillSourceLabel,
  formatRelative,
  onUpdate,
  onDelete,
  onToggleTool,
  onOpenDetail,
  t,
}: SkillCardProps) => {
  const typeKey = skill.source_type.toLowerCase()
  const iconNode = typeKey.includes('git') ? (
    <Github size={20} />
  ) : typeKey.includes('local') ? (
    <Folder size={20} />
  ) : (
    <Box size={20} />
  )
  const github = getGithubInfo(skill.source_ref)
  const copyValue = (github?.href ?? skill.source_ref ?? '').trim()

  const handleCopy = async () => {
    if (!copyValue) return
    try {
      await navigator.clipboard.writeText(copyValue)
      toast.success(t('copied'))
    } catch {
      toast.error(t('copyFailed'))
    }
  }

  // Split tools into synced and remaining for badge display
  const syncedTools: { tool: ToolOption; target: (typeof skill.targets)[0] }[] = []
  const unsyncedTools: ToolOption[] = []
  for (const tool of installedTools) {
    const target = skill.targets.find((tgt) => tgt.tool === tool.id)
    if (target) {
      syncedTools.push({ tool, target })
    } else {
      unsyncedTools.push(tool)
    }
  }

  const allTools = [...syncedTools.map(({ tool }) => tool), ...unsyncedTools]
  const totalCount = allTools.length
  const [expanded, setExpanded] = useState(false)
  const needsCollapse = totalCount > MAX_VISIBLE_BADGES

  // Build a flat ordered list: synced first, then unsynced
  type BadgeItem = { tool: ToolOption; synced: boolean; target?: (typeof skill.targets)[0] }
  const allBadges: BadgeItem[] = [
    ...syncedTools.map(({ tool, target }) => ({ tool, synced: true, target })),
    ...unsyncedTools.map((tool) => ({ tool, synced: false })),
  ]
  const visibleBadges = expanded ? allBadges : allBadges.slice(0, MAX_VISIBLE_BADGES)
  const remainingCount = totalCount - MAX_VISIBLE_BADGES

  return (
    <div className="skill-card">
      <div className="skill-icon">{iconNode}</div>
      <div className="skill-main">
        <div className="skill-header-row">
          <button
            type="button"
            className="skill-name clickable"
            onClick={() => onOpenDetail(skill)}
          >
            {skill.name}
          </button>
        </div>
        {skill.description ? (
          <div className="skill-desc">{skill.description}</div>
        ) : null}
        <div className="skill-meta-row">
          {github ? (
            <div className="skill-source">
              <button
                className="repo-pill copyable"
                type="button"
                title={t('copy')}
                aria-label={t('copy')}
                onClick={() => void handleCopy()}
                disabled={!copyValue}
              >
                {github.label}
                <span className="copy-icon" aria-hidden="true">
                  <Copy size={12} />
                </span>
              </button>
            </div>
          ) : (
            <div className="skill-source">
              <button
                className="repo-pill copyable"
                type="button"
                title={t('copy')}
                aria-label={t('copy')}
                onClick={() => void handleCopy()}
                disabled={!copyValue}
              >
                <span className="mono">{getSkillSourceLabel(skill)}</span>
                <span className="copy-icon" aria-hidden="true">
                  <Copy size={12} />
                </span>
              </button>
            </div>
          )}
          <div className="skill-source time">
            <span className="dot">•</span>
            {formatRelative(skill.updated_at)}
          </div>
        </div>
        <div className={`tool-matrix${!expanded && needsCollapse ? ' collapsed' : ''}`}>
          {visibleBadges.map(({ tool, synced, target }) => (
            <button
              key={`${skill.id}-${tool.id}`}
              type="button"
              className={`tool-pill ${synced ? 'active' : 'inactive'}`}
              title={
                synced
                  ? `${tool.label} (${target?.mode ?? t('unknown')})`
                  : `${tool.label} — ${t('clickToSync', { defaultValue: '点击同步' })}`
              }
              onClick={() => void onToggleTool(skill, tool.id)}
            >
              {synced && <span className="status-badge" />}
              {tool.label}
            </button>
          ))}
          {needsCollapse && !expanded ? (
            <button
              type="button"
              className="tool-pill more-badge"
              onClick={() => setExpanded(true)}
            >
              {t('moreTools', { count: remainingCount })}
            </button>
          ) : null}
        </div>
      </div>
      <div className="skill-actions-col">
        <button
          className="card-btn primary-action"
          type="button"
          onClick={() => onUpdate(skill)}
          disabled={loading}
          aria-label={t('update')}
        >
          <RefreshCw size={16} />
        </button>
        <button
          className="card-btn danger-action"
          type="button"
          onClick={() => onDelete(skill.id)}
          disabled={loading}
          aria-label={t('remove')}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

export default memo(SkillCard)
