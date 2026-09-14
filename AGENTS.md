# DeliveryApp — Mapa do Projeto para IA

> Leia este arquivo antes de qualquer exploração. Ele elimina a necessidade de descobrir a estrutura via ferramentas.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Banco de dados | SQLite via `better-sqlite3` — arquivo em `data/delivery.db` |
| Persistencia cliente | `localStorage` (apenas `deviceId`, `CustomerProfile`, `Address[]`) |
| Estilizacao | Tailwind CSS v4 (classes inline) |
| Servidor de dev | `npm run dev` — porta padrao 3001 (3000 ocupada) |

---

## Arquivos-chave

### Tipos e Contratos
| Arquivo | O que contem |
|---|---|
| `app/types.ts` | **Todas** as interfaces TypeScript: `Product`, `Category`, `CartItem`, `Address`, `Order`, `OrderStatus`, `CustomerProfile` |

### Banco de Dados (servidor)
| Arquivo | O que contem |
|---|---|
| `app/lib/db.ts` | Schema SQLite, singleton `getDb()`, migrations automaticas via `ALTER TABLE`, `resetDatabase()` |

> **Ao adicionar uma coluna nova:** editar `CREATE TABLE` + adicionar `try { db.exec("ALTER TABLE ... ADD COLUMN ...") } catch {}` logo abaixo.

### API Routes (Next.js Route Handlers)
| Rota | Metodos | Responsabilidade |
|---|---|---|
| `app/api/orders/route.ts` | `GET`, `POST` | Listar pedidos (todos ou por `?deviceId=`) / criar pedido |
| `app/api/orders/[id]/route.ts` | `PATCH`, `DELETE` | Atualizar status do pedido / excluir pedido |
| `app/api/products/route.ts` | `GET`, `POST` | Listar produtos / criar produto |
| `app/api/products/[id]/route.ts` | `PUT`, `DELETE` | Editar produto / excluir produto |
| `app/api/categories/route.ts` | `GET`, `PUT` | Listar / atualizar categorias (fixas: `pratos` e `bebidas`) |
| `app/api/reset/route.ts` | `POST` | Limpa o banco de dados (chama `resetDatabase()`) |

### Cliente — Funcoes de Fetch
| Arquivo | Exporta |
|---|---|
| `app/lib/api.ts` | `fetchProducts`, `createProduct`, `updateProduct`, `deleteProduct`, `fetchCategories`, `updateCategories`, `fetchOrders`, `fetchMyOrders`, `createOrder`, `updateOrderStatusApi`, `deleteOrderApi`, `resetDatabaseApi` |

### Cliente — LocalStorage
| Arquivo | Exporta |
|---|---|
| `app/lib/storage.ts` | `getCustomerProfile`, `saveCustomerProfile`, `getSavedAddresses` (com dedup por ID), `saveSavedAddresses`, `getCurrentAddress`, `saveCurrentAddress`, `getDeviceId`, `getAdminAuth`, `setAdminAuth`, `clearAdminAuth` |

### Componentes do Cliente (`app/components/`)
| Componente | Responsabilidade |
|---|---|
| `Navbar.tsx` | Barra de topo — busca, endereco ativo, botao sacola |
| `ProductCard.tsx` | Card de produto na vitrine |
| `CategoryList.tsx` | Filtro de categorias (Pratos / Bebidas) |
| `CartDrawer.tsx` | Sacola lateral — lista itens, observacoes, pagamento, checkout |
| `AddressModal.tsx` | Modal de selecao e cadastro de enderecos (IDs via `crypto.randomUUID()`) |
| `MyOrdersModal.tsx` | Historico de pedidos do cliente (filtra por `deviceId`) |
| `Footer.tsx` | Rodape da vitrine |

### Paginas
| Arquivo | Responsabilidade |
|---|---|
| `app/page.tsx` | Vitrine publica — lista produtos/categorias, controla sacola e modais |
| `app/admin/page.tsx` | Painel admin completo (~1500 linhas): login, gestao de pedidos (cards + comanda), produtos, categorias, reset |
| `app/layout.tsx` | Layout raiz com viewport meta tags |

---

## Padroes e Convencoes

### Adicionar campo novo em `Order`
1. `app/types.ts` — adicionar campo na interface `Order`
2. `app/lib/db.ts` — adicionar coluna no `CREATE TABLE` + `ALTER TABLE` automatico
3. `app/api/orders/route.ts` — mapear em `rowToOrder()` + adicionar no `INSERT`
4. `app/components/CartDrawer.tsx` — UI para o usuario preencher
5. `app/admin/page.tsx` — exibir nos cards de pedido e na comanda

### IDs
| Entidade | Formato |
|---|---|
| Pedido | `PED-XXXXXX` (6 digitos aleatorios) |
| Endereco | `addr-${crypto.randomUUID()}` |
| Produto | gerado na API com `nanoid` ou `Date.now()` |
| Device | `dev_${Date.now()}_${random}` (gerado em `storage.ts`) |

### LocalStorage — Chaves
```
manga_delivery_customer_profile   -> CustomerProfile
manga_delivery_addresses          -> Address[]
manga_delivery_current_address    -> Address (ativo)
manga_delivery_device_id          -> string (identificador do navegador)
manga_delivery_admin_session      -> sessionStorage ("authenticated")
```

### Eventos customizados (window)
```
delivery_orders_updated           -> dispara ao criar pedido
delivery_profile_updated          -> dispara ao salvar perfil
delivery_addresses_updated        -> dispara ao salvar enderecos
delivery_current_address_updated  -> dispara ao trocar endereco ativo
```

### Admin — Localizacao de Secoes em `app/admin/page.tsx`
| Secao | Linha aproximada |
|---|---|
| Loop dos cards de pedido (`filteredOrders.map`) | ~738 |
| Itens dentro do card de pedido | ~808 |
| Comanda / ticket de impressao | ~1210 |
| Modal de produto (create/edit) | ~1310 |
| Credenciais: `admin` / `manga2024` | hardcoded no componente |

### Responsividade
- Viewport configurado em `app/layout.tsx`
- Navbar adaptada para mobile com pill flutuante de endereco
- Vitrine usa grid responsivo `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Admin usa `flex-col sm:flex-row` nas barras de filtro

---

## O que NAO existe / foi removido
- `app/mockData.ts` — **removido** (nao usar, nao recriar)
- Componentes `PromoBanner.tsx` e `RestaurantCard.tsx` — **removidos**
- Dados mockados em runtime — **nao existem**; tudo vem da API/SQLite
