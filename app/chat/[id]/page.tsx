import { Chat } from "@/components/chat"

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { id } = params

  return (
    <>
      <Chat key={id} id={id} initialMessages={[]} isReadonly={false} />
    </>
  )
}
