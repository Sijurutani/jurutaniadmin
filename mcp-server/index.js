#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { getProjectContext, getNuxtUIComponents, getSupabasePatterns, getZodSchemas } from './context.js'

/**
 * Jurutani MCP Server
 * Menyediakan context untuk Nuxt 4, Nuxt UI 4, Supabase, dan Zod
 */

const server = new Server(
  {
    name: 'jurutani-context',
    version: '1.0.0'
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {}
    }
  }
)

// Resource: Project Context
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'context://project',
        name: 'Project Context',
        description: 'Informasi umum tentang project Jurutani Admin',
        mimeType: 'text/markdown'
      },
      {
        uri: 'context://nuxt-ui-components',
        name: 'Nuxt UI 4 Components',
        description: 'Daftar dan contoh penggunaan komponen Nuxt UI 4',
        mimeType: 'text/markdown'
      },
      {
        uri: 'context://supabase-patterns',
        name: 'Supabase Patterns',
        description: 'Pattern dan best practices untuk Supabase',
        mimeType: 'text/markdown'
      },
      {
        uri: 'context://zod-schemas',
        name: 'Zod Schema Patterns',
        description: 'Contoh dan pattern untuk Zod validation',
        mimeType: 'text/markdown'
      }
    ]
  }
})

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri

  switch (uri) {
    case 'context://project':
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: getProjectContext()
          }
        ]
      }
    
    case 'context://nuxt-ui-components':
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: getNuxtUIComponents()
          }
        ]
      }
    
    case 'context://supabase-patterns':
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: getSupabasePatterns()
          }
        ]
      }
    
    case 'context://zod-schemas':
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: getZodSchemas()
          }
        ]
      }
    
    default:
      throw new Error(`Unknown resource: ${uri}`)
  }
})

// Tools: Code Generation
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate-component',
        description: 'Generate Vue component menggunakan Nuxt UI 4',
        inputSchema: {
          type: 'object',
          properties: {
            componentName: {
              type: 'string',
              description: 'Nama komponen (e.g., UserCard, ProductList)'
            },
            componentType: {
              type: 'string',
              enum: ['page', 'layout', 'component'],
              description: 'Tipe komponen'
            }
          },
          required: ['componentName', 'componentType']
        }
      },
      {
        name: 'generate-api-route',
        description: 'Generate Nuxt API route dengan Zod validation',
        inputSchema: {
          type: 'object',
          properties: {
            routeName: {
              type: 'string',
              description: 'Nama route (e.g., users, products)'
            },
            methods: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'DELETE']
              },
              description: 'HTTP methods yang didukung'
            }
          },
          required: ['routeName', 'methods']
        }
      },
      {
        name: 'generate-supabase-query',
        description: 'Generate Supabase query dengan TypeScript types',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: {
              type: 'string',
              description: 'Nama tabel di Supabase'
            },
            operation: {
              type: 'string',
              enum: ['select', 'insert', 'update', 'delete'],
              description: 'Operasi database'
            }
          },
          required: ['tableName', 'operation']
        }
      }
    ]
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'generate-component': {
        const template = generateComponentTemplate(args.componentName, args.componentType)
        return {
          content: [
            {
              type: 'text',
              text: template
            }
          ]
        }
      }

      case 'generate-api-route': {
        const template = generateAPIRouteTemplate(args.routeName, args.methods)
        return {
          content: [
            {
              type: 'text',
              text: template
            }
          ]
        }
      }

      case 'generate-supabase-query': {
        const template = generateSupabaseQueryTemplate(args.tableName, args.operation)
        return {
          content: [
            {
              type: 'text',
              text: template
            }
          ]
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    }
  }
})

// Template Generators
function generateComponentTemplate(name, type) {
  return `<script setup lang="ts">
// TODO: Add your logic here
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-xl font-semibold">${name}</h2>
    </template>
    
    <div>
      <!-- Component content -->
    </div>
  </UCard>
</template>
`
}

function generateAPIRouteTemplate(name, methods) {
  return `import { z } from 'zod'

const ${name}Schema = z.object({
  // TODO: Define schema
})

export default defineEventHandler(async (event) => {
  const method = event.method

  switch (method) {
${methods.map(m => `    case '${m}':
      // TODO: Implement ${m} logic
      break`).join('\n\n')}
    
    default:
      throw createError({
        statusCode: 405,
        statusMessage: 'Method Not Allowed'
      })
  }
})
`
}

function generateSupabaseQueryTemplate(tableName, operation) {
  const templates = {
    select: `const supabase = useSupabaseClient()

const { data, error } = await supabase
  .from('${tableName}')
  .select('*')

if (error) {
  throw error
}`,
    insert: `const supabase = useSupabaseClient()

const { data, error } = await supabase
  .from('${tableName}')
  .insert({
    // TODO: Add fields
  })

if (error) {
  throw error
}`,
    update: `const supabase = useSupabaseClient()

const { data, error } = await supabase
  .from('${tableName}')
  .update({
    // TODO: Add fields
  })
  .eq('id', id)

if (error) {
  throw error
}`,
    delete: `const supabase = useSupabaseClient()

const { data, error } = await supabase
  .from('${tableName}')
  .delete()
  .eq('id', id)

if (error) {
  throw error
}`
  }

  return templates[operation] || '// Unknown operation'
}

// Prompts: Common scenarios
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'create-crud-page',
        description: 'Buat halaman CRUD lengkap dengan Nuxt UI dan Supabase',
        arguments: [
          {
            name: 'resourceName',
            description: 'Nama resource (e.g., customers, products)',
            required: true
          }
        ]
      },
      {
        name: 'create-form-with-validation',
        description: 'Buat form dengan Zod validation dan Nuxt UI',
        arguments: [
          {
            name: 'formName',
            description: 'Nama form (e.g., login, register)',
            required: true
          }
        ]
      }
    ]
  }
})

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'create-crud-page':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Create a complete CRUD page for ${args.resourceName} with:
- List view using UTable with pagination
- Add modal using UModal and UForm with Zod validation
- Edit functionality
- Delete confirmation
- Supabase integration for all operations
- TypeScript types from database.types.ts
- Proper error handling`
            }
          }
        ]
      }

    case 'create-form-with-validation':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Create a ${args.formName} form with:
- Zod schema validation
- UForm and UFormGroup components
- Proper error messages
- Submit handling with loading state
- TypeScript types`
            }
          }
        ]
      }

    default:
      throw new Error(`Unknown prompt: ${name}`)
  }
})

// Start server
const transport = new StdioServerTransport()
await server.connect(transport)

console.error('Jurutani MCP Server running on stdio')
