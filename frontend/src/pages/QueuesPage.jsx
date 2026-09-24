import { ClipboardCheck, Mail, MessageSquareReply, RefreshCcw } from 'lucide-react'
import { getEmailDrafts, getFollowupDrafts, getReplyDrafts, getTeamDecisions } from '@/services/api'
import { RecordsPage } from './LeadsPage'

export function EmailDraftsPage() {
  return (
    <RecordsPage
      badge="Draft Queue"
      columns={[
        ['subject', 'Subject'],
        ['draftType', 'Type'],
        ['status', 'Status'],
        ['leadName', 'Lead'],
        ['updatedAt', 'Updated'],
      ]}
      icon={Mail}
      loader={getEmailDrafts}
      title="Email Drafts"
    />
  )
}

export function RepliesPage() {
  return (
    <RecordsPage
      badge="Reply Queue"
      columns={[
        ['subject', 'Subject'],
        ['status', 'Status'],
        ['leadName', 'Lead'],
        ['updatedAt', 'Updated'],
      ]}
      icon={MessageSquareReply}
      loader={getReplyDrafts}
      title="Replies"
    />
  )
}

export function FollowUpsPage() {
  return (
    <RecordsPage
      badge="Follow-up Queue"
      columns={[
        ['subject', 'Subject'],
        ['status', 'Status'],
        ['followupNumber', 'Number'],
        ['leadName', 'Lead'],
        ['updatedAt', 'Updated'],
      ]}
      icon={RefreshCcw}
      loader={getFollowupDrafts}
      title="Follow-ups"
    />
  )
}

export function TeamDecisionsPage() {
  return (
    <RecordsPage
      badge="Decision Queue"
      columns={[
        ['decisionType', 'Decision'],
        ['status', 'Status'],
        ['reason', 'Reason'],
        ['leadName', 'Lead'],
        ['createdAt', 'Created'],
      ]}
      icon={ClipboardCheck}
      loader={getTeamDecisions}
      title="Team Decisions"
    />
  )
}
