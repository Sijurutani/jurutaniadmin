/**
 * Test script untuk MCP Server
 * Jalankan: node mcp-server/test.js
 */

import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🚀 Testing Jurutani MCP Server...\n')

try {
  const packageJsonPath = join(__dirname, 'package.json')
  const nodeModulesPath = join(__dirname, 'node_modules')
  
  if (!existsSync(packageJsonPath)) {
    console.error('❌ package.json not found')
    process.exit(1)
  }
  
  if (!existsSync(nodeModulesPath)) {
    console.error('❌ node_modules not found. Run: cd mcp-server && pnpm install')
    process.exit(1)
  }
  
  console.log('✅ package.json found')
  console.log('✅ node_modules found')
  
  // Check MCP SDK
  const mcpSdkPath = join(nodeModulesPath, '@modelcontextprotocol', 'sdk')
  if (existsSync(mcpSdkPath)) {
    console.log('✅ @modelcontextprotocol/sdk installed')
  } else {
    console.error('❌ @modelcontextprotocol/sdk not found')
    process.exit(1)
  }
  
  // Check if index.js exists
  const indexPath = join(__dirname, 'index.js')
  if (existsSync(indexPath)) {
    console.log('✅ index.js found')
  } else {
    console.error('❌ index.js not found')
    process.exit(1)
  }
  
  // Check if context.js exists
  const contextPath = join(__dirname, 'context.js')
  if (existsSync(contextPath)) {
    console.log('✅ context.js found')
  } else {
    console.error('❌ context.js not found')
    process.exit(1)
  }
  
  console.log('\n✨ MCP Server is ready!')
  console.log('\nNext steps:')
  console.log('1. Restart VS Code')
  console.log('2. Open GitHub Copilot Chat')
  console.log('3. Try: @workspace Show me how to create a form with Zod validation')
  
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
