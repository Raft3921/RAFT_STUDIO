const WORKSPACE_STORAGE_KEY = 'youtube-planner-workspace'

const createWorkspaceId = () => `ws-${crypto.randomUUID().slice(0, 8)}`

export const getOrCreateWorkspaceId = () => {
  const url = new URL(window.location.href)
  const queryId = url.searchParams.get('ws')

  let workspaceId = queryId || localStorage.getItem(WORKSPACE_STORAGE_KEY)
  if (!workspaceId) {
    workspaceId = createWorkspaceId()
  }

  localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId)

  if (queryId !== workspaceId) {
    url.searchParams.set('ws', workspaceId)
    window.history.replaceState({}, '', url.toString())
  }

  return workspaceId
}

export const buildWorkspaceInviteUrl = (workspaceId: string) => {
  const url = new URL(window.location.href)
  url.searchParams.set('ws', workspaceId)
  url.hash = '#/home'
  return url.toString()
}
