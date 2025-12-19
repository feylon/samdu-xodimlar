export default defineNuxtPlugin(async () => {
  const organization = useOrganizationStore()
  const auth = useAuthStore()
  const notifications = useNotificationsStore()

  const jobs: Promise<unknown>[] = [organization.loadPublic().catch(() => undefined)]

  if (auth.accessToken) {
    jobs.push(
      auth
        .fetchMe()
        .then(async () => {
          if (auth.accessToken) notifications.connect(auth.accessToken)
          await notifications.fetchUnread().catch(() => undefined)
        })
        .catch(() => undefined),
    )
  }

  await Promise.all(jobs)
})
