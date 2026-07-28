# Cecília — Conectando o front-end ao Supabase

Este guia parte do arquivo `CeciliaSistema.jsx` (o protótipo que já vimos no
chat) e mostra como transformá-lo num projeto real, rodando fora do Claude,
conectado ao seu banco Supabase.

## 1. Criar o projeto (uma vez só)

No seu computador, com Node.js instalado:

```bash
npm create vite@latest cecilia-sistema -- --template react
cd cecilia-sistema
npm install
npm install @supabase/supabase-js recharts lucide-react
```

## 2. Copiar os arquivos

- Copie `CeciliaSistema.jsx` para `src/App.jsx`
- Copie a pasta `src/lib` e `src/services` (que te enviei) para dentro do seu `src/`
- Copie `.env.local.example` para a raiz do projeto e renomeie para `.env.local`
  (esse arquivo já vem preenchido com a URL e a chave do seu projeto)

## 3. Trocar os dados fixos pelos dados reais

Hoje, `CeciliaSistema.jsx` usa `useState(seedProducts)` etc. — dados fixos que
somem ao recarregar a página. A ideia é trocar isso por `useEffect` + as
funções dos services que te enviei. Exemplo para Produtos:

```jsx
import { useEffect, useState } from "react";
import { listProducts, createProduct } from "./services/produtos";

const [products, setProducts] = useState([]);

useEffect(() => {
  listProducts().then(setProducts).catch(console.error);
}, []);

// ao salvar o formulário de novo produto:
async function handleSave(form) {
  const novo = await createProduct(form);
  setProducts((prev) => [novo, ...prev]);
}
```

O mesmo padrão vale para Clientes, Fornecedores, Compras, Pedidos e Fluxo de
Caixa — troque o `useState(seedX)` por um `useEffect` que busca do Supabase, e
troque as funções `save`/`remove` locais pelas chamadas dos services.

Já deixei prontos os services de **Produtos** (`src/services/produtos.js`) e
**Pedidos** (`src/services/pedidos.js`) como exemplo completo — incluindo
upload de foto e criação de pedido com itens. Os de Clientes, Fornecedores,
Compras e Caixa seguem exatamente o mesmo padrão (posso gerar os que
faltarem, é só pedir).

## 4. Login real

Troque o formulário decorativo de `LoginScreen` por uma chamada real:

```jsx
import { login } from "./services/auth";

async function handleLogin(email, senha) {
  try {
    await login(email, senha);
    setLoggedIn(true);
  } catch (err) {
    alert("E-mail ou senha inválidos");
  }
}
```

## 5. Rodar localmente

```bash
npm run dev
```

Abre em `http://localhost:5173` já conectado ao seu banco de verdade.

## 6. Publicar (colocar no ar)

O jeito mais simples é a [Vercel](https://vercel.com) ou
[Netlify](https://netlify.com):

1. Suba o projeto para um repositório no GitHub
2. Conecte o repositório na Vercel/Netlify
3. Configure as mesmas variáveis de ambiente (`VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`) no painel da Vercel/Netlify
4. Deploy — o sistema fica acessível por uma URL própria, no celular e no
   computador

## Se preferir não mexer em código

Se isso tudo parecer complicado, o **Claude Code** (app de desenvolvimento da
Anthropic) consegue fazer esses passos por você: você cola esses arquivos
numa pasta, abre o Claude Code nela e pede para ele "conectar este projeto ao
Supabase usando os services já criados e publicar na Vercel". Ele executa os
comandos de terminal necessários.
