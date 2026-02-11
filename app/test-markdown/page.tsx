import { Markdown } from "@/components/markdown"

export default function TestMarkdownPage() {
  const testMarkdown = `# Test Markdown

Here are some ponies:

1. **[Miniature Pony - Butterscotch - $1500](https://product-feed-f2f9b7df68ba.herokuapp.com/products/pony-001)**
   ![Miniature Pony - Butterscotch](https://product-feed-f2f9b7df68ba.herokuapp.com/images/pony-001.jpg)
   - Adorable miniature pony

2. **[Shetland Pony - Thunder - $2800](https://product-feed-f2f9b7df68ba.herokuapp.com/products/pony-002)**
   ![Shetland Pony - Thunder](https://product-feed-f2f9b7df68ba.herokuapp.com/images/pony-002.jpg)
   - Hardy Shetland pony

Regular link test: [Click here](https://example.com)

Image test: ![Test Image](https://product-feed-f2f9b7df68ba.herokuapp.com/images/pony-001.jpg)
`

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Markdown Test Page</h1>
      <div className="border p-4 rounded bg-white dark:bg-gray-900">
        <Markdown>{testMarkdown}</Markdown>
      </div>
    </div>
  )
}
