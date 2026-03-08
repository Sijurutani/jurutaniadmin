# MCP Server untuk Jurutani Admin Dashboard

## Apa itu MCP Server?

MCP (Model Context Protocol) Server adalah server yang menyediakan context tambahan untuk GitHub Copilot. Server ini membantu Copilot memahami project Anda dengan lebih baik, termasuk:

- **Project Context**: Struktur dan konvensi project
- **Nuxt UI 4 Components**: Referensi komponen dan contoh penggunaan
- **Supabase Patterns**: Best practices untuk database dan authentication
- **Zod Schemas**: Pattern validasi yang konsisten

## Instalasi

### 1. Install Dependencies MCP Server

```bash
cd mcp-server
pnpm install
```

### 2. Test MCP Server

```bash
cd mcp-server
pnpm start
```

MCP Server akan berjalan di mode stdio dan siap menerima permintaan dari Copilot.

## Konfigurasi VS Code

File `.vscode/settings.json` sudah dikonfigurasi untuk menggunakan MCP Server ini. Konfigurasi tersebut meliputi:

```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "file": "copilot-instructions.md"
    }
  ],
  "github.copilot.chat.mcp.enabled": true,
  "github.copilot.chat.mcp.servers": {
    "jurutani-context": {
      "command": "node",
      "args": ["mcp-server/index.js"],
      "env": {
        "NODE_ENV": "development",
        "PROJECT_TYPE": "nuxt4-supabase"
      }
    }
  }
}
```

## Fitur MCP Server

### 1. Resources (Context)

MCP Server menyediakan 4 resource context:

- **Project Context** (`context://project`)
  - Informasi umum tentang project
  - Tech stack dan struktur folder
  - Konvensi coding

- **Nuxt UI Components** (`context://nuxt-ui-components`)
  - Daftar komponen Nuxt UI 4
  - Contoh penggunaan setiap komponen
  - Props dan events yang tersedia

- **Supabase Patterns** (`context://supabase-patterns`)
  - Pattern untuk database operations (CRUD)
  - Authentication patterns
  - Real-time subscriptions
  - Storage operations

- **Zod Schemas** (`context://zod-schemas`)
  - Pattern validasi dengan Zod
  - Integrasi dengan Nuxt UI forms
  - Server-side validation

### 2. Tools (Code Generation)

MCP Server menyediakan 3 tools untuk code generation:

#### a. Generate Component
Membuat Vue component dengan Nuxt UI 4:

```
Tool: generate-component
Parameters:
  - componentName: UserCard, ProductList, etc.
  - componentType: page | layout | component
```

#### b. Generate API Route
Membuat Nuxt API route dengan Zod validation:

```
Tool: generate-api-route
Parameters:
  - routeName: users, products, etc.
  - methods: ['GET', 'POST', 'PUT', 'DELETE']
```

#### c. Generate Supabase Query
Membuat Supabase query dengan TypeScript types:

```
Tool: generate-supabase-query
Parameters:
  - tableName: customers, orders, etc.
  - operation: select | insert | update | delete
```

### 3. Prompts (Templates)

MCP Server menyediakan 2 prompt templates:

#### a. Create CRUD Page
Template untuk membuat halaman CRUD lengkap:

```
Prompt: create-crud-page
Arguments:
  - resourceName: customers, products, etc.

Menghasilkan:
  - List view dengan UTable dan pagination
  - Add modal dengan UForm dan Zod validation
  - Edit functionality
  - Delete confirmation
  - Supabase integration
  - TypeScript types
  - Error handling
```

#### b. Create Form with Validation
Template untuk membuat form dengan validasi:

```
Prompt: create-form-with-validation
Arguments:
  - formName: login, register, etc.

Menghasilkan:
  - Zod schema validation
  - UForm dan UFormGroup components
  - Error messages
  - Submit handling dengan loading state
  - TypeScript types
```

## Cara Menggunakan

### Dengan GitHub Copilot Chat

1. **Tanya tentang context:**
   ```
   @workspace Bagaimana cara menggunakan UTable dengan pagination?
   ```
   
   Copilot akan menggunakan context dari MCP Server untuk memberikan jawaban yang sesuai dengan project Anda.

2. **Generate code dengan tools:**
   ```
   @workspace Generate API route untuk customers dengan GET dan POST methods
   ```
   
   Copilot akan menggunakan tool `generate-api-route` untuk membuat kode.

3. **Gunakan prompts:**
   ```
   @workspace Create CRUD page untuk products
   ```
   
   Copilot akan menggunakan template `create-crud-page` untuk membuat halaman lengkap.

### Development Tips

1. **Restart VS Code** setelah mengubah konfigurasi MCP Server
2. **Check MCP Server logs** di VS Code Output panel (pilih "GitHub Copilot Chat")
3. **Update context** di `mcp-server/context.js` sesuai kebutuhan project
4. **Tambahkan tools baru** di `mcp-server/index.js` untuk code generation custom

## Troubleshooting

### MCP Server tidak terdeteksi

1. Pastikan `github.copilot.chat.mcp.enabled` adalah `true` di settings
2. Restart VS Code
3. Check apakah dependencies MCP Server sudah terinstall

### Error saat menjalankan MCP Server

1. Pastikan Node.js version minimal 18.x
2. Install dependencies: `cd mcp-server && pnpm install`
3. Test manual: `cd mcp-server && node index.js`

### Copilot tidak menggunakan context dari MCP

1. Pastikan file `copilot-instructions.md` ada di root project
2. Restart Copilot: Command Palette > "Reload Window"
3. Coba mention `@workspace` di chat untuk memaksa menggunakan workspace context

## Update MCP Server

Untuk menambahkan context atau tools baru:

1. **Edit context** di `mcp-server/context.js`
2. **Tambah tools** di `mcp-server/index.js`
3. **Restart VS Code** atau reload window

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Nuxt UI 4 Docs](https://ui.nuxt.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Zod Documentation](https://zod.dev/)

## Next Steps

1. ✅ MCP Server sudah dikonfigurasi
2. ✅ Copilot instructions sudah dibuat
3. 📝 Install dependencies MCP Server: `cd mcp-server && pnpm install`
4. 📝 Restart VS Code untuk load konfigurasi
5. 📝 Test dengan Copilot Chat: `@workspace Show me how to create a form`

---

**Happy Coding! 🚀**
