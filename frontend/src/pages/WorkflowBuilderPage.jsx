import { Workflow } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function WorkflowBuilderPage() {
  return (
    <>
      <header className="border-b border-slate-200 pb-6">
        <Badge variant="outline" className="mb-3 bg-white">
          Visual draft mode
        </Badge>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-normal text-slate-950">
          <Workflow className="h-7 w-7 text-slate-500" aria-hidden="true" />
          Workflow Builder
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          GoHighLevel-style visual automation builder.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-950">Builder Workspace</CardTitle>
          <CardDescription>
            This page will contain the drag-and-drop workflow builder in the next phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800">
            Visual draft mode. This page does not send emails automatically.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
