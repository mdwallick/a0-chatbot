import { Chat } from "@/components/chat"
import { generateUUID } from "@/lib/utils"
import { getEnabledProviders } from "@/lib/config/enabled-connections"

export default async function Page() {
  const id = generateUUID()
  const enabledProviders = getEnabledProviders()

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        isReadonly={false}
        enabledProviders={enabledProviders}
      />
    </>
  )
}
