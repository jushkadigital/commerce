export function extractText(node: any) {
  if (node.text) return node.text
  if (node.children) {
    return node.children.map(extractText).join('')
  }
  return ''
}
